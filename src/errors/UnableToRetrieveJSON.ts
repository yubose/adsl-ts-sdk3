export default class UnableToRetrieveJSON extends Error {
    public error: Error | undefined
    public name: string
    constructor(message: string, error?: Error) {
      super(message)
      this.error = error
      this.name = 'UnableToRetrieveJSON'
      Object.setPrototypeOf(this, UnableToRetrieveJSON.prototype)
    }
}
  