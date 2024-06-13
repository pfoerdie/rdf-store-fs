export interface MetadataOptions {
  position: number
  type: number
  length: number
  checksum: number
}

export interface MetadataBufferOptions {
  position: number
  buffer: Buffer
}

export default class Metadata implements Readonly<MetadataOptions> {

  static parse({ position, buffer }: MetadataBufferOptions): Metadata {
    if (!Number.isInteger(position)) throw new Error('position is not an integer')
    if (!Buffer.isBuffer(buffer)) throw new Error('buffer is not a Buffer')
    if (buffer.length !== 8) throw new Error('buffer does not have length 8')
    return new Metadata({
      position: position + 8,
      type: buffer.readUint16BE(0),
      length: buffer.readUint32BE(2),
      checksum: buffer.readUint16BE(6)
    })
  }

  readonly position: number
  readonly type: number
  readonly length: number
  readonly checksum: number

  constructor({ position, type, length, checksum }: MetadataOptions) {
    if (!Number.isInteger(position)) throw new Error('position is not an integer')
    if (!Number.isInteger(type)) throw new Error('type is not an integer')
    if (!Number.isInteger(length)) throw new Error('length is not an integer')
    if (!Number.isInteger(checksum)) throw new Error('checksum is not an integer')
    this.position = position
    this.type = type
    this.length = length
    this.checksum = checksum
    Object.freeze(this)
  }

  serialize(): MetadataBufferOptions {
    const buffer = Buffer.alloc(8)
    buffer.writeUint16BE(this.type, 0)
    buffer.writeUint32BE(this.length, 2)
    buffer.writeUint16BE(this.checksum, 6)
    return { position: this.position - 8, buffer }
  }

}