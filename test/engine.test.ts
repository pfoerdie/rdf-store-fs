import StorageEngine from '@/engine'
import { join as joinPath } from 'node:path'

test('develop', async function () {
  const engine = new StorageEngine<{
    'Number': number
    'String': string
    'JSON': any
  }>({
    dataFile: joinPath(__dirname, 'data', 'data.bin'),
    binaryTypes: [{
      type: 'Number',
      byteId: 0x01,
      // @ts-ignore TODO
      parse(bytes: Buffer): number {
        return Number(bytes.toString())
      },
      serialize(value: number): Buffer {
        return Buffer.from(value.toString())
      }
    }, {
      type: 'String',
      byteId: 0x02,
      // @ts-ignore TODO 
      parse(bytes: Buffer): string {
        return bytes.toString()
      },
      serialize(value: string): Buffer {
        return Buffer.from(value)
      }
    }, {
      type: 'JSON',
      byteId: 0x03,
      // @ts-ignore TODO 
      parse(bytes: Buffer): any {
        return JSON.parse(bytes.toString())
      },
      serialize(value: any): Buffer {
        return Buffer.from(JSON.stringify(value))
      }
    }]
  })

  const pos1 = await engine.insertOne('String', 'Hello World!')
  expect(pos1).toBeGreaterThanOrEqual(0)
  const pos2 = await engine.insertOne('JSON', { lorem: 'ipsum' })
  expect(pos2).toBeGreaterThanOrEqual(0)
  const pos3 = await engine.insertOne('Number', NaN)
  expect(pos3).toBeGreaterThanOrEqual(0)

  // await new Promise(resolve => setTimeout(resolve, 100))

  const val1 = await engine.retrieveOne(pos1)
  expect(val1).toBe('Hello World!')
  const val2 = await engine.retrieveOne(pos2)
  expect(val2).toEqual({ lorem: 'ipsum' })
  const val3 = await engine.retrieveOne(pos3)
  expect(val3).toBe(NaN)

  await engine.close()
})