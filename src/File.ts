import { FileHandle, open as openFile } from 'node:fs/promises'
import { Stats as FileStats } from 'node:fs'
import { Token, PathString, Uint32, isNumber, isString, isUint32, isBuffer, isToken, isPathString, isFileStats, isFileHandle } from './types'
import TaskQueue from './TaskQueue'

export interface OpenFileOptions<FileName> {
  name: FileName
  path: PathString
}

export interface FileOptions<FileName> {
  name: FileName
  handle: FileHandle
  stats: FileStats
}

export interface FileChunk {
  position: Uint32
  length: Uint32
  buffer: Buffer
}

export default class File<FileName extends Token> {

  static async open<FileName extends Token>({ name, path }: OpenFileOptions<FileName>): Promise<File<FileName>> {
    if (!isToken(name)) throw new Error('name is not a Token')
    if (!isPathString(path)) throw new Error('path is not a PathString')
    const handle = await openFile(path, 'r+')
    const stats = await handle.stat()
    return new File({ name, handle, stats })
  }

  #name: FileName
  #size: Uint32
  #handle: FileHandle
  #queue: TaskQueue

  constructor({ name, stats, handle }: FileOptions<FileName>) {
    if (!isToken(name)) throw new Error('name is not a Token')
    if (!isFileStats(stats)) throw new Error('stats is not a FileStats')
    if (!isFileHandle(handle)) throw new Error('handle is not a FileHandle')
    this.#name = name
    this.#size = stats.size
    this.#handle = handle
    this.#queue = new TaskQueue()
  }

  get name() {
    return this.#name
  }

  get size() {
    return this.#size
  }

  close(): Promise<void> {
    return this.#handle.close()
  }

  read(position: Uint32, bytes: Uint32 | Buffer | string): Promise<FileChunk> {
    return this.#queue.execute(async () => {
      if (!isUint32(position)) throw new Error('position is not an uint32')
      if (position >= this.#size) throw new Error('position is out of file')
      const buffer = isNumber(bytes) ? Buffer.alloc(bytes) : isString(bytes) ? Buffer.from(bytes) : bytes
      if (!isBuffer(buffer)) throw new Error('bytes is not an unint32, a string or a buffer')
      const length = buffer.length
      if (position + length >= this.#size) throw new Error('reading bytes out of file')
      await this.#handle.read(buffer, 0, length, position)
      return { position, length, buffer }
    })
  }

  write(position: Uint32, bytes: Buffer | string): Promise<FileChunk> {
    return this.#queue.execute(async () => {
      if (!isUint32(position)) throw new Error('position is not an uint32')
      if (position >= this.#size) throw new Error('position is out of file')
      const buffer = isString(bytes) ? Buffer.from(bytes) : bytes
      const length = buffer.length
      if (!isBuffer(buffer)) throw new Error('bytes is not a string or a buffer')
      if (!isUint32(position + length)) throw new Error('writing bytes over the max size')
      await this.#handle.write(buffer, 0, length, position)
      this.#size = Math.max(this.#size, position + length)
      return { position, length, buffer }
    })
  }

  append(bytes: Buffer | string): Promise<FileChunk> {
    return this.#queue.execute(async () => {
      const position = this.#size
      const buffer = isString(bytes) ? Buffer.from(bytes) : bytes
      const length = buffer.length
      if (!isBuffer(buffer)) throw new Error('bytes is not a string or a buffer')
      if (!isUint32(position + length)) throw new Error('writing bytes over the max size')
      await this.#handle.write(buffer, 0, length, position)
      this.#size = position + length
      return { position, length, buffer }
    })
  }

  clear(position: Uint32, bytes: Uint32): Promise<FileChunk> {
    return this.#queue.execute(async () => {
      if (!isUint32(position)) throw new Error('position is not an uint32')
      if (position >= this.#size) throw new Error('position is out of file')
      if (!isUint32(bytes)) throw new Error('bytes is not an uint32')
      if (position + bytes >= this.#size) throw new Error('clearing bytes out of file')
      const buffer = Buffer.alloc(bytes)
      const length = buffer.length
      await this.#handle.write(buffer, 0, length, position)
      return { position, length, buffer }
    })
  }

  delete(bytes: Uint32): Promise<void> {
    return this.#queue.execute(async () => {
      if (!isUint32(bytes)) throw new Error('bytes is not an uint32')
      const size = this.#size - bytes
      if (size < 0) throw new Error('deleting bytes below the min size')
      await this.#handle.truncate(size)
      this.#size = size
    })
  }

}