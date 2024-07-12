export default function compareUint8Arrays(
  u8a1: Uint8Array,
  u8a2: Uint8Array,
): boolean {
  if (u8a1.length !== u8a2.length) return false
  for (let i = 0; i < u8a1.length; i++) {
    if (u8a1[i] !== u8a2[i]) {
      return false
    }
  }
  return true
}
