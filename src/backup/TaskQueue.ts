export default class TaskQueue {

  #queue: Array<() => void> = []

  execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const current = () => void task().then(resolve).catch(reject).finally(() => {
        this.#queue.shift()
        const next = this.#queue[0]
        if (next) next()
      })
      this.#queue.push(current)
      if (this.#queue[0] === current) current()
    })
  }

}