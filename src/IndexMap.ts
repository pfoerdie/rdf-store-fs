import { Uint32, Uint8, isUint8, RecursiveRecord, FilterArray, isNull } from './types'

export default class IndexMap<Keys extends [PropertyKey, ...PropertyKey[]], Value extends any> {

  // TODO rewrite to use recursive maps instead of records, to preserve the original keys

  #depth: Uint8 & Keys['length']
  #size: Uint32
  #entries: RecursiveRecord<Keys, Value>

  /**
   * An IndexMap that can store entries of key value pairs.
   * The keys must be numbers or strings and the values can be anything.
   * @param depth The number of keys necessary for this IndexMap instance.
   */
  constructor(depth: Uint8 & Keys['length']) {
    if (!isUint8(depth) || depth === 0x00) throw new Error('depth must be an Uint8')
    if (depth === 0x00) throw new Error('depth must not be 0x00')
    this.#depth = depth
    this.#size = 0
    this.#entries = Object.create(null)
  }

  /**
   * The number of keys that are necessary for each entry.
   */
  get depth(): Uint8 & Keys['length'] {
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
  has(...keys: Keys): boolean {
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    let key: PropertyKey
    const max = this.#depth - 2
    for (let index = 0; index <= max; index++) {
      key = keys[index]
      if (!entry[key]) return false
      entry = entry[key] as RecursiveRecord<[PropertyKey], Value>
    }
    key = keys[keys.length - 1]
    return key in entry
  }

  /**
   * Get the value for specific keys in the IndexMap.
   * @param keys The keys to get their value.
   * @returns The value for the keys in the IndexMap.
   */
  get(...keys: Keys): Value | undefined {
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    let key: PropertyKey
    const max = this.#depth - 2
    for (let index = 0; index <= max; index++) {
      key = keys[index]
      if (!entry[key]) return
      entry = entry[key] as RecursiveRecord<[PropertyKey], Value>
    }
    key = keys[keys.length - 1]
    return entry[key]
  }

  /**
   * Add a value to the IndexMap without overwriting it.
   * @param keys The keys to insert the value at.
   * @param value The value to insert at those keys, if not already existing.
   * @returns True if the keys have not existed yet and have been added.
   */
  add(...args: [...Keys, Value]): boolean {
    const keys = args.slice(0, -1) as Keys
    const value = args.at(-1) as Value
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    if (typeof value === 'undefined') throw new Error('the value must not be undefined')
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    let key: PropertyKey
    const max = this.#depth - 2
    for (let index = 0; index <= max; index++) {
      key = keys[index]
      if (!entry[key]) entry[key] = Object.create(null)
      entry = entry[key] as RecursiveRecord<[PropertyKey], Value>
    }
    key = keys[keys.length - 1]
    if (key in entry) return false
    entry[key] = value
    this.#size++
    return true
  }

  /**
   * Set a value in the IndexMap and overwrite it if necessary.
   * @param keys The keys to insert the value at.
   * @param value The value to insert at those keys, override if necessary.
   * @returns True if the keys already existed and had to be overriden.
   */
  set(...args: [...Keys, Value]): boolean {
    const keys = args.slice(0, -1) as Keys
    const value = args.at(-1) as Value
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    if (typeof value === 'undefined') throw new Error('the value must not be undefined')
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    let key: PropertyKey
    const max = this.#depth - 2
    for (let index = 0; index <= max; index++) {
      key = keys[index]
      if (!entry[key]) entry[key] = Object.create(null)
      entry = entry[key] as RecursiveRecord<[PropertyKey], Value>
    }
    key = keys[keys.length - 1]
    const existed = key in entry
    entry[key] = value
    if (!existed) this.#size++
    return existed
  }

  /**
   * Delete the keys at their value in the IndexMap.
   * @param keys The keys to delete the value at.
   * @returns True if the keys existed and the value had been deleted.
   */
  delete(...keys: Keys) {
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    let key: PropertyKey
    const max = this.#depth - 2
    const chain: Array<[RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value>, PropertyKey] | undefined> = new Array(max)
    for (let index = 0; index <= max; index++) {
      key = keys[index]
      if (!entry[key]) return false
      chain[index] = [entry, key]
      entry = entry[key] as RecursiveRecord<[PropertyKey], Value>
    }
    key = keys[keys.length - 1]
    if (!(key in entry)) return false
    this.#size--
    delete entry[key]
    cleanup: for (let index = max; index >= 0; index--) {
      for (let _ in entry) break cleanup
      entry = (chain[index] as any[])[0]
      key = (chain[index] as any[])[1]
      // [entry, key] = chain[index]
      delete entry[key]
    }
    return true
  }

  /**
   * Iterate over the entries of the IndexMap with the use of an optional filter.
   * @param filter The filter for the keys, a null as placeholder.
   * @returns An iterator over the matching entries, the keys followed by the value as array.
   */
  entries(...filter: FilterArray<Keys>): IterableIterator<[...Keys, Value]> {
    if (filter.length > this.#depth) throw new Error('the number of filter keys must not exceed the depth')

    function* extractEntries<Keys extends [PropertyKey, ...PropertyKey[]]>(entry: RecursiveRecord<Keys, Value>, filter: FilterArray<Keys>, depth: Keys['length']): IterableIterator<[...Keys, Value]> {
      const [filterKey, ...restFilter] = filter
      const keys = isNull(filterKey) ? Object.keys(entry) : (filterKey in entry) ? [filterKey] : []
      for (let key of keys) {
        if (depth > 1) {
          type FirstKey = Keys extends [infer First extends PropertyKey, ...PropertyKey[]] ? First : never
          type RestKeys = Keys extends [PropertyKey, ...infer Rest extends [PropertyKey, ...PropertyKey[]]] ? Rest : never
          for (let args of extractEntries(entry[key] as RecursiveRecord<RestKeys, Value>, restFilter as FilterArray<RestKeys>, depth - 1)) {
            yield [key, ...args] as [FirstKey, ...RestKeys, Value] as [...unknown[]] as [...Keys, Value]
          }
        } else {
          type LastKey = Keys extends [infer First extends PropertyKey] ? First : never
          const value = entry[key] as Value
          yield [key, value] as [LastKey, Value] as [...unknown[]] as [...Keys, Value]
        }
      }
    }

    return extractEntries(this.#entries, filter, this.#depth)
  }

  *entries_2(...filter: FilterArray<Keys>): IterableIterator<[...Keys, Value]> {
    // TODO pick one algorithm
    if (filter.length > this.#depth) throw new Error('the number of filter keys must not exceed the depth')
    const keys: Keys = new Array(this.#depth) as Keys
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    let options: PropertyKey[]
    const max = this.#depth - 2
    const chain: Array<[RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value>, PropertyKey[]] | null | undefined> = new Array(max)
    let index = 0
    while (index >= 0) {
      if (index <= max) {
        if (chain[index]) {
          entry = (chain[index] as any[])[0]
          options = (chain[index] as any[])[1]
        } else {
          options = isNull(filter[index]) ? Object.keys(entry) : ((filter[index] as PropertyKey) in entry) ? [filter[index] as PropertyKey] : []
          chain[index] = [entry, options]
        }
        if (options.length > 0) {
          const key = options.shift() as PropertyKey
          keys[index] = key
          entry = entry[key] as RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value>
          index++
        } else {
          chain[index] = null
          index--
        }
      } else {
        options = isNull(filter[index]) ? Object.keys(entry) : ((filter[index] as PropertyKey) in entry) ? [filter[index] as PropertyKey] : []
        for (let key of options) {
          keys[index] = key
          const value = entry[key] as Value
          yield [...keys, value]
        }
        index--
      }
    }
  }

  /**
   * Iterate over the keys of the IndexMap with the use of an optional filter.
   * @param filter The filter for the keys, a null as placeholder.
   * @returns An iterator over the matching keys as array.
   */
  * keys(...filter: FilterArray<Keys>): IterableIterator<Keys> {
    if (filter.length > this.#depth) throw new Error('the number of filter keys must not exceed the depth')
    // TODO do not use .entries()
    for (let args of this.entries(...filter)) {
      yield args.slice(0, -1) as Keys
    }
  }

  * keys_2(...filter: FilterArray<Keys>): IterableIterator<Keys> {
    // TODO pick one algorithm
    if (filter.length > this.#depth) throw new Error('the number of filter keys must not exceed the depth')
    // TODO do not use .entries()
    for (let args of this.entries_2(...filter)) {
      yield args.slice(0, -1) as Keys
    }
  }

  /**
   * Iterate over the values of the IndexMap with the use of an optional filter.
   * @param filter The filter for the keys, a null as placeholder.
   * @returns An iterator over the matching values.
   */
  * values(...filter: FilterArray<Keys>): IterableIterator<Value> {
    if (filter.length > this.#depth) throw new Error('the number of filter keys must not exceed the depth')
    // TODO do not use .entries()
    for (let args of this.entries(...filter)) {
      yield args.at(-1) as Value
    }
  }

} 