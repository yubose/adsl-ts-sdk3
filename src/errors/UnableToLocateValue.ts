export default class UnableToLocateValue extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToLocateValue'
    Object.setPrototypeOf(this, UnableToLocateValue.prototype)
  }
}
