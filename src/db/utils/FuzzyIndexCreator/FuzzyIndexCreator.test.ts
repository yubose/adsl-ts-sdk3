// @ts-nocheck
import FuzzyIndexCreator from './'

describe('Unit Testing DB Utils', () => {
  describe('FuzzyIndexCreator', () => {
    describe('initialMapping', () => {
      test('it should create a map of initial string', () => {
        const fuzzyIndexCreator = new FuzzyIndexCreator()
        const initialMapping_Hello = fuzzyIndexCreator.initialMapping('hello')
        const initialMapping_Christina =
          fuzzyIndexCreator.initialMapping('Christina')
        const initialMapping_TestStr =
          fuzzyIndexCreator.initialMapping('123!ijoi4343*@#{}')
        expect(initialMapping_Hello).toEqual('ala')
        expect(initialMapping_Christina).toEqual('krastana')
        expect(initialMapping_TestStr).toEqual('{`aja|{|{`````')
      })
    })
    describe('toFuzzyInt64', () => {
      test('should correct map hex to int representation', () => {
        const fuzzyIndexCreator2 = new FuzzyIndexCreator()
        const initialMapping_Hello = fuzzyIndexCreator2.initialMapping('hello')
        const initialMapping_Christina =
          fuzzyIndexCreator2.initialMapping('Christina')
        const initialMapping_TestStr =
          fuzzyIndexCreator2.initialMapping('123!ijoi4343*@#{}')
        const fuzzyInt_Christina = fuzzyIndexCreator2.toFuzzyInt64(
          initialMapping_Christina,
        )
        const fuzzyInt_Hello =
          fuzzyIndexCreator2.toFuzzyInt64(initialMapping_Hello)
        const fuzzyInt_TestStr = fuzzyIndexCreator2.toFuzzyInt64(
          initialMapping_TestStr,
        )
        expect(fuzzyInt_Christina).toEqual(2015048081)
        expect(fuzzyInt_Hello).toEqual(385)
        expect(fuzzyInt_TestStr).toEqual(58571116998819840)
      })
    })
    describe('toFuzzyHex', () => {
      test('should correct map string to hex representation', () => {
        const fuzzyIndexCreator2 = new FuzzyIndexCreator()
        const initialMapping_Hello = fuzzyIndexCreator2.initialMapping('hello')
        const initialMapping_Christina =
          fuzzyIndexCreator2.initialMapping('Christina')
        const initialMapping_TestStr =
          fuzzyIndexCreator2.initialMapping('123!ijoi4343*@#{}')
        const fuzzyInt_Christina = fuzzyIndexCreator2.toFuzzyHex(
          initialMapping_Christina,
        )
        const fuzzyInt_Hello =
          fuzzyIndexCreator2.toFuzzyHex(initialMapping_Hello)
        const fuzzyInt_TestStr = fuzzyIndexCreator2.toFuzzyHex(
          initialMapping_TestStr,
        )
        expect(fuzzyInt_Christina).toEqual('781B3191')
        expect(fuzzyInt_Hello).toEqual('181')
        expect(fuzzyInt_TestStr).toEqual('D0161EDED00000')
      })
    })
  })
})
