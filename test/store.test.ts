import FSStore from '@/store'
import { join as joinPath } from 'node:path'
import { createReadStream } from 'node:fs'
import { EventEmitter } from 'node:events'
import rdfParser from 'rdf-parse'
import rdfSerializer from 'rdf-serialize'
import { Quad, QuadStream } from '@/types'

type Stream<T> = EventEmitter<{ data: [T], error: [Error], end: [] }>

function promifyStream<T>(stream: Stream<T>): Promise<Array<T>> {
  const chunks: Array<T> = []
  return new Promise((resolve, reject) => stream
    .on('data', (chunk: T) => chunks.push(chunk))
    .on('error', (err: Error) => reject(err))
    .on('end', () => resolve(chunks)))
}

describe('a filesystem store should', function () {

  test('develop', async function () {
    const store = new FSStore({
      dataFile: joinPath(__dirname, 'data', 'rdf-data.bin')
    })
    expect(store).toBeInstanceOf(FSStore)
    const binaryStream = createReadStream(joinPath(__dirname, 'data', 'data.ttl'))
    const quadStream = rdfParser.parse(binaryStream, { contentType: 'text/turtle' })
    // @ts-ignore
    await promifyStream(store.import(quadStream as QuadStream))

    const quads = await promifyStream(store.match(null, null, null, null) as Stream<Quad>)
    expect(quads.length).toBeGreaterThan(0)
    console.log(quads)
  }, 60e3)

})