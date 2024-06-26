import { Uint32, Uint16, Uint8, isBuffer, isNull } from './types'
import File from './File'

export interface DataOptions {
  file: File
  position?: Uint32 | null
  data?: Buffer | null
}

export default class DataChunk {

  #file: File

  constructor({ file, position, data }: DataOptions) {
    if (!(file instanceof File)) throw new Error('file must be an instance of File')
    this.#file = file
    if (!isNull(position)) this.position = position
    if (!isNull(data)) {
      this.data = data
      this.calcMetadata()
    }
  }

  #position: Buffer = Buffer.alloc(4)
  #metadata: Buffer = Buffer.alloc(8)
  #data: Buffer | null = null

  get file(): File {
    return this.#file
  }

  get position(): Uint32 {
    return this.#position.readUint32BE(0)
  }

  set position(position: Uint32) {
    this.#position.writeUint32BE(position, 0)
  }

  get metadata(): Buffer {
    return this.#metadata
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

  get hash(): Uint16 {
    return this.#metadata.readUint16BE(2)
  }

  set hash(hash: Uint16) {
    this.#metadata.writeUint16BE(hash, 2)
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

  get size(): Uint32 {
    return this.#metadata.readUint32BE(4)
  }

  set size(size: Uint32) {
    this.#metadata.writeUint32BE(size, 4)
  }

  get data(): Buffer | null {
    return this.#data
  }

  set data(data: Buffer | null) {
    if (!(isBuffer(data) || isNull(data))) throw new Error('data must be a Buffer or null')
    this.#data = data
  }

  get start(): Uint32 {
    return this.position + this.metadata.length
  }

  get end(): Uint32 {
    return this.start + this.size
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
    await this.file.read(this.start, this.data)
  }

  async writeData() {
    if (!this.data) throw new Error('data must not be null')
    await this.file.write(this.start, this.data)
  }

  clearData() {
    this.data = null
  }

  static async scanFile(file: File): Promise<Array<DataChunk>> {
    if (!(file instanceof File)) throw new Error('file must be an instance of File')
    const chunks: Array<DataChunk> = []
    let position: Uint32 = 0x00000000
    while (position < file.size) {
      const next = new DataChunk({ file, position })
      await next.readMetadata()
      chunks.push(next)
      position = next.end
    }
    return chunks
  }

}