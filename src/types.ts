// import type { EventEmitter } from 'node:events'
// import type { DataFactory, Stream, Quad, NamedNode } from '@rdfjs/types'

export function isNull(value: unknown): value is null | undefined {
  return (value ?? null) === null
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isObject(value: unknown): value is Record<any, any> {
  return !!value && typeof value === 'object'
}

export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function'
}

export function isArray(value: unknown): value is Array<any> {
  return Array.isArray(value)
}

/** 
 * The DOMString type corresponds to the set of all possible sequences 
 * of 16 bit unsigned integer code units to be interpreted as UTF-16 encoded strings. 
 */
export type DOMString = string

export function isDOMString(value: unknown): value is DOMString {
  return isString(value)
}

export type Token = string

export function isToken(value: unknown): value is Token {
  return isString(value)
    && /^\S+$/.test(value)
}

export type Uint8 = number

export function isUint8(value: unknown): value is Uint8 {
  return isNumber(value)
    && Number.isInteger(value)
    && value >= 0x00
    && value <= 0xff
}

export type Uint32 = number

export function isUint32(value: unknown): value is Uint32 {
  return isNumber(value)
    && Number.isInteger(value)
    && value >= 0x00000000
    && value <= 0xffffffff
}