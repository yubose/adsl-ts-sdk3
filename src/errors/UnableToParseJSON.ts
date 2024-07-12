export default class UnableToParseJSON extends Error {
    public error: Error | undefined
    public name: string
    constructor(message: string, error?: Error) {
      super(message)
      this.error = error
      this.name = 'UnableToParseJSON'
      Object.setPrototypeOf(this, UnableToParseJSON.prototype)
    }
}
  