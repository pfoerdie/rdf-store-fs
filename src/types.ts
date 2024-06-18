// import type { EventEmitter } from 'node:events'
// import type { DataFactory, Stream, Quad, NamedNode } from '@rdfjs/types'
import type { Stats as FileStats } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

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

export function isBuffer(value: unknown): value is Buffer {
  return Buffer.isBuffer(value)
}

/** 
 * The DOMString type corresponds to the set of all possible sequences 
 * of 16 bit unsigned integer code units to be interpreted as UTF-16 encoded strings. 
 */
export type DOMString = string

export function isDOMString(value: unknown): value is DOMString {
  return isString(value)
}

/** 
 * The PathString type corresponds to absolute file paths 
 * on the respective system that this node instance is running on.
 */
export type PathString = string

export function isPathString(value: unknown): value is PathString {
  return isString(value) && isAbsolute(value)
}

export type Token = string

export function isToken(value: unknown): value is Token {
  return isString(value)
    && /^\S+$/.test(value)
}

export type Integer = number

export function isInteger(value: unknown): value is Integer {
  return isNumber(value) && Number.isInteger(value)
}

export type Uint8 = Integer

export function isUint8(value: unknown): value is Uint8 {
  return isInteger(value)
    && value >= 0x00
    && value <= 0xff
}

export type Uint16 = Integer

export function isUint16(value: unknown): value is Uint16 {
  return isNumber(value)
    && Number.isInteger(value)
    && value >= 0x0000
    && value <= 0xffff
}

export type Uint32 = Integer

export function isUint32(value: unknown): value is Uint32 {
  return isNumber(value)
    && Number.isInteger(value)
    && value >= 0x00000000
    && value <= 0xffffffff
}

export type { FileStats }

export function isFileStats(value: unknown): value is FileStats {
  return isObject(value)
    && isUint32(value.size)
}

export type { FileHandle }

export function isFileHandle(value: unknown): value is FileHandle {
  return isObject(value)
    && isFunction(value.read)
    && isFunction(value.write)
    && isFunction(value.truncate)
}

export type Awaitable<T> = T | Promise<T>
export type TypeMap<Types = Record<PropertyKey, any>> = Record<keyof Types, any>
export type RecursiveRecord<Keys extends PropertyKey[], Value extends any>
  = Keys extends [infer Head extends PropertyKey, ...infer Tail extends PropertyKey[]] ? Record<Head, RecursiveRecord<Tail, Value>> : Value
export type FilterArray<TargetArray extends unknown[]> = { [Index in keyof TargetArray]?: TargetArray[Index] | null }