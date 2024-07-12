export const setBit = (target: number, value: boolean, bit: number) => {
  return value ? target | (1 << bit) : target & ~(1 << bit)
}

export const getBit = (target: number, bit: number) => {
  return !!(target & (1 << bit)) ? 1 : 0
}
