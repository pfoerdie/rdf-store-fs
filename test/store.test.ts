import FSStore from '@/store'
import { join as joinPath } from 'node:path'

describe('a filesystem store should', function () {

    test('be constructed without arguments', function () {
        const store = new FSStore()
        expect(store).toBeInstanceOf(FSStore)
        expect(typeof store.dataFactory).toBe('object')
        expect(typeof store.baseIRI).toBe('string')
        expect(typeof store.basePath).toBe('string')
        expect(store.basePath).toBe(process.cwd())
    })

    test('access the folder at the supplied basePath', async function () {
        const store = new FSStore({
            basePath: joinPath(__dirname, 'data')
        })
        expect(store.basePath).not.toBe(process.cwd())
        // TODO
    })

})