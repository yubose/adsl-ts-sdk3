export default class InvalidDestination extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'InvalidDestination'
    Object.setPrototypeOf(this, InvalidDestination.prototype)
  }
}
