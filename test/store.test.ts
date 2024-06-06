import FSStore from '@/store'
import { join as joinPath } from 'node:path'

describe('a filesystem store should', function () {

  test('develop', function () {
    const store = new FSStore({
      dataFile: joinPath(__dirname, 'data', 'rdf-data.bin')
    })
    expect(store).toBeInstanceOf(FSStore)
  })

})