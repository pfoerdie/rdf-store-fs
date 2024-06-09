import type {
  Term, NamedNode, BlankNode, Literal, Variable, DefaultGraph,
  Quad, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph
} from './types'

import StorageEngine from './StorageEngine2'

export type StorageTypes = {
  NamedNode: NamedNode
  BlankNode: BlankNode
  Literal: Literal
  Variable: Variable
  DefaultGraph: DefaultGraph
  Quad: Quad
  language: string
}

export interface RDFEngineOptions {
  storageEngine: StorageEngine<StorageTypes>
}

export default class RDFEngine {

  #storageEngine: StorageEngine<StorageTypes>

  constructor(options: RDFEngineOptions) {
    if (!(options?.storageEngine instanceof StorageEngine)) throw new Error('invalid storageEngine')
    this.#storageEngine = options.storageEngine
  }

}