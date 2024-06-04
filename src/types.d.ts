import { EventEmitter } from 'node:events'
import { Stream, Quad, NamedNode } from '@rdfjs/types'

export * from '@rdfjs/types'

/** 
 * The DOMString type corresponds to the set of all possible sequences 
 * of 16 bit unsigned integer code units to be interpreted as UTF-16 encoded strings. 
 */
export type DOMString = string

export interface ConstructorOptions {
    /** DataFactory implementation that will be used to create all the Data Model instances. */
    dataFactory?: DataFactory
    /** Base IRI that will be used to resolve or create relative IRIs. */
    baseIRI?: DOMString
}

/** 
 * The PathString type corresponds to file paths on the respective system 
 * that this node instance is running on.
 */
export type PathString = string

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