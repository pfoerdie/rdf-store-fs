import type { EventEmitter } from 'node:events'
import type { DataFactory, Stream, Quad, NamedNode } from '@rdfjs/types'

export type * from '@rdfjs/types'

export interface ConstructorOptions {
  /** DataFactory implementation that will be used to create all the Data Model instances. */
  dataFactory?: DataFactory
  /** Base IRI that will be used to resolve or create relative IRIs. */
  baseIRI?: DOMString
}

export type ResultEvents = {
  end: []
  error: [Error]
}

export type ResultEmitter = EventEmitter<ResultEvents>

export type StreamEvents = {
  readable: []
  end: []
  error: [Error]
  data: [Quad]
  prefix: [string, NamedNode]
}

export type QuadStream = EventEmitter<StreamEvents> & Stream<Quad>

export type Awaitable<T> = T | Promise<T>
export type TypeMap<Types = Record<Token, any>> = Record<Token & keyof Types, any>

export function isNull(value: unknown): value is null | undefined {
  return (value ?? null) === null
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}

export function isObject(value: unknown): value is Record<any, any> {
  return !!value && typeof value === 'object'
}

/** 
 * The DOMString type corresponds to the set of all possible sequences 
 * of 16 bit unsigned integer code units to be interpreted as UTF-16 encoded strings. 
 */
export type DOMString = string

/** 
 * The PathString type corresponds to file paths on the respective system 
 * that this node instance is running on.
 */
export type PathString = string

export function isPathString(value: unknown): value is PathString {
  return isString(value)
}

export type Token = string

export function isToken(value: unknown): value is Token {
  return isString(value)
    && /^\S+$/.test(value)
}

export type FileEnding = `.${string}`

export function isFileEnding(value: unknown): value is FileEnding {
  return isString(value)
    && /^\.\w+$/.test(value)
}

export type Byte = number

export function isByte(value: unknown): value is Byte {
  return isNumber(value)
    && Number.isInteger(value)
    && value >= 0x00
    && value <= 0xff
}

export type Position = number

export function isPosition(value: unknown): value is Position {
  return isNumber(value)
    && Number.isInteger(value)
    && value >= 0x00000000
    && value <= 0xffffffff
}

export type ByteSize = number

export function isByteSize(value: unknown): value is ByteSize {
  return isNumber(value)
    && Number.isInteger(value)
    && value >= 0x00000000
    && value <= 0xffffffff
}

export type Data = Object | null

export function isData(value: unknown): value is Data {
  return value !== undefined
}