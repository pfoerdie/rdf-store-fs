import TaskQueue from '../src/TaskQueue'

describe('a TaskQueue should', function () {

  test('be constructed without arguments', function () {
    const queue = new TaskQueue()
    expect(queue).toBeInstanceOf(TaskQueue)
  })

  test('to execute an async callback and return its result', async function () {
    const queue = new TaskQueue()
    await expect(queue.execute(() => Promise.resolve('Hello World!'))).resolves.toBe('Hello World!')
  })

  test('execute the tasks in order and wait until each task is finished', async function () {
    const queue = new TaskQueue()
    const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    let step = 0
    const promise1 = queue.execute(async () => {
      await pause(200)
      expect(step).toBe(0)
      step = 1
      return 'one'
    })
    const promise2 = queue.execute(async () => {
      await pause(500)
      expect(step).toBe(1)
      step = 2
      return 'two'
    })
    const promise3 = queue.execute(async () => {
      await pause(40)
      expect(step).toBe(2)
      step = 3
      return 'three'
    })
    const promise4 = queue.execute(async () => {
      await pause(300)
      expect(step).toBe(3)
      step = 4
      return 'four'
    })
    const results = await Promise.all([promise1, promise2, promise3, promise4])
    expect(results).toMatchObject<string[]>(['one', 'two', 'three', 'four'])
  })

})