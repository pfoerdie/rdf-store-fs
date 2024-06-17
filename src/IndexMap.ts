import { FixedArray, Uint8, isUint8, Uint32 } from './types'
import { Subtract } from 'ts-arithmetic'

type RecursiveRecord<Depth extends Uint8, Key extends PropertyKey, Value extends any>
  = Record<Key, Depth extends 1 ? Value : RecursiveRecord<Subtract<Depth, 1>, Key, Value>>

export default class IndexMap<Depth extends Uint8, Key extends PropertyKey, Value extends any> {

  #depth: Depth
  #size: Uint32
  #entries: RecursiveRecord<Depth, Key, Value>

  /**
   * An IndexMap that can store entries of key value pairs.
   * The keys must be numbers or strings and the values can be anything.
   * @param depth The number of keys necessary for this IndexMap instance.
   */
  constructor(depth: Depth) {
    if (!isUint8(depth) || depth === 0x00) throw new Error('depth must be an Uint8')
    if (depth === 0x00) throw new Error('depth must not be 0x00')
    this.#depth = depth
    this.#size = 0
    this.#entries = Object.create(null)
  }

  /**
   * The number of keys that are necessary for each entry.
   */
  get depth(): Depth {
    return this.#depth
  }

  /**
   * The number of entries in the IndexMap.
   */
  get size(): Uint32 {
    return this.#size
  }

  /**
   * Detect whether the keys already exist in the IndexMap.
   * @param keys The keys to check their existence.
   * @returns The existence of the keys in the IndexMap.
   */
  has(...keys: FixedArray<Depth, Key>): boolean {
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    let target: Value | RecursiveRecord<Uint8, Key, Value> = this.#entries
    for (let key of keys as Array<Key>) {
      if (!(key in target)) return false
      target = target[key]
    }
    return true
  }

  /**
   * Get the value for specific keys in the IndexMap.
   * @param keys The keys to get their value.
   * @returns The value for the keys in the IndexMap.
   */
  get(...keys: FixedArray<Depth, Key>): Value | undefined {
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    let target: Value | RecursiveRecord<Uint8, Key, Value> = this.#entries
    for (let key of keys as Array<Key>) {
      if (!(key in target)) return
      target = target[key]
    }
    return target as Value
  }

  /**
   * Add a value to the IndexMap without overwriting it.
   * @param keys The keys to insert the value at.
   * @param value The value to insert at those keys, if not already existing.
   * @returns True if the keys have not existed yet and have been added.
   */
  add(...keys: [...FixedArray<Depth, Key>, Value]): boolean {
    const value = keys.pop() as Value
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    if (typeof value === 'undefined') throw new Error('the value must not be undefined')
    const lastKey = keys.pop() as Key
    let target: RecursiveRecord<Uint8, Key, Value> = this.#entries
    for (let key of keys as Array<Key>) {
      if (!(key in target)) target[key] = Object.create(null)
      target = target[key]
    }
    const lastEntry: RecursiveRecord<1, Key, Value> = target
    if (lastKey in lastEntry) return false
    lastEntry[lastKey] = value
    this.#size++
    return true
  }

  /**
   * Set a value in the IndexMap and overwrite it if necessary.
   * @param keys The keys to insert the value at.
   * @param value The value to insert at those keys, override if necessary.
   * @returns True if the keys already existed and had to be overriden.
   */
  set(...keys: [...FixedArray<Depth, Key>, Value]): boolean {
    const value = keys.pop() as Value
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    if (typeof value === 'undefined') throw new Error('the value must not be undefined')
    const lastKey = keys.pop() as Key
    let target: RecursiveRecord<Uint8, Key, Value> = this.#entries
    for (let key of keys as Array<Key>) {
      if (!(key in target)) target[key] = Object.create(null)
      target = target[key]
    }
    const lastEntry: RecursiveRecord<1, Key, Value> = target
    const existed = (lastKey in lastEntry)
    lastEntry[lastKey] = value
    if (!existed) this.#size++
    return existed
  }

  /**
   * Delete the keys at their value in the IndexMap.
   * @param keys The keys to delete the value at.
   * @returns True if the keys existed and the value had been deleted.
   */
  delete(...keys: FixedArray<Depth, Key>) {
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    const chain: Array<[RecursiveRecord<Uint8, Key, Value>, Key]> = []
    let target: RecursiveRecord<Uint8, Key, Value> = this.#entries
    for (let key of keys as Array<Key>) {
      if (!(key in target)) return false
      chain.unshift([target, key])
      target = target[key]
    }
    this.#size--
    cleanup: for (let [target, key] of chain) {
      delete target[key]
      for (let otherKey in target) break cleanup
    }
    return true
  }

  /**
   * Iterate over the entries of the IndexMap with the use of an optional filter.
   * @param filter The filter for the keys, a null as placeholder.
   * @returns An iterator over the matching entries, the value followed by the keys as array.
   */
  * entries(...filter: FixedArray<Depth, Key | null | undefined>): Iterator<[Value, ...FixedArray<Depth, Key>]> {
    throw new Error('not implemented') // TODO
  }

  /**
   * Iterate over the keys of the IndexMap with the use of an optional filter.
   * @param filter The filter for the keys, a null as placeholder.
   * @returns An iterator over the matching keys as array.
   */
  * keys(...filter: FixedArray<Depth, Key | null | undefined>): Iterator<FixedArray<Depth, Key>> {
    throw new Error('not implemented') // TODO
  }

  /**
   * Iterate over the values of the IndexMap with the use of an optional filter.
   * @param filter The filter for the keys, a null as placeholder.
   * @returns An iterator over the matching values.
   */
  * values(...filter: FixedArray<Depth, Key | null | undefined>): Iterator<Value> {
    throw new Error('not implemented') // TODO
  }

} 