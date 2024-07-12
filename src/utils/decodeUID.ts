import AiTmedError from '../common/AiTmedError'

export default function decodeUID(uid: string): {
  userId: string
  phone_number: string
} {
  const lastIOfPlus = uid.lastIndexOf('+')
  if (lastIOfPlus < 0) {
    throw new AiTmedError({ name: 'UID_INVALID' })
  }
  return {
    userId: uid.slice(0, lastIOfPlus),
    phone_number: uid.slice(lastIOfPlus),
  }
}
