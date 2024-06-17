import { Uint32, isUint32, Uint16, isUint16, Uint8, isUint8, isBuffer, isNull } from './types'
import File from './File'

export interface DataOptions {
  file: File
  position?: Uint32
}

export default class DataChunk {

  #file: File

  constructor({ file, position }: DataOptions) {
    if (!(file instanceof File)) throw new Error('file must be an instance of File')
    this.#file = file
    if (!isNull(position)) this.position = position
  }

  #metadata: Buffer = Buffer.alloc(8)
  #data: Buffer | null = null
  #position: Buffer = Buffer.alloc(4)

  get file(): File {
    return this.#file
  }

  get metadata(): Buffer {
    return this.#metadata
  }

  get data(): Buffer | null {
    return this.#data
  }

  set data(data: Buffer | null) {
    if (!(isBuffer(data) || isNull(data))) throw new Error('data must be a Buffer or null')
    this.#data = data
  }

  get type(): Uint8 {
    return this.#metadata.readUint8(0)
  }

  set type(type: Uint8) {
    this.#metadata.writeUint8(type, 0)
  }

  get status(): Uint8 {
    return this.#metadata.readUint8(1)
  }

  set status(status: Uint8) {
    this.#metadata.writeUint8(status, 1)
  }

  get bytesum(): Uint8 {
    return this.#metadata.readUint8(2)
  }

  set bytesum(bytesum: Uint8) {
    this.#metadata.writeUint8(bytesum, 2)
  }

  get bytexor(): Uint8 {
    return this.#metadata.readUint8(3)
  }

  set bytexor(bytexor: Uint8) {
    this.#metadata.writeUint8(bytexor, 3)
  }

  get hash(): Uint16 {
    return this.#metadata.readUint16BE(2)
  }

  set hash(hash: Uint16) {
    this.#metadata.writeUint16BE(hash, 2)
  }

  get size(): Uint32 {
    return this.#metadata.readUint32BE(4)
  }

  set size(size: Uint32) {
    this.#metadata.writeUint32BE(size, 4)
  }

  get position(): Uint32 {
    return this.#position.readUint32BE(0)
  }

  set position(position: Uint32) {
    this.#position.writeUint32BE(position, 0)
  }

  calcMetadata() {
    if (this.data) {
      this.hash = 0x0000
      this.size = this.data.length
      for (let i = 0, l = this.data.length; i < l; i++) {
        this.bytesum += this.data[i]
        this.bytexor ^= this.data[i]
      }
    } else {
      this.metadata.fill(0x00)
    }
  }

  async readMetadata() {
    await this.file.read(this.position, this.metadata)
  }

  async writeMetadata() {
    await this.file.write(this.position, this.metadata)
  }

  async readData() {
    this.data = Buffer.alloc(this.size)
    await this.file.read(this.position + this.metadata.length, this.data)
  }

  async writeData() {
    if (!this.data) throw new Error('data must not be null')
    await this.file.write(this.position + this.metadata.length, this.data)
  }

}