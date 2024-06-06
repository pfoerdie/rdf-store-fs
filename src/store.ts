import type {
  Store, DataFactory, ConstructorOptions, QuadStream, ResultEmitter, DOMString, PathString,
  Term, NamedNode, BlankNode, Literal, Variable, DefaultGraph,
  Quad, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph
} from './types'
import defaultDataFactory from '@rdfjs/data-model'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import StorageEngine, { type BinaryType } from './engine'

interface FSStoreOptions extends ConstructorOptions {
  dataFile: PathString
}

type StorageTypes = {
  NamedNode: NamedNode
  BlankNode: BlankNode
  Literal: Literal
  Variable: Variable
  DefaultGraph: DefaultGraph
  Quad: Quad
  language: string
}

export default class FSStore implements Store {

  #dataFactory: DataFactory
  #baseIRI: DOMString
  #storageEngine: StorageEngine<StorageTypes>

  constructor(options: FSStoreOptions) {
    const dataFactory: DataFactory = this.#dataFactory = options?.dataFactory ?? defaultDataFactory
    this.#baseIRI = options?.baseIRI ?? ''
    this.#storageEngine = new StorageEngine({
      dataFile: options.dataFile,
      binaryTypes: [{
        type: 'NamedNode',
        byteId: 0x01,
        parse: (bytes) => dataFactory.namedNode(bytes.toString()),
        serialize: (namedNode) => Buffer.from(namedNode.value)
      }, {
        type: 'BlankNode',
        byteId: 0x02,
        // TODO guarantee for the uniqueness and belonging of blank nodes
        parse: (bytes) => dataFactory.blankNode(bytes.toString()),
        serialize: (blankNode) => Buffer.from(blankNode.value)
      }, {
        type: 'Literal',
        byteId: 0x03,
        async parse(bytes) {
          const langOrDtPos = bytes.readUint8(0)
          const langOrDt = await this.retrieveOne(langOrDtPos) as string | NamedNode
          return dataFactory.literal(bytes.toString('utf-8', 1), langOrDt)
        },
        async serialize(literal) {
          const languageOrDatatype = literal.language || literal.datatype
          const languageOrDatatypePos = await this.insertOne(typeof languageOrDatatype === 'string' ? 'language' : 'NamedNode', languageOrDatatype)
          return Buffer.concat([Buffer.of(languageOrDatatypePos), Buffer.from(literal.value)])
        }
      }, {
        type: 'Variable',
        byteId: 0x04,
        parse: (bytes) => dataFactory.variable ? dataFactory.variable(bytes.toString()) : defaultDataFactory.variable(bytes.toString()),
        serialize: (variable) => Buffer.from(variable.value)
      }, {
        type: 'DefaultGraph',
        byteId: 0x05,
        parse: () => dataFactory.defaultGraph(),
        serialize: () => Buffer.alloc(0)
      }, {
        type: 'Quad',
        byteId: 0x06,
        async parse(bytes) {
          const positions = [bytes.readUint8(0), bytes.readUint8(1), bytes.readUint8(2), bytes.readUint8(3)]
          const [subject, predicate, object, graph] = await this.retrieveMany(positions) as [Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph]
          return dataFactory.quad(subject, predicate, object, graph)
        },
        async serialize(quad) {
          const positions = await this.insertMany([
            { type: quad.subject.termType, value: quad.subject },
            { type: quad.predicate.termType, value: quad.predicate },
            { type: quad.object.termType, value: quad.object },
            { type: quad.graph.termType, value: quad.graph }
          ])
          return Buffer.of(...positions)
        }
      }, {
        type: 'language',
        byteId: 0x07,
        parse: (bytes) => bytes.toString(),
        serialize: (language) => Buffer.from(language)
      }]
    })
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
      // .on('prefix', (prefix, iri) => void 0) // TODO optionally process prefixes
      .on('data', (quad) => void 0) // TODO process data import
      .on('error', (err) => emitter.emit('error', err)) // TODO data cleanup on error
      .on('end', () => emitter.emit('end')) // TODO  wait for processes to finish

    return emitter
  }

  remove(stream: QuadStream): ResultEmitter {
    const emitter: ResultEmitter = new EventEmitter()

    stream
      // .on('prefix', (prefix, iri) => void 0) // TODO optionally process prefixes
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