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
    expect(Array.from(map.keys())).toEqual([
      [1, 1, 1],
      [1, 1, 2],
      [1, 2, 1], ,
      [2, 1, 1],
      [2, 2, 1],
      [2, 2, 2]
    ])
    expect(Array.from(map.keys(null, 1))).toEqual([
      [1, 1, 1],
      [1, 1, 2],
      [2, 1, 1],
    ])
    expect(Array.from(map.keys(null, null, 2))).toEqual([
      [1, 1, 2],
      [2, 2, 2]
    ])
    expect(Array.from(map.keys(3))).toEqual([
    ])
  })

})