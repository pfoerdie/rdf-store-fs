import { PathString, isPathString, TypeMap, Awaitable, isArray, isToken, isUint8, Uint8, Token, isFunction, isUint32, Uint32 } from './types'
import FileManager from './FileManager'

export interface StorageEngineOptions<Types extends TypeMap<Types> = TypeMap> {
  root: PathString
  types: Array<StorageType<Types>>
}

export type StorageType<Types extends TypeMap<Types> = TypeMap> = { [Type in keyof Types]: {
  name: Type & Token
  byte: Uint8
  parse(this: StorageEngine<Types>, bytes: Buffer): Awaitable<Types[Type]>
  serialize(this: StorageEngine<Types>, value: Types[Type]): Awaitable<Buffer>
} }[keyof Types]

export default class StorageEngine<Types extends TypeMap<Types> = TypeMap> {

  #parsers: { [Type in keyof Types]: Record<Uint8, {
    name: Type & Token
    parse(bytes: Buffer): Awaitable<Types[Type]>
  }> }[keyof Types] = Object.create(null)
  #serializers: { [Type in keyof Types]: Record<Type, {
    byte: Uint8
    serialize(value: Types[Type]): Awaitable<Buffer>
  }> }[keyof Types] = Object.create(null)
  #manager: FileManager<'data'>

  constructor({ root, types }: StorageEngineOptions<Types>) {
    if (!isPathString(root)) throw new Error('root is not a PathString')
    if (!isArray(types)) throw new Error('types is not an array')
    for (let { name, byte, parse, serialize } of types) {
      if (!isToken(name)) throw new Error('name is not a Token')
      if (!isUint8(byte)) throw new Error('byte is not an Uint8')
      if (byte === 0x00) throw new Error('byte must not be a zero byte')
      if (!isFunction(parse)) throw new Error('parse is not a function')
      if (!isFunction(serialize)) throw new Error('serialize is not a function')
      if (this.#parsers[byte]) throw new Error('the byte must not be duplicate')
      if (this.#serializers[name]) throw new Error('the name must not be duplicate')
      this.#serializers[name] = Object.freeze({ byte, serialize: serialize.bind(this) })
      this.#parsers[byte] = Object.freeze({ name, parse: parse.bind(this) })
    }
    this.#manager = new FileManager({ root, extension: 'bin' })
  }

  async retrieveOne<Type extends keyof Types>(position: Uint32): Promise<Types[Type]> {
    if (!isUint32(position)) throw new Error('position is not an Uint32')
    const file = await this.#manager.open('data')
    const meta = await file.read(position, 5)
    const byte = meta.buffer.readUint8(0)
    const parser = this.#parsers[byte]
    if (!parser) throw new Error('parser not found')
    const length = meta.buffer.readUint32BE(1)
    const data = await file.read(position + 5, length)
    return parser.parse(data.buffer) as Types[Type]
  }

  // TODO

}