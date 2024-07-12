import { ErrorCodes, defaultErrorMessages, ConfigArgs } from './types'

const names = Object.keys(ErrorCodes).filter(
  (name) => typeof ErrorCodes[name as any] === 'number'
)
const codes = names.map((name) => parseInt(ErrorCodes[name as any]))

class AiTmedError extends Error {
  readonly code: number
  readonly name: string
  readonly message: string
  readonly source: string

  constructor({ code, name, message }: ConfigArgs) {
    super()
    if (code === undefined && name !== undefined) {
      this.name = name
      this.code = getErrorCode(name)
    } else if (code !== undefined && name === undefined) {
      this.name = getErrorName(code)
      this.code = getErrorCode(this.name)
    } else {
      this.code = -1
      this.name = ErrorCodes[this.code]
    }
    this.message =
      message === undefined ? defaultErrorMessages[this.name] : message
    this.source = 'lv-3'
  }
}

function getErrorCode(name: string) {
  if (names.includes(name)) {
    return parseInt(ErrorCodes[name as any])
  } else {
    return -1
  }
}

function getErrorName(code: number) {
  if (codes.includes(code)) {
    return ErrorCodes[code]
  } else {
    return ErrorCodes.UNKNOW_ERROR.toString()
  }
}

export { getErrorCode, getErrorName }
export default AiTmedError
