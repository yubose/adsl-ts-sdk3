export default class UnableToParseYAML extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToParseYAML'
    Object.setPrototypeOf(this, UnableToParseYAML.prototype)
  }
}
