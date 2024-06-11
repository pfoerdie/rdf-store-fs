import type { FileHandle } from 'node:fs/promises'
import type { TypeMap, Awaitable, PathString, Byte, Position, ByteSize } from './types'

import { open as openFile } from 'node:fs/promises'
import { isString, isToken, isByte, isFunction, isPosition, isData } from './types'

export type BinaryParser<Type extends any> = (bytes: Buffer) => Awaitable<Type>
export type BinarySerializer<Type extends any> = (value: Type) => Awaitable<Buffer>

type TypeDefinition<Types extends TypeMap<Types> = TypeMap> = { [Key in keyof Types]:
  {
    name: Key
    byte: Byte
    serialize: BinarySerializer<Types[Key]>
    parse: BinaryParser<Types[Key]>
  }
}[keyof Types]

type SerializerMap<Types extends TypeMap<Types> = TypeMap> = { [Key in keyof Types]:
  Record<Key, {
    readonly byte: Byte,
    readonly serialize: BinarySerializer<Types[Key]>
  }>
}[keyof Types]

type ParserMap<Types extends TypeMap<Types> = TypeMap> = { [Key in keyof Types]:
  Record<Byte, {
    readonly name: Key,
    readonly parse: BinaryParser<Types[Key]>
  }>
}[keyof Types]

export interface StorageEngineOptions<Types extends TypeMap<Types> = TypeMap> {
  dataFile: PathString
  binaryTypes: Array<TypeDefinition<Types>>
}

export default class StorageEngine<Types extends TypeMap<Types> = TypeMap> {

  #serializers: SerializerMap<Types> = Object.create(null)
  #parsers: ParserMap<Types> = Object.create(null)
  #fileHandle: Awaitable<FileHandle>

  constructor(options: StorageEngineOptions<Types>) {
    if (!isString(options.dataFile)) throw new Error('invalid dataFile')
    for (let typeDef of options.binaryTypes) {
      if (!isToken(typeDef.name)) throw new Error('invalid binaryType name')
      if (!isByte(typeDef.byte) || typeDef.byte === 0x00) throw new Error('invalid binaryType byte')
      if (!isFunction(typeDef.parse)) throw new Error('invalid binaryType parser')
      if (!isFunction(typeDef.serialize)) throw new Error('invalid binaryType serializer')
      if (this.#serializers[typeDef.name]) throw new Error('duplicate binaryType name')
      if (this.#parsers[typeDef.byte]) throw new Error('duplicate binaryType byte')
      this.#serializers[typeDef.name] = Object.freeze({ byte: typeDef.byte, serialize: typeDef.serialize })
      this.#parsers[typeDef.byte] = Object.freeze({ name: typeDef.name, parse: typeDef.parse })
    }
    Object.freeze(this.#serializers)
    Object.freeze(this.#parsers)
    this.#fileHandle = openFile(options.dataFile, 'w+').then(handle => this.#fileHandle = handle)
  }

  // FIXME multiple writes corrupt the data

  async close() {
    const file = await this.#fileHandle
    await file.close()
  }

  async retrieveOne<Key extends keyof Types>(position: Position): Promise<Types[Key]> {
    if (!isPosition(position)) throw new Error('invalid position')
    const fileHandle = await this.#fileHandle
    const { size: fileSize } = await fileHandle.stat()
    if (position >= fileSize - 5) throw new Error('position out of file')
    const metaBytes = Buffer.alloc(5)
    await fileHandle.read(metaBytes, 0, 5, position)
    const typeByte = metaBytes.readUint8(0)
    const parser = this.#parsers[typeByte]
    if (!parser) throw new Error('parser not found')
    const dataSize = metaBytes.readUint32BE(1)
    const dataBytes = Buffer.alloc(dataSize)
    await fileHandle.read(dataBytes, 0, dataSize, position + 5)
    return parser.parse(dataBytes) as Types[Key]
  }

  async retrieveMany<Key extends keyof Types>(positions: Array<Position>): Promise<Array<Types[Key]>> {
    if (!(Array.isArray(positions) && positions.every(isPosition))) throw new Error('invalid positions')
    if (positions.length === 0) return []
    const fileHandle = await this.#fileHandle
    const { size: fileSize } = await fileHandle.stat()
    return Promise.all(positions.map(async (position) => {
      const metaBytes = Buffer.alloc(5)
      if (position >= fileSize - 5) throw new Error('invalid position')
      await fileHandle.read(metaBytes, 0, 5, position)
      const typeByte = metaBytes.readUint8(0)
      const parser = this.#parsers[typeByte]
      if (!parser) throw new Error('parser not found')
      const dataSize = metaBytes.readUint32BE(1)
      const dataBytes = Buffer.alloc(dataSize)
      await fileHandle.read(dataBytes, 0, dataSize, position + 5)
      return parser.parse(dataBytes) as Types[Key]
    }))
  }

  async insertOne<Key extends keyof Types>(type: Key, data: Types[Key]): Promise<Position> {
    const serializer = this.#serializers[type]
    if (!serializer) throw new Error('serializer not found')
    const insertBytes = await serializer.serialize(data)
    const insertSize = insertBytes.length
    if (insertSize > 0xffffffff) throw new Error('too many bytes')
    const fileHandle = await this.#fileHandle
    const { size: fileSize } = await fileHandle.stat()
    const metaBytes = Buffer.alloc(5)
    let insertPosition: Position = fileSize
    let availableSize: ByteSize = 0xffffffff
    let searchPosition = 0
    while (searchPosition < fileSize) {
      await fileHandle.read(metaBytes, 0, 5, searchPosition)
      const typeByte = metaBytes.readUint8(0)
      const dataSize = metaBytes.readUint32BE(1)
      if (typeByte === 0x00) {
        // if the empty byte section could fit the bytes to save and there is not already a better fit,
        // then remember the empty section for later insertion
        if (dataSize >= insertSize && dataSize < availableSize) {
          // make sure that the empty section is filled completely or that the rest size could also fit another meta section
          if (dataSize === insertSize || dataSize - insertSize >= metaBytes.length) {
            insertPosition = searchPosition
            availableSize = dataSize
          }
        }
      } else if (typeByte === serializer.byte && dataSize === insertSize) {
        const dataBytes = Buffer.alloc(dataSize)
        await fileHandle.read(dataBytes, 0, dataSize, searchPosition)
        // if the data buffer from the file equals the bytes to save,
        // the bytes must not be inserted twice and the position can just be returned
        if (dataBytes.equals(insertBytes)) return searchPosition
      }
      searchPosition += metaBytes.length + dataSize
    }
    metaBytes.writeUint8(serializer.byte, 0)
    metaBytes.writeUint32BE(insertSize, 1)
    const writeBuffers: Array<Buffer> = [metaBytes, insertBytes]
    // if inserted inside the file and the available size is greater than needed,
    // then add another empty meta buffer at the end of the byte data
    if (insertPosition < fileSize && availableSize > insertSize) {
      const emptyMetaBytes = Buffer.alloc(5)
      emptyMetaBytes.writeUint8(0x00, 0)
      emptyMetaBytes.writeUint32BE(availableSize - insertSize - 5, 1)
      writeBuffers.push(emptyMetaBytes)
    }
    await fileHandle.writev(writeBuffers, insertPosition)
    return insertPosition
  }

  async insertMany<Key extends keyof Types>(dataArray: Array<{ type: Key, data: Types[Key] }>): Promise<Array<Position>> {
    if (!(Array.isArray(dataArray) && dataArray.every(({ type, data }) => isToken(type) && isData(data)))) throw new Error('invalid data array')
    if (dataArray.length === 0) return []
    if (dataArray.length === 1) return [await this.insertOne(dataArray[0].type, dataArray[0].data)]
    // TODO improve performance by only iterating once over the file
    const positionArray = new Array(dataArray.length)
    for (let index = 0; index < dataArray.length; index++) {
      const { type, data } = dataArray[index]
      const position = await this.insertOne(type, data)
      positionArray[index] = position
    }
    return positionArray
  }

  async findOne<Key extends keyof Types>(type: Key, filter: (data: Types[Key]) => boolean): Promise<Types[Key] | undefined> {
    if (!isFunction(filter)) throw new Error('invalid filter')
    const serializer = this.#serializers[type]
    if (!serializer) throw new Error('serializer not found')
    const parser = this.#parsers[serializer.byte]
    if (!parser) throw new Error('parser not found')
    const fileHandle = await this.#fileHandle
    const { size: fileSize } = await fileHandle.stat()
    const metaBytes = Buffer.alloc(5)
    let searchPosition = 0
    while (searchPosition < fileSize) {
      await fileHandle.read(metaBytes, 0, 5, searchPosition)
      const typeByte = metaBytes.readUint8(0)
      const dataSize = metaBytes.readUint32BE(1)
      if (typeByte === serializer.byte) {
        const dataBytes = Buffer.alloc(dataSize)
        await fileHandle.read(dataBytes, 0, dataSize, searchPosition + 5)
        const data = await parser.parse(dataBytes)
        if (filter(data)) return data
      }
      searchPosition += metaBytes.length + dataSize
    }
  }

  async findMany<Key extends keyof Types>(type: Key, filter: (data: Types[Key]) => boolean): Promise<Array<Types[Key]>> {
    if (!isFunction(filter)) throw new Error('invalid filter')
    const serializer = this.#serializers[type]
    if (!serializer) throw new Error('serializer not found')
    const parser = this.#parsers[serializer.byte]
    if (!parser) throw new Error('parser not found')
    const fileHandle = await this.#fileHandle
    const { size: fileSize } = await fileHandle.stat()
    const metaBytes = Buffer.alloc(5)
    const dataArray = []
    let searchPosition = 0
    while (searchPosition < fileSize) {
      await fileHandle.read(metaBytes, 0, 5, searchPosition)
      const typeByte = metaBytes.readUint8(0)
      const dataSize = metaBytes.readUint32BE(1)
      if (typeByte === serializer.byte) {
        const dataBytes = Buffer.alloc(dataSize)
        await fileHandle.read(dataBytes, 0, dataSize, searchPosition + 5)
        const data = await parser.parse(dataBytes)
        if (filter(data)) dataArray.push(data)
      }
      searchPosition += metaBytes.length + dataSize
    }
    return dataArray
  }

  // async findMany<Key extends keyof Types>(filterArray: { type: Key, filter: (data: Types[Key]) => boolean }): Promise<Array<Types[Key] | undefined>> {
  //   if (!(Array.isArray(filterArray) && filterArray.every(({ type, filter }) => isToken(type) && isFunction(filter)))) throw new Error('invalid filter array')
  //   if (filterArray.length === 0) return []
  //   if (filterArray.length === 1) return [await this.findOne(filterArray[0].type, filterArray[0].filter)]
  //   const fileHandle = await this.#fileHandle
  //   const { size: fileSize } = await fileHandle.stat()
  //   const metaBytes = Buffer.alloc(5)
  //   const dataArray = new Array(filterArray.length).fill(undefined)
  //   let searchPosition = 0
  //   while (searchPosition < fileSize) {
  //     await fileHandle.read(metaBytes, 0, 5, searchPosition)
  //     const typeByte = metaBytes.readUint8(0)
  //     const dataSize = metaBytes.readUint32BE(1)
  //     const parser = this.#parsers[typeByte]
  //     if (!parser) throw new Error('parser not found')
  //     for (let index = 0; index < filterArray.length; index++) {
  //       if (isData(dataArray[index])) continue
  //       const { type, filter } = filterArray[index]
  //       if (parser.name !== type) continue
  //       const dataBytes = Buffer.alloc(dataSize)
  //       await fileHandle.read(dataBytes, 0, dataSize, searchPosition + 5)
  //       const data = await parser.parse(dataBytes)
  //       if (filter(data)) dataArray[index] = data
  //     }
  //   }
  //   return dataArray
  // }

}