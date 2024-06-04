import type { Store, DataFactory, ConstructorOptions, DOMString, PathString, QuadStream, ResultEmitter, Term, Quad_Graph } from './types'
import dataFactory from '@rdfjs/data-model'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'

interface FSStoreOptions extends ConstructorOptions {
    /** Base path that will be used to resolve file paths. */
    basePath?: PathString
}

export default class FSStore implements Store {

    #dataFactory: DataFactory
    #baseIRI: DOMString
    #basePath: PathString

    constructor(options?: FSStoreOptions) {
        this.#dataFactory = options?.dataFactory ?? dataFactory
        this.#baseIRI = options?.baseIRI ?? ''
        this.#basePath = options?.basePath ?? process.cwd()
    }

    match(subject?: Term | null, predicate?: Term | null, object?: Term | null, graph?: Term | null): QuadStream {
        const stream: QuadStream = new Readable({
            objectMode: true
            // TODO implement connection to system resources
        }) as EventEmitter as QuadStream

        return stream
    }

    import(stream: QuadStream): ResultEmitter {
        const emitter: ResultEmitter = new EventEmitter()

        stream
            .on('prefix', (prefix, iri) => void 0) // TODO optionally process prefixes
            .on('data', (quad) => void 0) // TODO process data import
            .on('error', (err) => emitter.emit('error', err)) // TODO data cleanup on error
            .on('end', () => emitter.emit('end')) // TODO  wait for processes to finish

        return emitter
    }

    remove(stream: QuadStream): ResultEmitter {
        const emitter: ResultEmitter = new EventEmitter()

        stream
            .on('prefix', (prefix, iri) => void 0) // TODO optionally process prefixes
            .on('data', (quad) => void 0) // TODO process data removal
            .on('error', (err) => emitter.emit('error', err)) // TODO data cleanup on error
            .on('end', () => emitter.emit('end')) // TODO  wait for processes to finish

        return emitter
    }

    removeMatches(subject?: Term | null, predicate?: Term | null, object?: Term | null, graph?: Term | null): ResultEmitter {
        const emitter: ResultEmitter = new EventEmitter()

        // TODO implement connection to system resources

        return emitter
    }

    deleteGraph(graph: string | Quad_Graph): ResultEmitter {
        const emitter: ResultEmitter = new EventEmitter()

        // TODO implement connection to system resources

        return emitter
    }

}