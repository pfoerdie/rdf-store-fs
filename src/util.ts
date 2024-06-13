import { Uint8 } from './types'
import { hash, createHash } from 'node:crypto'

export function checksum(data: Buffer): Buffer {
  return data.length < 1e6
    ? hash('sha1', data, 'buffer')
    : createHash('sha1').update(data).digest()
}

export function bytesum(data: Buffer): Uint8 {
  const sum = Buffer.alloc(1)
  for (let i = 0, l = data.length; i < l; i++) {
    sum[0] += data[i]
  }
  return sum[0]
}

export function bytexor(data: Buffer): Uint8 {
  const xor = Buffer.alloc(1)
  for (let i = 0, l = data.length; i < l; i++) {
    xor[0] ^= data[i]
  }
  return xor[0]
}