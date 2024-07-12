export default class NoDataModelsFound extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'NoDataModelsFound'
    Object.setPrototypeOf(this, NoDataModelsFound.prototype)
  }
}
