// @ts-nocheck
import basicAlgorithm from './BasicAlgorithm'

describe('BasicAlgorithm', () => {
  it('should extract all key words from text', () => {
    const res = basicAlgorithm(' hello THere benny, pollY')
    expect(res).toEqual(['hello', 'benny', 'polly'])
  })
})
