const cache = {
  pages: {},
  refs: {},
} as {
  pages: Record<string, any>
  refs: {
    [pageName: string]: {
      [reference: string]: {
        key: string
        ref: string
        path: string | undefined
        isLocal: boolean
      }
    }
  }
} & Record<string, any>

export default cache
