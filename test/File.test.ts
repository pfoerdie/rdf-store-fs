import { join, basename } from 'node:path'
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import File from '../src/File'

describe('a File should', function () {

  const TESTDIR = join(__dirname, 'File.test')

  beforeAll(async function () {
    await rm(TESTDIR, { recursive: true, force: true })
    await mkdir(TESTDIR, { recursive: true })
  })

  test('be used with the open method', async function () {
    const TESTFILE = join(TESTDIR, 'example.txt')
    await writeFile(TESTFILE, 'test', { flag: 'wx+' })

    const file = await File.open({
      name: basename(TESTFILE),
      path: TESTFILE
    })

    expect(file).toBeInstanceOf(File)
    expect(file).toMatchObject({
      name: basename(TESTFILE),
      path: TESTFILE,
      size: Buffer.byteLength('test')
    })
  })

  test('create a missing file', async function () {
    const TESTFILE = join(TESTDIR, 'missing.txt')
    await rm(TESTFILE, { force: true })

    const file = await File.open({
      name: basename(TESTFILE),
      path: TESTFILE
    })

    await expect(readFile(TESTFILE, 'utf-8')).resolves.toBe('')
  })

  test('read content at a specific position', async function () {
    const TESTFILE = join(TESTDIR, 'hello.txt')
    await writeFile(TESTFILE, 'Hello World!', { flag: 'wx+' })

    const file = await File.open({
      name: basename(TESTFILE),
      path: TESTFILE
    })

    expect(await file.read(0, 5)).toMatchObject({ position: 0, length: 5 })
    expect((await file.read(0, file.size)).buffer.toString()).toBe('Hello World!')
    await expect(file.read(-1, 0)).rejects.toThrow()
    await expect(file.read(0, 1.5)).rejects.toThrow()
  })

  test('write content at a specific position', async function () {
    const TESTFILE = join(TESTDIR, 'lorem.txt')
    await writeFile(TESTFILE, 'Lorem Ipsum', { flag: 'wx+' })

    const file = await File.open({
      name: basename(TESTFILE),
      path: TESTFILE
    })

    await file.write(0, 'Ipsum')
    await file.write(6, 'Lorem')
    expect(await readFile(TESTFILE, 'utf-8')).toBe('Ipsum Lorem')
    await expect(file.write(-1, 'test')).rejects.toThrow()
  })

  test('append content at the end of the file', async function () {
    const TESTFILE = join(TESTDIR, 'pi.txt')
    await writeFile(TESTFILE, '3', { flag: 'wx+' })

    const file = await File.open({
      name: basename(TESTFILE),
      path: TESTFILE
    })

    await Promise.all([
      file.append('.'),
      file.append('141'),
      file.append('59')
    ])
    expect(await readFile(TESTFILE, 'utf-8')).toBe('3.14159')
  })

  test('clear sections of the file to null bytes', async function () {
    const TESTFILE = join(TESTDIR, 'ones.bin')
    await writeFile(TESTFILE, Buffer.alloc(4, 1), { flag: 'wx+' })

    const file = await File.open({
      name: basename(TESTFILE),
      path: TESTFILE
    })

    await file.clear(1, 2)
    expect(Array.from(await readFile(TESTFILE))).toEqual<number[]>([1, 0, 0, 1])
    await expect(file.clear(3, 2)).rejects.toThrow()
  })

  test('delete bytes at the end of the file', async function () {
    const TESTFILE = join(TESTDIR, 'zeros.bin')
    await writeFile(TESTFILE, Buffer.alloc(20), { flag: 'wx+' })

    const file = await File.open({
      name: basename(TESTFILE),
      path: TESTFILE
    })

    await Promise.all([
      file.delete(4),
      file.delete(6),
      file.delete(8)
    ])
    expect(file.size).toBe(2)
    expect(Array.from(await readFile(TESTFILE))).toEqual<number[]>([0, 0])
    await expect(file.delete(10)).rejects.toThrow()
  })

})