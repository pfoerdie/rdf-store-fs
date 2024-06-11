import { join as joinPath } from 'node:path'
import { readFile, writeFile, mkdir, open as openFile } from 'node:fs/promises'

test('environment', function () {
    console.table({
        'process.cwd()': process.cwd(),
        '__dirname': __dirname,
        '__filename': __filename,
    })
})

test('develop', async function () {
    await mkdir(joinPath(__dirname, 'data'), { recursive: true })

    const filePath = joinPath(__dirname, 'data', 'lorem.txt')
    const fileHandle = await openFile(filePath)

    const stats = await fileHandle.stat()
    expect(stats.size).toBeGreaterThan(1024)
    console.log('stats:', stats)

    const chunks = await Array.fromAsync(fileHandle.createReadStream({
        start: 0,
        highWaterMark: Math.ceil(stats.size / 4),
        autoClose: false
    }))
    expect(chunks.length).toBe(4)
    chunks.forEach(chunks => expect(chunks).toBeInstanceOf(Buffer))
    console.log('chunks:', chunks)

    const content = Buffer.concat(chunks).toString('utf-8')

    const lines = await Array.fromAsync(fileHandle.readLines({
        start: 0,
        autoClose: false
    }))
    expect(lines.length).toBe(content.match(/^/mg).length)
    lines.forEach(line => expect(typeof line).toBe('string'))
    console.log('lines:', lines)

    // const buffers = [Buffer.alloc(1024), Buffer.alloc(1024), Buffer.alloc(1024), Buffer.alloc(1024), Buffer.alloc(1024)]
    // const result = await fileHandle.readv(buffers)
    // console.log(result)

    await fileHandle.close()
})

test('FileHandle', async function() {
console.time('test')
  const filePath = joinPath(__dirname, 'data', 'lorem.txt')

  const fileHandle1 = await openFile(filePath, 'w+')
  setTimeout(() => fileHandle1.close(), 1000)
  const fileHandle2 = await openFile(filePath, 'w+')
  setTimeout(() => fileHandle2.close(), 1000)

  // await fileHandle1.write(Buffer.alloc(2, 0), 0, 2, 0)
  // await fileHandle2.write(Buffer.alloc(2, 1), 0, 2, 1)

  await Promise.all([
    fileHandle1.write(Buffer.alloc(2, 0), 0, 2, 0),
    fileHandle1.write(Buffer.alloc(2, 1), 0, 2, 1)
  ])

  const result = await fileHandle1.read(Buffer.alloc(3), 0, 3, 0)
  const array = Array.from(result.buffer)
  console.log(array)

  console.timeEnd('test')
}, 10e3)