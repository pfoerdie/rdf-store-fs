import { join, basename } from 'node:path'
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import FileManager from '../src/FileManager'

describe('a FileManager should', function () {

  const TESTDIR = join(__dirname, 'FileManager.test')

  beforeAll(async function () {
    await rm(TESTDIR, { recursive: true, force: true })
  })

  test('be constructed with a root directory', function () {
    const manager = new FileManager({
      root: TESTDIR
    })
    expect(manager).toBeInstanceOf(FileManager)
    expect(manager).toMatchObject({
      root: TESTDIR,
      extension: null
    })
  })

  test('open files with a predefined extension', async function () {
    const manager = new FileManager({
      root: TESTDIR,
      extension: 'txt'
    })
    const file = await manager.open('test')
    expect(file).toMatchObject({
      name: 'test',
      path: join(TESTDIR, 'test.txt')
    })
  })

})