import { PathString, isPathString, Token, isToken } from './types'
import { join as joinPath } from 'node:path'
import File from './File'

export interface FileManagerOptions {
  root: PathString
}

export default class FileManager<FileNames extends Token> {

  #root: PathString
  #files: { [FileName in FileNames]: File<FileName> | Promise<File<FileName>> }

  constructor({ root }: FileManagerOptions) {
    if (!isPathString(root)) throw new Error('root is not a PathString')
    this.#root = root
    this.#files = Object.create(null)
  }

  async open<FileName extends FileNames>(name: FileName): Promise<File<FileName>> {
    return this.#files[name] || (
      this.#files[name] = File.open({ name, path: joinPath(this.#root, name) })
        .then(file => this.#files[name] = file))
  }

}