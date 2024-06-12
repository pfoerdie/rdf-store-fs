import { PathString, isPathString, Token, isToken, isNull } from './types'
import { join as joinPath, normalize as normalizePath } from 'node:path'
import { mkdir as makeDir } from 'node:fs/promises'
import File from './File'

export interface FileManagerOptions {
  root: PathString
  extension?: Token | null
}

export default class FileManager<FileNames extends Token = Token> {

  #root: PathString
  #extension: Token | null
  #files: { [FileName in FileNames]: File<FileName> | Promise<File<FileName>> }
  #init: Promise<void> | null

  constructor({ root, extension }: FileManagerOptions) {
    if (!isPathString(root)) throw new Error('root is not a PathString')
    if (!(isNull(extension) || isToken(extension))) throw new Error('extension is not a Token')
    this.#root = normalizePath(root)
    this.#extension = extension || null
    this.#files = Object.create(null)
    this.#init = (async () => {
      await makeDir(root, { recursive: true })
      this.#init = null
    })()
  }

  get root() {
    return this.#root
  }

  get extension() {
    return this.#extension
  }

  async open<FileName extends FileNames>(name: FileName): Promise<File<FileName>> {
    if (this.#init) await this.#init
    return this.#files[name] || (
      this.#files[name] = File.open({ name, path: joinPath(this.#root, this.#extension ? `${name}.${this.#extension}` : name) })
        .then(file => this.#files[name] = file))
  }

}