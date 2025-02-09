export class SortedQueue<T> {
  private readonly sortedByMinimumFirst: T[] = []

  constructor(private sortBy: (el: T) => number) {}

  get length(): number {
    return this.sortedByMinimumFirst.length
  }

  get elements(): T[] {
    return [...this.sortedByMinimumFirst]
  }

  enqueue(el: T): void {
    const last = this.sortedByMinimumFirst.at(-1)
    if (!last || this.sortBy(last) <= this.sortBy(el)) {
      this.sortedByMinimumFirst.push(el)
      return
    }

    for (let i = this.sortedByMinimumFirst.length - 1; i >= 0; i--) {
      if (this.sortBy(this.sortedByMinimumFirst[i]) <= this.sortBy(el)) {
        this.sortedByMinimumFirst.splice(i + 1, 0, el)
        return
      }
    }

    this.sortedByMinimumFirst.unshift(el)
  }

  removeMinimum(): T | undefined {
    return this.sortedByMinimumFirst.shift()
  }
}
