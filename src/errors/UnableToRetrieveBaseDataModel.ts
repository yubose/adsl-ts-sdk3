export default class UnableToRetrieveBaseDataModel extends Error {
  public error: Error | undefined
  public name: string
  constructor(message: string, error?: Error) {
    super(message)
    this.error = error
    this.name = 'UnableToRetrieveBaseDataModel'
    Object.setPrototypeOf(this, UnableToRetrieveBaseDataModel.prototype)
  }
}
