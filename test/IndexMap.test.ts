import IndexMap from '../src/IndexMap'

describe('an IndexMap should', function () {

  test('iterate over its entries', function () {
    const map = new IndexMap<[number, number, number], null>(3)
    map.add(1, 1, 1, null)
    map.add(1, 1, 2, null)
    map.add(1, 2, 1, null)
    map.add(2, 1, 1, null)
    map.add(2, 2, 1, null)
    map.add(2, 2, 2, null)

    // FIXME the keys returned might be strings, because numbers will be stringified on records
    const toArrays = (iterator: IterableIterator<Array<string | number>>): Array<Array<string | number>> => Array.from(iterator)
    const toNumberArrays = (iterator: IterableIterator<Array<string | number>>): Array<Array<number>> => Array.from(iterator).map(keys => keys.map(Number))

    expect(toNumberArrays(map.keys())).toStrictEqual([
      [1, 1, 1],
      [1, 1, 2],
      [1, 2, 1],
      [2, 1, 1],
      [2, 2, 1],
      [2, 2, 2]
    ])
    expect(toNumberArrays(map.keys(null, 1))).toStrictEqual([
      [1, 1, 1],
      [1, 1, 2],
      [2, 1, 1],
    ])
    expect(toNumberArrays(map.keys(null, null, 2))).toStrictEqual([
      [1, 1, 2],
      [2, 2, 2]
    ])
    expect(toNumberArrays(map.keys(3))).toStrictEqual([
    ])
  })

})