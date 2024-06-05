import type { PathString } from './types'

type TypeMap<T> = Record<keyof T, any> | DefaultTypeMap
type DefaultTypeMap = [never]

export interface BinaryType<Types extends TypeMap<Types>> {
  type: Types extends DefaultTypeMap ? string : keyof Types
  byteId: number
  parse<Key extends keyof Types>(bytes: Buffer): Types extends DefaultTypeMap ? any : Types[Key]
  serialize<Key extends keyof Types>(value: (Types extends DefaultTypeMap ? any : Types[Key])): Buffer
}

export interface StorageEngineOptions<Types extends TypeMap<Types>> {
  dataFile: PathString
  binaryTypes: Array<BinaryType<Types>>
}

export default class StorageEngine<Types extends TypeMap<Types> = DefaultTypeMap> {

  #dataFile: PathString
  #binaryTypes: BinaryType<Types>[]
  #parsers: Map<number, BinaryType<Types>['parse']> = new Map()
  #serializers: Map<string | keyof Types, BinaryType<Types>['serialize']> = new Map()

  constructor(options: StorageEngineOptions<Types>) {
    this.#dataFile = options.dataFile
    this.#binaryTypes = options.binaryTypes
    for (let binaryType of this.#binaryTypes) {
      this.#parsers.set(binaryType.byteId, binaryType.parse)
      this.#serializers.set(binaryType.type, binaryType.serialize)
    }
  }

}