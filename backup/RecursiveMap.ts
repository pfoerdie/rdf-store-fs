import { Uint32, isUint32 } from './types'

type Head<A extends any[]> = A extends [infer R extends any, ...any[]] ? R : never
type Tail<A extends any[]> = A extends [any, ...infer T extends any[]] ? T : never
// type Nonempty<A extends any[]> = A extends [any, ...any[]] ? A : never
type Nonempty<A extends any[]> = A['length'] extends 0 ? never : A
// type Reduce<A extends any[], B extends any[]> = A extends [any, ...infer AR] ? B extends [any, ...infer BR] ? Reduce<AR, BR> : A : A
type Reduce<A extends any[], B extends any[]> = A extends [] ? A : B extends [] ? A : Reduce<Tail<A>, Tail<B>>

export default class RecursiveMap<Keys extends Nonempty<any[]>, Value extends any> extends Map<Head<Keys>, Tail<Keys> extends Nonempty<any[]> ? RecursiveMap<Tail<Keys>, Value> : Value> {

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

  has<Search extends any[]>(...search: Search): boolean {
    if (search.length === 0) throw new Error('the search must contain at least one key')
    if (search.length > this.depth) throw new Error('the search must not exceed the depth')
    if (search.length === 1) return super.has(search[0])
    const child = super.get(search[0]) as RecursiveMap<Tail<Keys>, Value>
    return !!child && child.has(...search.slice(1))
  }

  get<Search extends any[]>(...search: Search): (Reduce<Keys, Search> extends [] ? Value : RecursiveMap<Reduce<Keys, Search>, Value>) | undefined {
    if (search.length === 0) throw new Error('the search must contain at least one key')
    if (search.length > this.depth) throw new Error('the search must not exceed the depth')
    if (search.length === 1) return super.get(search[0])
    const child = super.get(search[0]) as RecursiveMap<Tail<Keys>, Value>
    return child && child.get(...search.slice(1))
  }

  // get(key: Keys[0], ...rest: any[]): RecursiveMap {
  //   if (rest.length === 0) return super.get(key)
  //   return super.has(key) && (super.get(key) as RecursiveMap<any, any>).has(...rest as [any, ...any[]])
  // }

}