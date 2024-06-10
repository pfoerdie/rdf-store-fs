import type { ByteSize, FileEnding, PathString, Position, Token } from './types'
import type { FileHandle } from 'node:fs/promises'

import { isObject, isFileEnding, isNull, isPathString, isString, isToken, isNumber } from './types'
import { join as joinPath, basename as getFileName, isAbsolute } from 'node:path'
import { open as openFile, mkdir as makeDir } from 'node:fs/promises'

export interface FileManagerOptions {
  rootFolder: PathString
  fileEnding?: FileEnding
}

function assertFileManagerOptions(options: unknown): asserts options is FileManagerOptions {
  if (!isObject(options)) throw new Error('invalid options')
  if (!(isPathString(options.rootFolder) && isAbsolute(options.rootFolder))) throw new Error('invalid rootFolder')
  if (!(isNull(options.fileEnding) || isFileEnding(options.fileEnding))) throw new Error('invalid fileEnding')
}

export default class FileManager {

  #rootFolder: PathString
  #fileEnding: FileEnding | ''

  constructor(options: FileManagerOptions) {
    assertFileManagerOptions(options)
    this.#rootFolder = options.rootFolder
    this.#fileEnding = options.fileEnding || ''
    makeDir(this.#rootFolder, { recursive: true }).catch(console.error)
  }

  // TODO add managed file size
  // TODO add blocking of writing operations

  #fileHandles = new Map<Token, FileHandle | Promise<FileHandle>>()

  async open(fileName: Token): Promise<FileHandle> {
    const fileHandle = this.#fileHandles.get(fileName)
    if (fileHandle) return fileHandle
    if (!isToken(fileName)) throw new Error('invalid fileName')
    const filePath = joinPath(this.#rootFolder, fileName + this.#fileEnding)
    const fileHandlePromise = openFile(filePath, 'w+')
    this.#fileHandles.set(fileName, fileHandlePromise)
    fileHandlePromise.then(fileHandle => this.#fileHandles.set(fileName, fileHandle))
    return fileHandlePromise
  }

  async read(fileName: Token, bytes: Buffer | ByteSize, position: Position): Promise<Buffer> {
    const fileHandle = await this.open(fileName)
    const buffer = isNumber(bytes) ? Buffer.alloc(bytes) : bytes
    await fileHandle.read(buffer, 0, buffer.length, position)
    return buffer
  }

  async write(fileName: Token, bytes: Buffer, position: Position): Promise<void> {
    const fileHandle = await this.open(fileName)
    await fileHandle.write(bytes, 0, bytes.length, position)
  }

  async append(fileName: Token, bytes: Buffer): Promise<void> {
    const fileHandle = await this.open(fileName)
    const { size: fileSize } = await fileHandle.stat()
    await fileHandle.write(bytes, 0, bytes.length, fileSize)
  }

  async truncate(fileName: Token, bytes: ByteSize): Promise<void> {
    const fileHandle = await this.open(fileName)
    await fileHandle.truncate(bytes)
  }

}