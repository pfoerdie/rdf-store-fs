import type { PathString } from './types'
import type { FileHandle } from 'node:fs/promises'
import { open as openFile } from 'node:fs/promises'

type TypeMap<T> = Record<keyof T, any> | DefaultTypeMap
type DefaultTypeMap = [never]

type Awaitable<T> = T | Promise<T>

export interface BinaryType<Types extends TypeMap<Types>> {
  type: Types extends DefaultTypeMap ? string : keyof Types
  byteId: number
  parse<Key extends keyof Types>(this: StorageEngine<Types>, bytes: Buffer): Awaitable<Types extends DefaultTypeMap ? any : Types[Key]>
  serialize<Key extends keyof Types>(this: StorageEngine<Types>, value: (Types extends DefaultTypeMap ? any : Types[Key])): Awaitable<Buffer>
}

export interface StorageEngineOptions<Types extends TypeMap<Types>> {
  dataFile: PathString
  binaryTypes: Array<BinaryType<Types>>
}

class TaskQueue {

  #queue: Array<() => void> = []

  execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const current = () => void task().then(resolve).catch(reject).finally(() => {
        this.#queue.shift()
        const next = this.#queue[0]
        if (next) next()
      })
      this.#queue.push(current)
      if (this.#queue[0] === current) current()
    })
  }

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

export default class StorageEngine<Types extends TypeMap<Types> = DefaultTypeMap> {

  #dataFile: PathString
  #byteMap: Record<number, BinaryType<Types>> = Object.create(null)
  #typeMap: Record<string | keyof Types, BinaryType<Types>> = Object.create(null)
  #fileHandle: FileHandle | null = null
  #taskQueue = new TaskQueue()

  constructor(options: StorageEngineOptions<Types>) {
    this.#dataFile = options.dataFile
    for (let binaryType of options.binaryTypes) {
      binaryType = Object.freeze({ ...binaryType })
      if (!isByteId(binaryType.byteId)) throw new Error('invalid byte id')
      if (!isType(binaryType.type)) throw new Error('invalid binary type')
      if (binaryType.byteId in this.#byteMap) throw new Error('duplicate byte id')
      if (binaryType.type in this.#typeMap) throw new Error('duplicate binary type')
      this.#byteMap[binaryType.byteId] = binaryType
      this.#typeMap[binaryType.type] = binaryType
    }
  }

  async close() {
    await this.#taskQueue.execute(async () => {
      if (!this.#fileHandle) return
      await this.#fileHandle.close()
      this.#fileHandle = null
    })
  }

  // TODO rethink method naming (maybe use CRUMDL wording)

  async retrieveOne<Key extends keyof Types>(valuePos: number): Promise<Types extends DefaultTypeMap ? any : Types[Key]> {
    if (valuePos < 0) throw new Error('invalid position')
    return await this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
      const { size: fileSize } = await fileHandle.stat()
      const metaBuffer = Buffer.alloc(5)
      if (valuePos >= fileSize - metaBuffer.length) throw new Error('invalid position')
      await fileHandle.read(metaBuffer, null, null, valuePos)
      const byteId = metaBuffer.readUint8(0)
      const binaryType: BinaryType<Types> = this.#byteMap[byteId]
      if (!binaryType) throw new Error('unknown type')
      const byteSize = metaBuffer.readUint32BE(1)
      const dataBuffer = Buffer.alloc(byteSize)
      await fileHandle.read(dataBuffer, null, null, valuePos + metaBuffer.length)
      return await binaryType.parse.call(this, dataBuffer)
    })
  }

  // async findOne<Key extends keyof Types>(type: Key, ...args) { }

  async insertOne<Key extends keyof Types>(type: Key, value: Types extends DefaultTypeMap ? any : Types[Key]): Promise<number> {
    const binaryType = this.#typeMap[type]
    if (!binaryType) throw new Error('unknown type')
    const bytes = await binaryType.serialize.call(this, value)
    if (bytes.length > 0xffffffff) throw new Error('too many bytes')
    return await this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile, 'w+'))
      const { size: fileSize } = await fileHandle.stat()
      const metaBuffer = Buffer.alloc(5)
      let currentPos = 0
      let insertPos: number = fileSize
      let availableSize: number = 0xffffffff
      while (currentPos < fileSize) {
        await fileHandle.read(metaBuffer, null, null, currentPos)
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
          await fileHandle.read(dataBuffer, null, null, currentPos)
          // if the data buffer from the file equals the bytes to save,
          // the bytes must not be inserted twice and the position can just be returned
          if (dataBuffer.equals(bytes)) return currentPos
        }
        currentPos += metaBuffer.length + byteSize
      }
      metaBuffer.writeUint8(binaryType.byteId)
      metaBuffer.writeUint32BE(bytes.length)
      const insertBuffers: Array<Buffer> = [metaBuffer, bytes]
      // if inserted inside the file and the available size is greater than needed,
      // then add another empty meta buffer at the end of the byte data
      if (insertPos < fileSize && availableSize > bytes.length) {
        const emptyMetaBuffer = Buffer.alloc(metaBuffer.length)
        emptyMetaBuffer.writeUint8(0x00)
        emptyMetaBuffer.writeUint32BE(availableSize - bytes.length - metaBuffer.length)
        insertBuffers.push(emptyMetaBuffer)
      }
      await fileHandle.writev(insertBuffers, insertPos)
      return insertPos
    })
  }

  // async insertMany<Key extends keyof Types>(values: Array<{ type: Key, value: Types extends DefaultTypeMap ? any : Types[Key] }>): Promise<Array<number>> {
  //   // TODO batched insertion to increase performance and only iterate once over the file
  // }

}