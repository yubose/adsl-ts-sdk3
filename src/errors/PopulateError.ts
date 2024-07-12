class PopulateError extends Error {
  name: string
  kind: string

  constructor(message: string, kind?: string) {
    super(message)
    this.name = 'PopulateError'
    this.kind = kind || ''
  }
}

export default PopulateError
