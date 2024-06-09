import type {
  Store, DataFactory, ConstructorOptions, QuadStream, ResultEmitter, DOMString, PathString,
  Term, NamedNode, BlankNode, Literal, Variable, DefaultGraph,
  Quad, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph
} from './types'
import defaultDataFactory from '@rdfjs/data-model'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import StorageEngine from './StorageEngine1'

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
    const storageEngine: StorageEngine<StorageTypes> = this.#storageEngine = new StorageEngine({
      dataFile: options.dataFile,
      binaryTypes: [{
        name: 'NamedNode',
        byte: 0x01,
        parse: (bytes) => dataFactory.namedNode(bytes.toString()),
        serialize: (namedNode) => Buffer.from(namedNode.value)
      }, {
        name: 'BlankNode',
        byte: 0x02,
        // TODO guarantee for the uniqueness and belonging of blank nodes
        parse: (bytes) => dataFactory.blankNode(bytes.toString()),
        serialize: (blankNode) => Buffer.from(blankNode.value)
      }, {
        name: 'Literal',
        byte: 0x03,
        async parse(bytes) {
          const langOrDtPos = bytes.readUint8(0)
          const langOrDt = await storageEngine.retrieveOne(langOrDtPos) as string | NamedNode
          return dataFactory.literal(bytes.toString('utf-8', 1), langOrDt)
        },
        async serialize(literal) {
          const languageOrDatatype = literal.language || literal.datatype
          const languageOrDatatypePos = await storageEngine.insertOne(typeof languageOrDatatype === 'string' ? 'language' : 'NamedNode', languageOrDatatype)
          return Buffer.concat([Buffer.of(languageOrDatatypePos), Buffer.from(literal.value)])
        }
      }, {
        name: 'Variable',
        byte: 0x04,
        parse: (bytes) => dataFactory.variable ? dataFactory.variable(bytes.toString()) : defaultDataFactory.variable(bytes.toString()),
        serialize: (variable) => Buffer.from(variable.value)
      }, {
        name: 'DefaultGraph',
        byte: 0x05,
        parse: () => dataFactory.defaultGraph(),
        serialize: () => Buffer.alloc(0)
      }, {
        name: 'Quad',
        byte: 0x06,
        async parse(bytes) {
          const positions = [bytes.readUint8(0), bytes.readUint8(1), bytes.readUint8(2), bytes.readUint8(3)]
          const [subject, predicate, object, graph] = await storageEngine.retrieveMany(positions) as [Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph]
          return dataFactory.quad(subject, predicate, object, graph)
        },
        async serialize(quad) {
          const positions = await storageEngine.insertMany([
            { type: quad.subject.termType, data: quad.subject },
            { type: quad.predicate.termType, data: quad.predicate },
            { type: quad.object.termType, data: quad.object },
            { type: quad.graph.termType, data: quad.graph }
          ])
          return Buffer.of(...positions)
        }
      }, {
        name: 'language',
        byte: 0x07,
        parse: (bytes) => bytes.toString(),
        serialize: (language) => Buffer.from(language)
      }]
    })
  }

  match(subject?: Term | null, predicate?: Term | null, object?: Term | null, graph?: Term | null): QuadStream {
    const stream = new Readable({
      objectMode: true,
      read: () => {
        this.#storageEngine.findMany('Quad', (quad) => {
          return (!subject || quad.subject.equals(subject))
            && (!predicate || quad.predicate.equals(predicate))
            && (!object || quad.object.equals(object))
            && (!graph || quad.graph.equals(graph))
        }).then((quads) => {
          quads.forEach(quad => stream.push(quad))
        }).catch(err => stream.destroy(err))
      }
    })

    return stream as EventEmitter as QuadStream
  }

  import(stream: QuadStream): ResultEmitter {
    const emitter: ResultEmitter = new EventEmitter()

    // stream
    //   // .on('prefix', (prefix, iri) => void 0) // TODO optionally process prefixes
    //   .on('data', (quad) => void 0) // TODO process data import
    //   .on('error', (err) => emitter.emit('error', err)) // TODO data cleanup on error
    //   .on('end', () => emitter.emit('end')) // TODO  wait for processes to finish

    const quads: Array<Quad> = []
    stream
      .on('data', (quad) => quads.push(quad))
      .on('error', (err) => emitter.emit('error', err))
      .on('end', () => this.#storageEngine.insertMany(quads.map(quad => ({ type: quad.termType, data: quad })))
        .then(() => emitter.emit('end')).catch(err => emitter.emit('error', err)))

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