import File from '../src/File'
import { join as joinPath } from 'node:path'

test('develop', async function () {
  const test = await File.open({
    name: 'Test',
    path: joinPath(__dirname, 'data', 'example.txt')
  })

  console.table({
    size: test.size,
    value: '' + await test.read(0, test.size)
  })

  // await test.write(0, 'Hello World!')
  // await test.write(6, 'Hello World!')
  await test.write(12, 'Hello World!')

  console.table({
    size: test.size,
    value: '' + await test.read(0, test.size)
  })

  await test.close()
})