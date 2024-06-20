import { Uint32, isUint32 } from './types'

export default class RecursiveMap<Keys extends [any, ...any[]], Value extends any> extends Map<Keys[0], Keys extends [any, ...infer Rest extends [any, ...any[]]] ? RecursiveMap<Rest, Value> : Value> {

  #depth: Uint32 & Keys['length']
  // #size: Uint32

  constructor(depth: Uint32 & Keys['length']) {
    if (!isUint32(depth)) throw new Error('depth must be an Uint32')
    if (depth === 0) throw new Error('depth must not be 0')
    super()
    this.#depth = depth
    // this.#size = 0
  }

  get depth() {
    return this.#depth
  }

  get size(): number {
    if (this.depth === 1) return super.size
    // FIXME inefficient
    return Array.from(this.values()).reduce((sum, child) => sum + (child as RecursiveMap<any, any>).size, 0)
  }

  has<Rest extends any[]>(key: Keys[0], ...rest: Rest): boolean {
    if (rest.length === 0) return super.has(key)
    // FIXME typescript hell
    type RestHead = Rest extends [infer Head, ...any[]] ? Head : never
    type RestRest = Rest extends [any, ...infer Tail] ? Tail : never
    const [restKey, ...restRest] = rest
    return super.has(key) && (super.get(key) as RecursiveMap<[RestHead, ...RestRest], Value>).has(restKey, ...restRest)
  }

  // get(key: Keys[0], ...rest: any[]): RecursiveMap {
  //   if (rest.length === 0) return super.get(key)
  //   return super.has(key) && (super.get(key) as RecursiveMap<any, any>).has(...rest as [any, ...any[]])
  // }

}