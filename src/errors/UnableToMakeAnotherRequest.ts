export default class UnableToMakeAnotherRequest extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToMakeAnotherRequest'
    Object.setPrototypeOf(this, UnableToMakeAnotherRequest.prototype)
  }
}
