import type { PathString } from './types'
import type { FileHandle } from 'node:fs/promises'
import { open as openFile } from 'node:fs/promises'

type TypeMap<T> = Record<keyof T, any> | DefaultTypeMap
type DefaultTypeMap = [never]

export interface BinaryType<Types extends TypeMap<Types>> {
  type: Types extends DefaultTypeMap ? string : keyof Types
  byteId: number
  parse<Key extends keyof Types>(this: StorageEngine<Types>, bytes: Buffer): Types extends DefaultTypeMap ? any : Types[Key]
  serialize<Key extends keyof Types>(this: StorageEngine<Types>, value: (Types extends DefaultTypeMap ? any : Types[Key])): Buffer
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

class BufferedFileHandler {

  #filePath: PathString
  #fileHandle: FileHandle | null
  #taskQueue = new TaskQueue()

  constructor(filePath: PathString) {
    this.#filePath = filePath
    this.#fileHandle = null
  }

  read(position: number, length: number): Promise<Buffer> {
    return this.#taskQueue.execute(async () => {
      const buffer = Buffer.alloc(length)
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#filePath))
      const result = await fileHandle.read(buffer, 0, length, position)
      return result.buffer
    })
  }

  write(position: number, buffer: Buffer): Promise<number> {
    return this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#filePath))
      const result = await fileHandle.write(buffer, 0, buffer.length, position)
      return result.bytesWritten
    })
  }

}

export default class StorageEngine<Types extends TypeMap<Types> = DefaultTypeMap> {

  #dataFile: PathString
  #byteMap: Record<number, BinaryType<Types>> = Object.create(null)
  #typeMap: Record<string | keyof Types, BinaryType<Types>> = Object.create(null)
  #fileHandle: FileHandle | undefined
  #taskQueue = new TaskQueue()

  constructor(options: StorageEngineOptions<Types>) {
    this.#dataFile = options.dataFile
    for (let binaryType of options.binaryTypes) {
      this.#byteMap[binaryType.byteId] = binaryType
      this.#typeMap[binaryType.type] = binaryType
    }
  }

  // async find<Key extends keyof Types>(type: Key) { }

  // TODO maybe rename from insert to merge or return a more detailed report
  // IDEA batched insertion could increase performance (e.g. insertMany)
  async insert<Key extends keyof Types>(type: Key, value: (Types extends DefaultTypeMap ? any : Types[Key])): Promise<number> {
    const binaryType = this.#typeMap[type]
    if (!binaryType) throw new Error('unknown type')
    const bytes = await binaryType.serialize.call(this, value)
    if (bytes.length > 0xfffffffe) throw new Error('too many bytes')
    return await this.#taskQueue.execute(async () => {
      const fileHandle = this.#fileHandle || (this.#fileHandle = await openFile(this.#dataFile))
      const { size: fileSize } = await fileHandle.stat()
      const metaBuffer = Buffer.alloc(5)
      let currentPos = 0
      while (currentPos < fileSize) {
        await fileHandle.read(metaBuffer, null, null, currentPos)
        const byteId = metaBuffer.readUint8(0)
        const byteSize = metaBuffer.readUint32BE(1)
        if (byteId === 0x00) {
          // TODO capture the empty section for later insertion, if the bytes would fit inside
        } else if (byteId === binaryType.byteId && byteSize === bytes.length) {
          const dataBuffer = Buffer.alloc(byteSize)
          await fileHandle.read(dataBuffer, null, null, currentPos)
          // if the data buffer from the file equals the bytes to save,
          // the bytes must not be inserted twice and the position can just be returned
          if (dataBuffer.equals(bytes)) return currentPos
        }
        currentPos += metaBuffer.length + byteSize
      }
      // TODO insert the bytes or append to the end
    })
  }

}