export default class UnableToLoadConfig extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToLoadConfig'
    Object.setPrototypeOf(this, UnableToLoadConfig.prototype)
  }
}
