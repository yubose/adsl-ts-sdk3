export default class UnableToExecuteFn extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToExecuteFn'
    Object.setPrototypeOf(this, UnableToExecuteFn.prototype)
  }
}
