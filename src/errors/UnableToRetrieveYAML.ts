export default class UnableToRetrieveYAML extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToRetrieveYAML'
    Object.setPrototypeOf(this, UnableToRetrieveYAML.prototype)
  }
}
