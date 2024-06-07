import type { PathString, Awaitable, TypeMap } from './types'
import type { FileHandle } from 'node:fs/promises'
import { open as openFile } from 'node:fs/promises'
import TaskQueue from './TaskQueue'

export type BinaryType<Types extends TypeMap<Types>> = { [Key in keyof Types]: {
  type: Key
  byteId: number
  parse(this: StorageEngine<Types>, bytes: Buffer): Awaitable<Types[Key]>
  serialize(this: StorageEngine<Types>, value: Types[Key]): Awaitable<Buffer>
} }[keyof Types]

export interface StorageEngineOptions<Types extends TypeMap<Types>> {
  dataFile: PathString
  binaryTypes: Array<BinaryType<Types> | null | undefined>
}

function isByteId(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0x00
    && value <= 0xff
}

function isType(value: unknown): value is string {
  return typeof value === 'string'
    && /^\S+$/.test(value)
}

function isPosition(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0x00000000
    && value <= 0xffffffff
}

export default class StorageEngine<Types extends TypeMap<Types> = TypeMap> {

  #dataFile: PathString
  #byteMap: Record<number, BinaryType<Types>> = Object.create(null)
  #typeMap: Record<string | keyof Types, BinaryType<Types>> = Object.create(null)
  #fileHandle: FileHandle | null = null
  #taskQueue = new TaskQueue()

  constructor(options: StorageEngineOptions<Types>) {
    this.#dataFile = options.dataFile
    for (let binaryType of options.binaryTypes) {
      if (!binaryType) continue
      binaryType = Object.freeze({ ...binaryType })
      if (!isByteId(binaryType.byteId)) throw new Error('invalid byte id')
      if (!isType(binaryType.type)) throw new Error('invalid binary type')
      if (binaryType.byteId in this.#byteMap) throw new Error('duplicate byte id')
      if (binaryType.type in this.#typeMap) throw new Error('duplicate binary type')
      this.#byteMap[binaryType.byteId] = binaryType
      this.#typeMap[binaryType.type] = binaryType
    }
  }

  // TODO how to handle insertion of multiple data where some data depends on the position bytes of other data?
  // IDEA maybe move the task queue to the store instead of the engine, which makes things less secure but gives more freedom

  async close() {
    await this.#taskQueue.execute(async () => {
      if (!this.#fileHandle) return
      await this.#fileHandle.close()
      this.#fileHandle = null
    })
  }

  // async iterate<Key extends keyof Types>(): Promise<AsyncIterable<Types extends DefaultTypeMap ? any : Types[Key]>> {
  //   return await this.#taskQueue.execute(async () => {
  //     const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
  //     const { size: fileSize } = await fileHandle.stat()
  //     const engine = this
  //     return {
  //       async *[Symbol.asyncIterator]() {
  //         const metaBuffer = Buffer.alloc(5)
  //         let currentPos = 0
  //         // NOTE reading the file here is not safe, because the function call is done outside the task queue
  //         while (currentPos < fileSize) {
  //           await fileHandle.read(metaBuffer, 0, metaBuffer.length, currentPos)
  //           const byteId = metaBuffer.readUint8(0)
  //           const byteSize = metaBuffer.readUint32BE(1)
  //           if (byteId !== 0x00) {
  //             const binaryType = engine.#byteMap[byteId]
  //             if (!binaryType) throw new Error('unknown byte id')
  //             const dataBuffer = Buffer.alloc(byteSize)
  //             await fileHandle.read(dataBuffer, 0, dataBuffer.length, currentPos + metaBuffer.length)
  //             yield await binaryType.parse.call(engine, dataBuffer)
  //           }
  //           currentPos += metaBuffer.length + byteSize
  //         }
  //       }
  //       // [Symbol.asyncDispose]() { }
  //     }
  //   })
  // }

  async retrieveOne<Key extends keyof Types>(position: number): Promise<Types[Key]> {
    if (!isPosition(position)) throw new Error('invalid position')
    // NOTE somehow typescript shows an error without the following 'await'
    return await this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
      const { size: fileSize } = await fileHandle.stat()
      const metaBuffer = Buffer.alloc(5)
      if (position >= fileSize - metaBuffer.length) throw new Error('invalid position')
      await fileHandle.read(metaBuffer, 0, metaBuffer.length, position)
      const byteId = metaBuffer.readUint8(0)
      const binaryType: BinaryType<Types> = this.#byteMap[byteId]
      if (!binaryType) throw new Error('unknown type')
      const byteSize = metaBuffer.readUint32BE(1)
      const dataBuffer = Buffer.alloc(byteSize)
      await fileHandle.read(dataBuffer, 0, dataBuffer.length, position + metaBuffer.length)
      return binaryType.parse.call(this, dataBuffer)
    })
  }

  async retrieveMany<Key extends keyof Types>(positions: Array<number>): Promise<Array<Types[Key]>> {
    if (!(Array.isArray(positions) && positions.every(isPosition))) throw new Error('invalid positions')
    if (positions.length === 0) return []
    return this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
      const { size: fileSize } = await fileHandle.stat()
      return Promise.all(positions.map(async (position) => {
        const metaBuffer = Buffer.alloc(5)
        if (position >= fileSize - metaBuffer.length) throw new Error('invalid position')
        await fileHandle.read(metaBuffer, 0, metaBuffer.length, position)
        const byteId = metaBuffer.readUint8(0)
        const binaryType: BinaryType<Types> = this.#byteMap[byteId]
        if (!binaryType) throw new Error('unknown type')
        const byteSize = metaBuffer.readUint32BE(1)
        const dataBuffer = Buffer.alloc(byteSize)
        await fileHandle.read(dataBuffer, 0, dataBuffer.length, position + metaBuffer.length)
        return binaryType.parse.call(this, dataBuffer)
      }))
    })
  }

  async insertOne<Key extends keyof Types>(type: Key, value: Types[Key]): Promise<number> {
    const binaryType = this.#typeMap[type]
    if (!binaryType) throw new Error('unknown type')
    const bytes = await binaryType.serialize.call(this, value)
    if (bytes.length > 0xffffffff) throw new Error('too many bytes')
    return this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
      const { size: fileSize } = await fileHandle.stat()
      const metaBuffer = Buffer.alloc(5)
      let currentPos = 0
      let insertPos: number = fileSize
      let availableSize: number = 0xffffffff
      while (currentPos < fileSize) {
        await fileHandle.read(metaBuffer, 0, metaBuffer.length, currentPos)
        const byteId = metaBuffer.readUint8(0)
        const byteSize = metaBuffer.readUint32BE(1)
        if (byteId === 0x00) {
          // if the empty byte section could fit the bytes to save and there is not already a better fit,
          // then remember the empty section for later insertion
          if (byteSize >= bytes.length && byteSize < availableSize) {
            // make sure that the empty section is filled completely or that the rest size could also fit another meta section
            if (byteSize === bytes.length || byteSize - bytes.length >= metaBuffer.length) {
              insertPos = currentPos
              availableSize = byteSize
            }
          }
        } else if (byteId === binaryType.byteId && byteSize === bytes.length) {
          const dataBuffer = Buffer.alloc(byteSize)
          await fileHandle.read(dataBuffer, 0, dataBuffer.length, currentPos)
          // if the data buffer from the file equals the bytes to save,
          // the bytes must not be inserted twice and the position can just be returned
          if (dataBuffer.equals(bytes)) return currentPos
        }
        currentPos += metaBuffer.length + byteSize
      }
      metaBuffer.writeUint8(binaryType.byteId, 0)
      metaBuffer.writeUint32BE(bytes.length, 1)
      const insertBuffers: Array<Buffer> = [metaBuffer, bytes]
      // if inserted inside the file and the available size is greater than needed,
      // then add another empty meta buffer at the end of the byte data
      if (insertPos < fileSize && availableSize > bytes.length) {
        const emptyMetaBuffer = Buffer.alloc(metaBuffer.length)
        emptyMetaBuffer.writeUint8(0x00, 0)
        emptyMetaBuffer.writeUint32BE(availableSize - bytes.length - metaBuffer.length, 1)
        insertBuffers.push(emptyMetaBuffer)
      }
      await fileHandle.writev(insertBuffers, insertPos)
      return insertPos
    })
  }

  async insertMany<Key extends keyof Types>(values: Array<{ type: Key, value: Types[Key] }>): Promise<Array<number>> {
    if (!(Array.isArray(values) && values.every(entry => isType(entry?.type) && 'value' in entry))) throw new Error('invalid values')
    if (values.length === 0) return []
    if (values.length === 1) return [await this.insertOne(values[0].type, values[0].value)]
    // TODO improve performance by only iterating once over the file
    return Promise.all(values.map(({ type, value }) => this.insertOne(type, value)))
  }

  async findOne<Key extends keyof Types>(type: Key, filter: (value: Types[Key]) => boolean): Promise<Types[Key] | undefined> {
    if (typeof filter !== 'function') throw new Error('invalid filter')
    const binaryType = this.#typeMap[type]
    if (!binaryType) throw new Error('unknown type')
    return await this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
      const { size: fileSize } = await fileHandle.stat()
      const metaBuffer = Buffer.alloc(5)
      let currentPos = 0
      while (currentPos < fileSize) {
        await fileHandle.read(metaBuffer, 0, metaBuffer.length, currentPos)
        const byteId = metaBuffer.readUint8(0)
        const byteSize = metaBuffer.readUint32BE(1)
        if (byteId === binaryType.byteId) {
          const dataBuffer = Buffer.alloc(byteSize)
          await fileHandle.read(dataBuffer, 0, dataBuffer.length, currentPos + metaBuffer.length)
          const value = await binaryType.parse.call(this, dataBuffer)
          if (filter(value)) return value
        }
        currentPos += metaBuffer.length + byteSize
      }
    })
  }

  async findMany<Key extends keyof Types>(type: Key, filter: (value: Types[Key]) => boolean): Promise<Array<Types[Key]>> {
    if (typeof filter !== 'function') throw new Error('invalid filter')
    const binaryType = this.#typeMap[type]
    if (!binaryType) throw new Error('unknown type')
    return await this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
      const { size: fileSize } = await fileHandle.stat()
      const metaBuffer = Buffer.alloc(5)
      const values = []
      let currentPos = 0
      console.log({ fileSize, currentPos })
      while (currentPos < fileSize) {
        await fileHandle.read(metaBuffer, 0, metaBuffer.length, currentPos)
        const byteId = metaBuffer.readUint8(0)
        const byteSize = metaBuffer.readUint32BE(1)
        if (byteId === binaryType.byteId) {
          const dataBuffer = Buffer.alloc(byteSize)
          console.log({ byteId, byteSize })
          await fileHandle.read(dataBuffer, 0, dataBuffer.length, currentPos + metaBuffer.length)
          // FIXME parsing the data can lock the process if the parser calls engine methods
          const value = await binaryType.parse.call(this, dataBuffer)
          if (filter(value)) values.push(value)
        }
        currentPos += metaBuffer.length + byteSize
      }
      return values
    })
  }

}