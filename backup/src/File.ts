import type { ByteSize, PathString, Position, Token } from './types'
import type { FileHandle } from 'node:fs/promises'

import { isObject, isNull, isPathString, isString, isToken, isNumber } from './types'
import { isAbsolute } from 'node:path'
import { open as openFile } from 'node:fs/promises'

export interface FileOptions {
  name: Token
  path: PathString
}

function assertFileOptions(options: unknown): asserts options is FileOptions {
  if (!isObject(options)) throw new Error('invalid options')
  if (!isToken(options.name)) throw new Error('invalid name')
  if (!(isPathString(options.path) && isAbsolute(options.path))) throw new Error('invalid path')
}

export default class File {

  #name: Token | undefined
  #path: PathString | undefined
  #size: ByteSize | undefined
  #handle: FileHandle | undefined
  #init: Promise<void> | undefined

  constructor(options: FileOptions) {
    assertFileOptions(options)
    this.#init = (async () => {
      this.#name = options.name
      this.#path = options.path
      this.#handle = await openFile(this.#path, 'w+')
      const stats = await this.#handle.stat()
      this.#size = stats.size
      this.#init = undefined
    })()
  }



  async read(bytes: Buffer | ByteSize, position: Position): Promise<Buffer> {
    if (this.#init) await this.#init
    const fileHandle = await this.#handle
    const buffer = isNumber(bytes) ? Buffer.alloc(bytes) : bytes
    await this.#handle.read(buffer, 0, buffer.length, position)
    return buffer
  }

  async write(bytes: Buffer, position: Position): Promise<void> {
    const fileHandle = await this.open(fileName)
    await fileHandle.write(bytes, 0, bytes.length, position)
  }

  async append(bytes: Buffer): Promise<void> {
    const fileHandle = await this.open(fileName)
    const { size: fileSize } = await fileHandle.stat()
    await fileHandle.write(bytes, 0, bytes.length, fileSize)
  }

  async truncate(bytes: ByteSize): Promise<void> {
    const fileHandle = await this.open(fileName)
    await fileHandle.truncate(bytes)
  }

}