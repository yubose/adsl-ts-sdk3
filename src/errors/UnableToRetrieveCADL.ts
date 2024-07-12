export default class UnableToRetrieveCADL extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToRetrieveCADL'
    Object.setPrototypeOf(this, UnableToRetrieveCADL.prototype)
  }
}
