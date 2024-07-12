enum eTypes {
  // GENERAL_EVENT = 1000,
  // SEND_VERIFICATION_CODE = 1010,
  // CREATE_USER = 1020,
  // LOGIN_USER = 1030,
  // LOGIN_NEW_DEVICE = 1040,
  // RESET_USER_PASSWORD = 1050,
  // RETRIEVE_USER = 1070,
  // DEACTIVATE_USER = 1080,

  ROOT = 10000,
  NOTEBOOK = 10001,
  INVITE = 1050,
  REJECT_INVITE = 1052,
  ACCEPT_INVITE = 1060,
  AUTHORIZE_INVITE = 1070,
  AUTHORIZE_INVITE_INDEPENDENT = 1071,
  INBOX = 10002,
}

const [typeMapper, codeMapper, typeList, codeList] = Object.keys(eTypes).reduce<
  [Record<string, number>, Record<string, string>, string[], number[]]
>(
  (acc, cur) => {
    if (typeof eTypes[cur as any] === 'number') {
      acc[0] = { ...acc[0], [cur]: parseInt(eTypes[cur as any]) }
      acc[2].push(cur)
    } else {
      acc[1] = { ...acc[1], [cur]: eTypes[cur as any] }
      acc[3].push(parseInt(cur))
    }
    return acc
  },
  [{}, {}, [], []],
)

export { eTypes, typeMapper, codeMapper, typeList, codeList }
