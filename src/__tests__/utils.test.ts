import { expect } from 'chai'
import isPopulated from '../utils/isPopulated'
import replaceEidWithId from '../utils/replaceEidWithId'
import { populateKeys } from '../CADL/utils'
import populateString from '../utils/populateString'
import { populateArray } from '../CADL/utils'
import { populateObject } from '../CADL/utils'

describe(`utils`, () => {
  describe('replaceEidWithId', () => {
    it('replaces object.eid with object.id ', () => {
      expect(replaceEidWithId({ eid: '12345' })).to.deep.eq({ id: '12345' })
    })

    it('returns input if no eid is found ', () => {
      expect(replaceEidWithId({ yid: '12345' })).to.deep.eq({ yid: '12345' })
      expect(replaceEidWithId({})).to.deep.eq({})
    })
  })

  describe('isPopulated', () => {
    it('returns false if it finds a value that begins with "."', () => {
      const data = { name: '.dataModel.name' }
      const nestedData = {
        name: {
          firstName: '.dataModel.name',
          lastName: '.dataModel.name',
        },
        company: {
          employee: {
            firstName: '.dataModel.name',
          },
        },
      }
      expect(isPopulated(data)).to.eq(false)
      expect(isPopulated(nestedData)).to.eq(false)
    })
    it('returns true if it doesnt find a value that begins with "."', () => {
      const data = { name: 'henry' }
      const nestedData = {
        name: {
          firstName: 'henry',
          lastName: 'willerd',
        },
        company: {
          employee: {
            firstName: 'sam',
          },
        },
      }
      expect(isPopulated(data)).to.eq(true)
      expect(isPopulated(nestedData)).to.eq(true)
    })
  })

  xdescribe('populateKeys', () => {
    it('it populates the object', () => {
      const root = { Style: { border: { style: '2' } } }
      const source = { type: 'abc', style: { '.Style': { width: '0.50' } } }
      expect(populateKeys({ source, root })).to.deep.eq({
        ...source,
        style: { ...root.Style, ...source.style['.Style'] },
      })
    })

    it('it should not be equal to this wrongly merged object', () => {
      const root = { Style: { border: { style: '2' } } }
      const source = { type: 'abc', style: { '.Style': { width: '0.50' } } }
      const lookFor = '.Style'
      expect(populateKeys({ source, root })).not.to.deep.eq({
        ...source,
        style: { ...source.style['.Style'], border: { style: '3' } },
      })
    })
  })

  describe('populateString', () => {
    it('it replaces string with val in a given location', () => {
      const source = '.dataModel.firstName'
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateString({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.eq('henry')
    })

    it('it replaces string with val in a given multiple locations', () => {
      const source = '.dataModel.firstName'
      const locations = [
        { dataModel: { lastName: 'samson' } },
        { dataModel: { firstName: 'henry' } },
        { dataModel: { middle: 'dave' } },
      ]
      const populatedData = populateString({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.eq('henry')
    })

    it('it returns the original string if val is not found in the given locations', () => {
      const source = '.dataModel.name'
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateString({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.eq('.dataModel.name')
    })
  })

  describe('populateArray', () => {
    it('it populates the values of an array of strings', () => {
      const source = ['.dataModel.firstName', '.dataModel.middleName', 'red']
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateArray({ source, lookFor: '.', locations })
      expect(populatedData).to.deep.eq(['henry', 'stan', 'red'])
    })

    it('it populates the values of an array of strings and looks in multiple locations', () => {
      const source = ['.dataModel.firstName', '.dataModel.middle', 'red']
      const locations = [
        { dataModel: { firstName: 'henry' } },
        { dataModel: { lastName: 'samson' } },
        { dataModel: { middle: 'dave' } },
      ]
      const populatedData = populateArray({ source, lookFor: '.', locations })
      expect(populatedData).to.deep.eq(['henry', 'dave', 'red'])
    })

    it('it populates the values of an array of objects', () => {
      const source = [
        { firstName: '.dataModel.firstName' },
        { middleName: '.dataModel.middleName' },
        'red',
      ]
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateArray({ source, lookFor: '.', locations })
      expect(populatedData).to.deep.eq([
        { firstName: 'henry' },
        { middleName: 'stan' },
        'red',
      ])
    })

    it('it populates the values of an array of arrays', () => {
      const source = [
        [
          { firstName: '.dataModel.firstName' },
          { middleName: '.dataModel.middleName' },
          '.dataModel.firstName',
          '.dataModel.middleName',
        ],
        { firstName: '.dataModel.firstName' },
        { middleName: '.dataModel.middleName' },
      ]
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateArray({ source, lookFor: '.', locations })
      expect(populatedData).to.deep.eq([
        [{ firstName: 'henry' }, { middleName: 'stan' }, 'henry', 'stan'],
        { firstName: 'henry' },
        { middleName: 'stan' },
      ])
    })
  })

  describe('populateObject', () => {
    it('it populates the values of a simple object', () => {
      const source = { firstName: '.dataModel.firstName' }
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateObject({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.deep.eq({ firstName: 'henry' })
    })

    it('it populates the values of an object with arrays', () => {
      const source = { firstName: ['.dataModel.firstName'] }
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateObject({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.deep.eq({ firstName: ['henry'] })
    })

    it('it populates the values of an object that has nested objects with dependent values', () => {
      const source = {
        company: { name: 'aitmed', position: 'developer' },
        job: '.company.position',
        employee: { firstName: 'henry', middleName: 'stan', job: '.job' },
      }
      const locations = [
        {
          company: { name: 'aitmed', position: 'developer' },
          job: '.company.position',
          employee: { firstName: 'henry', middleName: 'stan', job: '.job' },
        },
      ]
      const populatedData = populateObject({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.deep.eq({
        company: {
          name: 'aitmed',
          position: 'developer',
        },
        job: 'developer',
        employee: {
          firstName: 'henry',
          middleName: 'stan',
          job: 'developer',
        },
      })
    })

    it('it populates the values of an object that contains array of arrays', () => {
      const source = {
        employees: [
          [
            { firstName: '.dataModel.firstName' },
            { middleName: '.dataModel.middleName' },
          ],
          '.dataModel.firstName',
          '.dataModel.middleName',
        ],
      }
      const locations = [
        { dataModel: { firstName: 'henry', middleName: 'stan' } },
      ]
      const populatedData = populateObject({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.deep.eq({
        employees: [
          [{ firstName: 'henry' }, { middleName: 'stan' }],
          'henry',
          'stan',
        ],
      })
    })

    it('it populates the values of an object and looks in multiple locations', () => {
      const source = {
        employees: [
          [
            { firstName: '.dataModel.firstName' },
            { middleName: '.dataModel.middle' },
          ],
          '.dataModel.lastName',
          '.dataModel.middle',
        ],
      }
      const locations = [
        { dataModel: { firstName: 'henry' } },
        { dataModel: { lastName: 'samson' } },
        { dataModel: { middle: 'dave' } },
      ]
      const populatedData = populateObject({
        source,
        lookFor: '.',
        locations,
      })
      expect(populatedData).to.deep.eq({
        employees: [
          [{ firstName: 'henry' }, { middleName: 'dave' }],
          'samson',
          'dave',
        ],
      })
    })
  })
})
