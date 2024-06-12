import { Uint8 } from './types'
import { hash, createHash } from 'node:crypto'

export function checksum(data: Buffer): Buffer {
  return data.length < 1e6
    ? hash('sha1', data, 'buffer')
    : createHash('sha1').update(data).digest()
}

export function bytesum(data: Buffer): Uint8 {
  return data.reduce((acc, val) => (acc + val) % 0xff, 0x00)
  // IDEA alternatively adding bytes to Buffer.alloc(1)[0] overflows without calculating modulus
}