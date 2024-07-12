import * as u from '@jsmanifest/utils'
import createId from './utils/createId'
import moment, { months } from 'moment'
import * as c from './constants'
import * as t from './types'

class ActiveQueue {
  #state: {
    ids: Record<string, { type: t.ActiveType }>
    queue: t.ActiveQueueObject[]
    history: any[]
  } = {
    ids: {},
    queue: [],
    history: [],
  }

  #subscribers = {
    queue: [] as t.ActiveQueueSubscriber[],
  }

  getState() {
    return this.#state
  }

  getHelpers() {
    return {
      getState: this.getState.bind(this),
      getSubscribers: this.getSubscribers.bind(this),
    }
  }

  getSubscribers() {
    return this.#subscribers
  }

  create<O extends Record<string, any> = Record<string, any>>(
    opts?: O & Partial<t.ActiveQueueObject>,
  ) {
    const obj = {
      id: createId(),
      timestamp: new Date().toISOString(),
      ...opts,
    } as t.ActiveQueueObject

    const state = this.getState()
    state.queue.push(obj)
    state.ids[obj.id] = { type: obj.type as t.ActiveType }

    this.publish(c.subscribe.QUEUE_START, obj, this.getHelpers())

    return obj
  }

  remove(obj: t.ActiveQueueObject, opts?: Record<string, any>) {
    const { queue, history, ids } = this.getState()

    if (queue.includes(obj)) {
      while (history.length > 10000) history.shift()
      const timestamp = new Date().toISOString()
      history.push({
        ...u.pick(obj, ['id', 'kind', 'operator']),
        ...(obj.error ? { error: obj.error } : undefined),
        ...opts,
        timestamp,
        time: moment(timestamp).diff(new Date(obj.timestamp).getTime(), 'ms'),
      })

      // if (obj.numActions >= 19) debugger

      queue.splice(queue.indexOf(obj), 1)
      delete ids[obj.id]

      this.publish(c.subscribe.QUEUE_END, obj, this.getHelpers())
    }
  }

  on(evt: t.ActiveQueueSubscribeEvent, callback: t.ActiveQueueSubscriber) {
    switch (evt) {
      case c.subscribe.QUEUE_START:
      case c.subscribe.QUEUE_END:
        return void (
          !this.#subscribers.queue.includes(callback) &&
          this.#subscribers.queue.push(callback)
        )
    }
  }

  publish(
    evt: t.ActiveQueueSubscribeEvent,
    ...args: Parameters<t.ActiveQueueSubscriber>
  ) {
    switch (evt) {
      case c.subscribe.QUEUE_START:
      case c.subscribe.QUEUE_END:
        return void this.getSubscribers().queue.map((cb) => cb(...args))
    }
  }
}

export default ActiveQueue
