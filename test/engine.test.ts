import StorageEngine from '@/backup/StorageEngine1'
import { join as joinPath } from 'node:path'

test('develop', async function () {
  const engine = new StorageEngine<{
    'Number': number
    'String': string
    'JSON': any
  }>({
    dataFile: joinPath(__dirname, 'data', 'data.bin'),
    binaryTypes: [{
      name: 'Number',
      byte: 0x01,
      // @ts-ignore TODO
      parse(bytes: Buffer): number {
        return Number(bytes.toString())
      },
      serialize(value: number): Buffer {
        return Buffer.from(value.toString())
      }
    }, {
      name: 'String',
      byte: 0x02,
      // @ts-ignore TODO 
      parse(bytes: Buffer): string {
        return bytes.toString()
      },
      serialize(value: string): Buffer {
        return Buffer.from(value)
      }
    }, {
      name: 'JSON',
      byte: 0x03,
      // @ts-ignore TODO 
      parse(bytes: Buffer): any {
        return JSON.parse(bytes.toString())
      },
      serialize(value: any): Buffer {
        return Buffer.from(JSON.stringify(value))
      }
    }]
  })

  const [pos1, pos2, pos3] = await Promise.all([
    engine.insertOne('String', 'Hello World!'),
    engine.insertOne('JSON', { lorem: 'ipsum' }),
    engine.insertOne('Number', NaN)
  ])

  expect(pos1).toBeGreaterThanOrEqual(0)
  expect(pos2).toBeGreaterThanOrEqual(0)
  expect(pos3).toBeGreaterThanOrEqual(0)

  // const values = []
  // for await (const value of await engine.iterate()) {
  //   values.push(value)
  // }
  // console.log(values)

  const [val1, val2, val3] = await Promise.all([
    engine.retrieveOne(pos1),
    engine.retrieveOne(pos2),
    engine.retrieveOne(pos3)
  ])

  expect(val1).toBe('Hello World!')
  expect(val2).toEqual({ lorem: 'ipsum' })
  expect(val3).toBe(NaN)

  await engine.close()
})