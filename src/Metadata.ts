import { Uint32, isUint32, Uint16, isUint16, isBuffer } from './types'

export interface MetadataOptions {
  position: Uint32
  type: Uint16
  length: Uint32
  checksum: Uint16
}

export interface MetadataBufferOptions {
  position: Uint32
  buffer: Buffer
}

export default class Metadata implements Readonly<MetadataOptions> {

  static parse({ position, buffer }: MetadataBufferOptions): Metadata {
    if (!isUint32(position)) throw new Error('position is not an Uint32')
    if (!isBuffer(buffer)) throw new Error('buffer is not a Buffer')
    if (buffer.length !== 8) throw new Error('buffer does not have length 8')
    return new Metadata({
      position: position + 8,
      type: buffer.readUint16BE(0),
      length: buffer.readUint32BE(2),
      checksum: buffer.readUint16BE(6)
    })
  }

  readonly position: Uint32
  readonly type: Uint16
  readonly length: Uint32
  readonly checksum: Uint16

  constructor({ position, type, length, checksum }: MetadataOptions) {
    if (!isUint32(position)) throw new Error('position is not an Uint32')
    if (!isUint16(type)) throw new Error('type is not an Uint16')
    if (!isUint32(length)) throw new Error('length is not an Uint32')
    if (!isUint16(checksum)) throw new Error('checksum is not an Uint16')
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