import log from './log'

export default function getUidFromLocalStorage() {
  if (typeof window === 'undefined') return
  let uid = localStorage.getItem('uid')
  if (uid) return uid
  let Global = localStorage.getItem('Global') || ''
  let globalObj: Record<string, any> | undefined
  if (Global) {
    try {
      globalObj = JSON.parse(Global)
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)))
    }
  }
  return globalObj?.currentUser?.vertex?.uid || ''
}
