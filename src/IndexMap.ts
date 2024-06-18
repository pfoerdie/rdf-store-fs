import { Uint32, Uint8, isUint8, RecursiveRecord, FilterArray, isNull } from './types'

export default class IndexMap<Keys extends [PropertyKey, ...PropertyKey[]], Value extends any> {

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
    for (let k = 0, e = keys.length - 2; k <= e; k++) {
      if (!entry[keys[k]]) return false
      entry = entry[keys[k]] as RecursiveRecord<[PropertyKey], Value>
    }
    return keys[keys.length - 1] in entry
  }

  /**
   * Get the value for specific keys in the IndexMap.
   * @param keys The keys to get their value.
   * @returns The value for the keys in the IndexMap.
   */
  get(...keys: Keys): Value | undefined {
    if (keys.length !== this.#depth) throw new Error('the number of keys must equal the depth')
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    for (let k = 0, e = keys.length - 2; k <= e; k++) {
      if (!entry[keys[k]]) return
      entry = entry[keys[k]] as RecursiveRecord<[PropertyKey], Value>
    }
    return entry[keys[keys.length - 1]]
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
    for (let k = 0, e = keys.length - 2; k <= e; k++) {
      if (!entry[keys[k]]) entry[keys[k]] = Object.create(null)
      entry = entry[keys[k]] as RecursiveRecord<[PropertyKey], Value>
    }
    if (keys[keys.length - 1] in entry) return false
    entry[keys[keys.length - 1]] = value
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
    for (let k = 0, e = keys.length - 2; k <= e; k++) {
      if (!entry[keys[k]]) entry[keys[k]] = Object.create(null)
      entry = entry[keys[k]] as RecursiveRecord<[PropertyKey], Value>
    }
    const existed = keys[keys.length - 1] in entry
    entry[keys[keys.length - 1]] = value
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
    const chain: Array<[RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value>, PropertyKey]> = []
    let entry: RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value> = this.#entries
    for (let k = 0, e = keys.length - 2; k <= e; k++) {
      if (!entry[keys[k]]) return false
      chain.push([entry, keys[k]])
      entry = entry[keys[k]] as RecursiveRecord<[PropertyKey], Value>
    }
    if (!(keys[keys.length - 1] in entry)) return false
    this.#size--
    cleanup: for (let [entry, key] of chain) {
      delete entry[key]
      for (let _ in entry) break cleanup
    }
    return true
  }

  /**
   * Iterate over the entries of the IndexMap with the use of an optional filter.
   * @param filter The filter for the keys, a null as placeholder.
   * @returns An iterator over the matching entries, the keys followed by the value as array.
   */
  * entries(...filter: FilterArray<Keys>): IterableIterator<[...Keys, Value]> {
    if (filter.length > this.#depth) throw new Error('the number of filter keys must not exceed the depth')

    // const keys = new Array(this.#depth)
    // for (let k = 0, e = keys.length - 1; k <= e; k++) { }

    // const temp = new Array(this.#depth) as { [Index in keyof Keys]?: Array<Keys[Index]> }
    // const ind = new Array(this.#depth).fill(0)
    // let k = 0, e = this.#depth - 1

    // const depth = this.#depth
    // const chain: Array<[RecursiveRecord<[PropertyKey, ...PropertyKey[]], Value>, PropertyKey]> = []
    // while (true) {
    //   const index = chain.length
    //   if (index < depth) {
    //     if (isNull(filter[index])) {
    //     } else {
    //     }
    //   }
    // }

    throw new Error('not implemented') // TODO
  }

  // NOTE code from QuadIndex for comparison
  // * entries(key0: PropertyKey, key1: PropertyKey, key2: PropertyKey, key3: PropertyKey) {
  //   const index0 = this.#entries;
  //   const arr0 = key0 ? key0 in index0 ? [key0] : [] : Object.keys(index0);
  //   for (const key0 of arr0) {
  //     const index1 = index0[key0];
  //     const arr1 = key1 ? key1 in index1 ? [key1] : [] : Object.keys(index1);
  //     for (const key1 of arr1) {
  //       const index2 = index1[key1];
  //       const arr2 = key2 ? key2 in index2 ? [key2] : [] : Object.keys(index2);
  //       for (const key2 of arr2) {
  //         const index3 = index2[key2];
  //         const arr3 = key3 ? key3 in index3 ? [key3] : [] : Object.keys(index3);
  //         for (const key3 of arr3) {
  //           yield [key0, key1, key2, key3];
  //         }
  //       }
  //     }
  //   }
  // }

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