import { expect } from 'chai'
import nock from 'nock'
import getShippingServices, { _token, baseURL } from '../CADL/services/shipping'
import type CADL from '../CADL'
import addressFixtures from './fixtures/shippo/address.json'
import carrierFixtures from './fixtures/shippo/carrier.json'
import rateFixtures from './fixtures/shippo/rate.json'
import extraFixtures from './fixtures/shippo/extra.json'
import shipmentFixtures from './fixtures/shippo/shipment.json'
import transactionFixtures from './fixtures/shippo/transaction.json'
import * as h from './helpers'
import * as c from '../constants'
import type * as t from '../types'

xdescribe(`builtin functions`, () => {
  describe(`shipping`, () => {
    let cadl: CADL
    let dispatch: t.Dispatch
    let shipping: ReturnType<typeof getShippingServices>
    let scope: nock.Scope

    beforeEach(() => {
      cadl = h.getCADL(`https://public.aitmed.com/config/patient.yml`)
      dispatch = cadl.dispatch.bind(cadl)
      shipping = getShippingServices({ dispatch })
      nock.disableNetConnect()
      scope = nock(`https://gateway.aitmed.io`)
    })

    it(`[createShipment] should map correct values in data out`, async function () {
      this.timeout(10000)

      const extra = extraFixtures[0]
      const selectedRate = rateFixtures.adcfdddf8ec64b84ad22772bce3ea37a
      const addressFrom = addressFixtures.AiTmed
      const addressTo = addressFixtures['Janitor guy of Chase Bank']
      const selectedCarrier = carrierFixtures.canada_post
      const transaction =
        transactionFixtures['8caf7fd7b6924643a1e9d027bf260c5a']

      scope.post(/shipments/i).reply(200, {
        customs_declaration: 'adcfdddf8ec64b84ad22772bce3ea37a',
        extra,
        metadata: 'Customer ID 123456',
        shipment_date: '2021-03-22T12:00:00Z',
        address_from: addressFrom,
        address_return: addressFrom,
        address_to: addressTo,
        carrier_accounts: [selectedCarrier],
        messages: [
          {
            code: 'string',
            source: 'UPS',
            text: 'RatedShipmentWarning: User Id and Shipper Number combination is not qualified to receive negotiated rates.',
          },
        ],
        object_created: '2019-08-24T14:15:22Z',
        object_id: 'adcfdddf8ec64b84ad22772bce3ea37a',
        object_owner: 'pp@gmail.com',
        object_updated: '2019-08-24T14:15:22Z',
        parcels: [
          {
            distance_unit: 'in',
            height: '1',
            is_default: true,
            length: '1',
            mass_unit: 'lb',
            name: 'Oven Box',
            object_id: 'adcfdddf8ec64b84ad22772bce3ea37a',
            template: 'FedEx_Box_10kg',
            weight: '1',
            width: '1',
          },
        ],
        rates: selectedRate,
        status: 'SUCCESS',
        test: true,
      })

      scope.options(/\/shipments/).reply(200, {})

      scope
        .get(/shipments/)
        .reply(200, { results: [selectedRate], next: null, previous: null })

      scope.post(/\/transactions/).reply(200, transaction)

      const shipment = await shipping.createShipment({
        // addressFrom: `1000 South Anaheim Boulevard, Anaheim, CA 92802 USA`,
        // addressTo: `3234 Nevada Avenue, El Monte, CA 91732 USA`,
        addressFrom,
        addressTo,
        carrier: 'USPS',
        items: [
          {
            width: '1',
            height: '2',
            length: '10',
            weight: '3',
            distance: '2',
            dimensionUnit: 'in',
            weightUnit: 'lb',
          },
        ],
        shipmentDateNumber: Date.now(),
      })

      // expect(shipment.id).not.to.be.empty
      // expect(shipment.transactionId).to.eq(transaction.object_id)
      // expect(shipment.parcels).not.to.be.empty
      // expect(shipment.address)
      //   .to.have.property('from')
      //   .to.eq(
      //     `${addressFrom.street1}, ${addressFrom.city}, ${addressFrom.state}, ${addressFrom.zip}`,
      //   )
      // expect(shipment.address)
      //   .to.have.property('to')
      //   .to.eq(
      //     `${addressTo.street1}, ${addressTo.city}, ${addressTo.state}, ${addressTo.zip}`,
      //   )
      // expect(shipment.label).to.have.property('value', transaction.label_url)
      // expect(shipment.rate).to.deep.eq(transaction.rate)
      // expect(shipment.trackNumber).to.eq(transaction.tracking_number)
      // expect(shipment.trackStatus).to.eq(transaction.tracking_status)
      // expect(shipment.errors).to.be.an('array')
    })
  })
})
