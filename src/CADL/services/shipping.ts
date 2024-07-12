/**
 * Shipping built in functions
 */
import * as u from '@jsmanifest/utils'
import axios from 'axios'
import type * as nt from 'noodl-types'
import type { LiteralUnion } from 'type-fest'
import parseAddressString from '../../utils/parseAddressString'
import Shippo from 'shippo'
import log from '../../utils/log'
import carriers from '../../../static/carriers.json'
import serviceLevels from '../../../static/serviceLevels.json'
import carrieraccount from '../../../static/carrier_account.json'
import type {
  Address,
  Carrier,
  Carriers,
  Country,
  CreateAddressRequest,
  CreateParcelRequest,
  CreateShipmentRequest,
  DistanceUnit,
  FEDEXServiceLevel,
  LabelFileType,
  Location,
  Message,
  MassUnit,
  PaginatedList,
  PaginationArgs,
  Parcel,
  ParcelExtras,
  Rate,
  RegisterTrackRequest,
  ServiceLevel,
  ServiceLevels,
  Shipment,
  ShipmentExtras,
  Track,
  TrackingStatus,
  TrackingStatuses,
  Transaction,
  TransactionCreateRateRequest,
  UPSServiceLevel,
  USPSServiceLevel,
  ValidationError,
} from 'shippo'
import * as c from '../../constants'
import type * as t from '../../types'
import get from 'lodash/get'
import { find,set,minBy, trim, trimEnd } from 'lodash'
import apiAxios from '../../axios/proxyAxios'
import { error } from 'console'

// Tested to have the best output (landscape mode)
export const LABEL_FILE_TYPE = 'PDF_4x6'

/**
 * {@link https://docs.goshippo.com/shippoapi/public-api/#tag/Overview}
 */
// TODO - Find a better way to define this
// export const _token = 'shippo_test_aa775c7acc9c7064ce3e3d8beb18e9725e6ac194'
// export const _token = JSON.parse(localStorage.getItem("config") as string)?.shippoToken
// log.info("TOKEN", _token)

let _token = JSON.parse((u.isBrowser() ? localStorage.getItem('config') as string : '') || JSON.stringify({}))
?.shippoToken || ''
let shippo = Shippo(_token)
const proxyUrl = 'https://api.aitmed.io:443/api'
let timer:NodeJS.Timer | null  = null
if(!_token) {
  timer = setInterval(() => {
    _token = JSON.parse(u.isBrowser() ? localStorage.getItem("config") as string : '')?.shippoToken
    if(_token) {
      shippo = Shippo(_token)
      //@ts-ignore
      timer && clearInterval(timer)
      timer = null
    }
  }, 100)
}
const trackingOrder = async(carrier,testTrackValue,env)=>{
    // const resp = await axios({
    //   method: 'get',
    //   url: `${proxyUrl}/goshippo/tracking`,
    //   params: {
    //     carrier: carrier,
    //     testTrackValue: testTrackValue,
    //     env: env
    //   },
    //   headers: {
    //     Authorization: _token
    //   }
    // })
    const resp = await apiAxios("proxy")({
      method: 'get',
      url: `/api/goshippo/tracking`,
      params: {
        carrier: carrier,
        testTrackValue: testTrackValue,
        env: env
      },
      headers: {
        Authorization: _token
      }
    })
    return resp.data 
}
export const getShippoToken = () => {
  return _token
}

export const getShippo = () => {
  return shippo
}

export const baseURL = `https://corsproxy.io/?https://api.goshippo.com`
export const SERVICE_LEVELS = {
  usps: 'usps_priority',
  fedex: 'fedex_priority_overnight',
  ups: 'ups_ground',
} as Record<Carriers, ServiceLevels>
export const DEFAULT_CARRIER: Carriers = 'usps'
export const DEFAULT_SERVICE_LEVEL = SERVICE_LEVELS[DEFAULT_CARRIER]

export interface ShippingAddress {
  streetNumber?: string | number
  streetLine1?: string
  streetLine2?: string
  streetLine3?: string
  state?: string
  city?: string
  country?: string
  name?: string
  zipCode?: string | number
}

export interface ShippoResponseError {
  /**
   * @example
   * 'ShippoAPIError'
   */
  type?: LiteralUnion<'ShippoAPIError', string>
  code?: any
  /**
   * @example
   * ```js
   * '{"mass_unit":["This field is required."]}'
   * ```
   */
  detail?: string
  /**
   * @example
   * ```js
   * '/parcels/?width=20&height=20&length=2.4&weight=10'
   * ```
   */
  path?: string
  /**
   * @example
   * 200
   */
  statusCode?: LiteralUnion<200 | 400, number>
}

export function serializeAddress(
  address: Shippo.CreateAddressRequest | Shippo.Address | string | undefined,
) {
  if (address == null) return ''
  if (typeof address === 'string') return address

  // Ex: `1000 S. Anaheim Blvd, Anaheim, CA 92802
  let result = ''

  result += address.street_no
  result += address.street1
  if (address.street2) result += `, ${address.street2}`
  if (address.street3) result += `, ${address.street3}`
  if (address.city) result += `, ${address.city}`
  if (address.state) result += `, ${address.state}`
  if (address.zip) result += `, ${address.zip}`

  return result
}

export function toParcelObject(item: Record<string, any>) {
  const parcel = {} as Shippo.CreateParcelRequest
  parcel.width = `${item.width || item.w}`
  parcel.height = `${item.height || item.h}`
  parcel.weight = `${item.weight}`
  parcel.length = `${item.length || item.l}`
  parcel.mass_unit = `${item.massUnit || ('lb' as MassUnit)}`
  parcel.distance_unit = `${item.distanceUnit || ('m' as DistanceUnit)}`
  return parcel
}

function getShippingServices({ dispatch }: { dispatch: t.Dispatch }) {
  const _req = axios.create({
    baseURL,
    /**
     * https://docs.goshippo.com/shippoapi/public-api/#tag/Overview
     */
    headers: {
      "Authorization": `ShippoToken ${_token}`,
      "Content-Type": 'application/json',
    },
  })
  _req.defaults.withCredentials = true
  async function _createTracking({
    trackMethod,
    trackNumber,
  }: {
    trackMethod: c.ShippingTrackMethod
    trackNumber: string | number
  }) {
    // Maybe?
    // const metadata = `${purchaseType}`
    const tracking = await shippo.track.create({
      carrier: trackMethod,
      // metadata,
      tracking_number: `${trackNumber}`,
    })
    const result = {
      address: {
        from: serializeAddress(tracking.address_from as any),
        to: serializeAddress(tracking.address_to as any),
      },
      carrier: tracking.carrier,
      eta: tracking.eta,
      originalEta: tracking.original_eta,
      serviceLevel: tracking.servicelevel.name,
      status: tracking.tracking_status.status,
      trackNumber: tracking.tracking_number,
      transactionId: tracking.transaction,
    }
    return result
  }

  async function _createTransaction({
    shipmentId,
    service,
  }: {
    shipmentId: string | Record<string, any>
    service?: string
  }) {
    const shipment = {} as Shippo.CreateShipmentRequest

    if (typeof shipmentId === 'string') {
      const _shipment = await o.getShipmentDetails({ shipmentId })

      shipment.address_from = _shipment.address?.from!
      shipment.address_to = _shipment.address?.to!
      shipment.address_return = _shipment.address?.return
      if (_shipment.parcels) shipment.parcels = _shipment.parcels as any
      if (_shipment.date) shipment.shipment_date = _shipment.date
    }

    const serviceLevel = service! // 'ups_ground', etc
    // How to get this?
    const carrierAccountId = '558c84bbc25a4f609f9ba02da9791fe4'
    const transaction = await shippo.transaction.create({
      shipment: shipment,
      servicelevel_token: serviceLevel,
      carrier_account: carrierAccountId,
      label_file_type: 'PNG',
    })

    const result = {
      status: transaction.status?.toUpperCase?.(),
      valid: transaction.object_state === 'VALID',
      invoice: transaction.commercial_invoice_url,
      eta: transaction.eta,
      rate: {
        amount: (transaction.rate as any).amount,
        currency: (transaction.rate as any).currency,
        id: (transaction.rate as any).object_id,
        serviceLevel: (transaction.rate as any).servicelevel.name,
        provider: (transaction.rate as any).provider,
        zone: (transaction.rate as any).zone,
      },
      trackNumber: transaction.tracking_number,
      label: transaction.label_url,
      qrCode: transaction.qr_code_url,
    }

    return result
  }

  async function _getAddress(address: ShippingAddress | string | undefined) {
    const addressObject = {} as Shippo.CreateAddressRequest
    if (!address) return addressObject

    if (u.isStr(address)) {
      const parsedAddress = await parseAddressString(address)
      Object.assign(addressObject, parsedAddress)
    } else if (u.isObj(address)) {
      if (address.city) addressObject.city = address.city
      if (address.country) addressObject.country = address.country
      if (address.name) addressObject.name = address.name
      // @ts-expect-error
      if (address.zip) addressObject.zip = String(address.zip)
      if (address.zipCode) addressObject.zip = String(address.zipCode)
      if (address.state) addressObject.state = String(address.state)
      // @ts-expect-error
      if (address.street1) addressObject.street1 = address.street1
      if (address.streetLine1) addressObject.street1 = address.streetLine1
      if (address.streetLine2) addressObject.street2 = address.streetLine2
      if (address.streetLine3) addressObject.street3 = address.streetLine3
      if (address.streetNumber) {
        addressObject.street_no = String(address.streetNumber)
      }
    }

    return addressObject
  }

  function _fetchAddress(id: string) {
    return shippo.address.retrieve(id)
  }

  async function _fetchShipmentRatesByShipmentId(
    shipmentId: string,
    currency = 'USD',
  ) {
    let pathname = `/shipments/${shipmentId}/rates`

    if (currency) {
      currency = currency.toUpperCase()
      pathname += `/${currency}`
    }

    const { data } = await _req.get<{
      results: Rate[]
      next: null | number
      previous: null | number
    }>(pathname)

    return data?.results || []
  }

  const o = {
    async createShipment(dataIn?: {
      addressFrom?: string
      addressTo?: string
      carrier?: string
      serviceLevel?: string
      shipmentDateNumber: any
      items?:
        | Array<{
            width?: string | number
            height?: string | number
            length?: string | number
            distance?: string | number
            dimensionUnit?: LiteralUnion<'in', string>
            weight?: string | number
            weightUnit?: LiteralUnion<'lb', string>
          }>
        | Array<{
            dimensions?: {
              width?: string | number
              height?: string | number
              length?: string | number
              unit?: LiteralUnion<'in', string>
            }
            weight?: string | number
            weightUnit?: LiteralUnion<'lb', string>
          }>
    }) {
      log.debug(`[createShipment] dataIn`, dataIn)
      debugger

      let {
        addressFrom,
        addressTo,
        carrier,
        items,
        shipmentDateNumber,
      } = dataIn || {}

      // @ts-expect-error
      items = u.array(items)
      if(!carrier) carrier = "USPS"
      let dataOut:
        | undefined
        | {
            id?: string
            transactionId?: string
            parcels?: Record<string, any>[]
            eta?: string
            address?: { from: string; to: string }
            invoice?: { as: 'link' | 'image'; value: string }
            label?: { as: 'link' | 'image'; value: string }
            qrCode?: { as: 'link' | 'image'; value: string }
            rate?: any
            shippingFee?: string
            status?: string
            trackNumber?: string
            trackStatus?: string
            errors?: any[]
            carrier: string
            carrierName: string
            serviceLevel: string
            serviceName: string
          }

      const from = await _getAddress(addressFrom)
      const to = await _getAddress(addressTo)
      const parcels: Shippo.CreateParcelRequest[] = (items || []).map(
        (item: NonNullable<NonNullable<typeof dataIn>['items']>[number]) => {
          // @ts-expect-error
          const parcel = {
            width: '',
            height: '',
            weight: '',
            length: '',
            distance_unit: '',
            mass_unit: '',
          } as Shippo.CreateParcelRequest

          if (u.isObj(item)) {
            if ('dimensions' in item) {
              parcel.width = `${item.dimensions?.width}` as any
              parcel.height = `${item.dimensions?.height}` as any
              parcel.length = `${item.dimensions?.length}` as any
              parcel.distance_unit = item.dimensions?.unit!
            } else {
              if ('width' in item) parcel.width = item.width as `${number}`
              if ('height' in item) parcel.height = item.height as `${number}`
              if ('length' in item) parcel.length = item.length as `${number}`
            }

            parcel.weight = `${item.weight}` as any

            if ('dimensionUnit' in item && item.dimensionUnit) {
              parcel.distance_unit = item.dimensionUnit
            }
            if ('weightUnit' in item && item.weightUnit) {
              parcel.mass_unit = item.weightUnit
            }

            if (!parcel.distance_unit) parcel.distance_unit = 'in'
            if (!parcel.mass_unit) parcel.mass_unit = 'lb'
          }

          return parcel
        },
      )
      let shipment
      try {
        const data_shipment = await apiAxios("proxy")({
          method: "post",
          url: "/api/goshippo/shipment/create",
          headers: {
            Authorization: _token
          },
          data: {
            address_from: from,
            address_to: to,
            parcels,
            shipment_date: new Date(shipmentDateNumber * 1000).toISOString()
          }
        })
        shipment = data_shipment.data
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error(err)
        throw err
      }
      let shipmentRates: Rate[] | undefined
      if (shipment.rates?.length) {
        shipmentRates = shipment.rates
      } else {
        shipmentRates = await _fetchShipmentRatesByShipmentId(
          shipment.object_id,
        )
      }
      // 从所有的rates中筛选出对应
      const filterRate = shipmentRates?.filter(
        rate => {
          return get(rate,"provider") === carrier
        }
      )
      const selectedRate = minBy(filterRate, rate => {
        return +(rate.amount)
      }) || shipmentRates?.[0]
      const serviceLevel = selectedRate?.servicelevel.extended_token || DEFAULT_SERVICE_LEVEL
      const serviceName = selectedRate?.servicelevel.name || "USPS Priority Mail" 
      const carrier_token = get(find(carriers,eachCarrier => get(eachCarrier,"carrierName") === carrier),"token") ?? DEFAULT_CARRIER
      const data_transaction = await apiAxios("proxy")({
        method: "post",
        url: "/api/goshippo/transaction/create",
        data: {
          carrier_account: selectedRate?.carrier_account, //
          rate: selectedRate?.object_id,
          servicelevel_token: serviceLevel,
          shipment: shipment! as any,
          label_file_type: LABEL_FILE_TYPE,
        },
        headers: {
          Authorization: _token
        }
      })
      const transaction = data_transaction.data
      dataOut = {
        id: shipment.object_id,
        transactionId: transaction.object_id,
        parcels: shipment.parcels,
        address: {
          from: serializeAddress(shipment.address_from),
          to: serializeAddress(shipment.address_to),
        },
        invoice: {
          as: 'link' as c.ShippingResourceType,
          value: transaction.commercial_invoice_url,
        },
        eta: transaction.eta,
        label: {
          as: 'link' as c.ShippingResourceType,
          value: transaction.label_url,
        },
        qrCode: {
          as: 'link' as c.ShippingResourceType,
          value: transaction.qr_code_url,
        },
        rate: (transaction.rate as any),
        shippingFee: selectedRate?.amount,
        status: transaction.status,
        trackNumber: transaction.tracking_number,
        trackStatus: transaction.tracking_status,
        errors: transaction.messages || [],
        carrier: carrier_token,
        carrierName: carrier,
        serviceLevel,
        serviceName: serviceName
      }
      return dataOut
    },

    /**
     * Note: The {@link Shippo} api does not have this method so we are manually doing the request
     * @param dataIn
     */
    async createShipmentLabelByShipmentRate(dataIn?: {
      fileType?: LabelFileType
      rateId?: Rate['object_id']
    }) {
      const { fileType = LABEL_FILE_TYPE, rateId } = dataIn || {}
      const { data: transaction } = await _req.post<Transaction>(
        `/transactions/`,
        { rate: rateId, label_file_type: fileType, async: true },
      )
      const dataOut = transaction.label_url
      return dataOut
    },
    async getShipmentDetails({
      shipmentId,
      transactionId,
    }: {
      shipmentId?: string
      transactionId?: string
    } = {}) {
      let shipment: Shippo.Shipment
      let transaction: Shippo.Transaction

      const dataOut = {} as {
        address?: { from?: string; to?: string; return?: string }
        date?: string
        eta?: string
        id?: string
        invoice?: { as: 'link' | 'image'; value: string }
        label?: { as: 'link' | 'image'; value: string }
        qrCode?: { as: 'link' | 'image'; value: string }
        parcels?: Record<string, any>[]
        rates?: Record<string, any>[]
        selectedRate?: Record<string, any>
        status?: string
        trackNumber?: string
        trackStatus?: string
        messages?: object[]
      }

      if (shipmentId) {
        // shipment = await shippo.shipment.retrieve(shipmentId)
        const resp_shipment = await apiAxios("proxy")({
          method: "post",
          url: "/api/goshippo/shipment/retrieve",
          data: {
            shipmentId
          },
          headers: {
            Authorization: _token
          }
        })
        shipment = resp_shipment.data
        dataOut.id = shipment.object_id
        dataOut.date = shipment.shipment_date
        dataOut.parcels = shipment.parcels
        dataOut.address = {
          from: serializeAddress(shipment.address_from),
          to: serializeAddress(shipment.address_to),
        }

        if (shipment.address_return) {
          dataOut.address!.return = serializeAddress(shipment.address_return)
        }
        dataOut.rates = shipment.rates
        dataOut.status = shipment.status
      }
      
      if (transactionId) {
        for (let i = 0; i < 10; i++) {
          // transaction = await shippo.transaction.retrieve(transactionId)
          const resp_transaction = await apiAxios("proxy")({
            url: "/api/goshippo/transaction/retrieve",
            method: "post",
            data: {
              transactionId
            },
            headers: {
              Authorization: _token
            }
          })
          transaction = resp_transaction.data
          dataOut.messages = transaction.messages
          if(transaction.tracking_number){
            dataOut.eta = transaction.eta
            dataOut.invoice = {
              as: 'link',
              value: transaction.commercial_invoice_url,
            }
            dataOut.label = { as: 'link', value: transaction.label_url }
            dataOut.qrCode = { as: 'link', value: transaction.qr_code_url }
            dataOut.selectedRate = (transaction.rate as any) as any
            dataOut.trackNumber = transaction.tracking_number
            dataOut.trackStatus = transaction.tracking_status
            break
          }
        }
      }
      return dataOut
    },
    /**
     * https://docs.goshippo.com/shippoapi/public-api/#operation/ListShipmentRatesByCurrencyCode
     * @param options.shipmentId
     * @param options.currency
     */
    async getShipmentRates(dataIn: {
      addressFrom?: CreateAddressRequest
      addressTo?: CreateAddressRequest
      currency?: string
      items?: Record<string, any>[]
      shipmentId?: string
    }) {
      let {
        addressFrom,
        addressTo,
        currency,
        items = [],
        shipmentId,
      } = dataIn || {}

      const dataOut = [] as Rate[]

      if (u.isObj(dataIn)) {
        if (shipmentId) {
          const rates = await _fetchShipmentRatesByShipmentId(
            shipmentId,
            currency,
          )
          dataOut.push(...rates)
        } else if (dataIn.addressFrom || dataIn.addressTo || dataIn.items) {
          // Creating a shipment does not submit the payment yet so we can use this behavior to show shipment rates before sending the transaction (the actual payment request)
          const shipment = await shippo.shipment.create({
            address_from: serializeAddress(addressFrom),
            address_to: serializeAddress(addressTo),
            parcels: items.map(toParcelObject),
          })

          dataOut.push(...shipment.rates)
        }
      }

      return dataOut
    },
    async getShipmentLabelByTransactionId(dataIn: { transactionId?: string }) {
      const transactionId = dataIn?.transactionId!
      // const transaction = await shippo.transaction.retrieve(transactionId)
      const resp_transaction = await apiAxios("proxy")({
        method: "post",
        url: "/api/goshippo/transaction/retrieve",
        data: {
          transactionId
        },
        headers: {
          Authorization: _token
        }
      })
      const transaction = resp_transaction.data
      const dataOut = transaction.label_url
      return dataOut
    },
    async getCarriers({ limit = 100 }: { limit?: number }) {
      const carriers = await shippo.carrieraccount.list({ results: limit })
      const dataOut = carriers.results.map((carrier) => ({
        id: carrier.object_id,
        name: carrier.carrier,
        title: carrier?.['carrier_name'],
        accountId: carrier.account_id,
        additionalInfo: {
          metadata: carrier.metadata,
          images: carrier?.['images'] || [],
        },
      }))
      return dataOut
    },
    async printShippingLabel(dataIn?: { transactionId?: string }) {
      const transactionId = dataIn?.transactionId!
      const labelURL = await o.getShipmentLabelByTransactionId({
        transactionId,
      })
      // const { data: labelData } = await axios.get(labelURL)
      // // Do something with the downloaded PNG/PDF
      // const dataOut = labelData
      return labelURL
    },
    async getTracking(dataIn?: {
      carrier: LiteralUnion<'USPS' | 'UPS' | 'FedEx', string>
      trackNumber: LiteralUnion<`test_${string}`, string> | number
    }) {
      let { carrier = DEFAULT_CARRIER, trackNumber } = dataIn || {}
      if (!u.isStr(trackNumber)) trackNumber = String(trackNumber)

      // Shippo automatically returns a mocked response if we use any of these as a tracking number and setting carrier to "shippo"
      const testTrackNumbers = {
        SHIPPO_PRE_TRANSIT: 'SHIPPO_PRE_TRANSIT',
        SHIPPO_TRANSIT: 'SHIPPO_TRANSIT',
        SHIPPO_DELIVERED: 'SHIPPO_DELIVERED',
        SHIPPO_RETURNED: 'SHIPPO_RETURNED',
        SHIPPO_FAILURE: 'SHIPPO_FAILURE',
        SHIPPO_UNKNOWN: 'SHIPPO_UNKNOWN',
      } as const

      let tracking: any 
      const server = JSON.parse(localStorage.getItem("config") as string)?.apiHost
      if(server === "ecosapiprod.aitmed.io"){
        carrier = carrier
        trackNumber = trackNumber
      }else{
        // for test mode 
        carrier = "shippo" 
        trackNumber = "SHIPPO_TRANSIT"
      }
      // In the noodl we can return mock tracking status responses by using a custom prefix to trigger. In this case we will use the prefix "test_"
      if (trackNumber.startsWith('test_')) {
        const testTrackNumber = `SHIPPO_${trackNumber
          .replace('test_', '')
          .toUpperCase()}`
        const testTrackValue = testTrackNumbers[testTrackNumber]
        tracking = await trackingOrder('shippo', testTrackValue,'test')
        // tracking = await shippo.track.get_status('shippo', testTrackValue)
      } else {
        // Otherwise default to normal behavior and use a real tracking number
        // tracking = await shippo.track.get_status(carrier, trackNumber)
        tracking = await trackingOrder(carrier, trackNumber,'prod')
      }
      const dataOut = {
        addressFrom: tracking.address_from,
        addressTo: tracking.address_to,
        carrier: tracking.carrier,
        carrierName: carrier,
        eta: tracking.eta,
        originalEta: tracking.original_eta,
        serviceLevel: tracking.servicelevel.token,
        serviceName: tracking.servicelevel.name,
        history: tracking.tracking_history.map((track) => {
          return {
            id: track.object_id,
            createdAt: track.object_created,
            date: track.status_date,
            location: track.location,
            notes: track.status_details,
            status: track.status,
            updatedAt: track.object_updated,
          }
        }),
        transactionId: tracking.transaction
      }
      return dataOut
    },
    async getTrackingStatus({ trackingList } : { trackingList: {}[] }){
      // Shippo automatically returns a mocked response if we use any of these as a tracking number and setting carrier to "shippo"
      const testTrackNumbers = {
        SHIPPO_PRE_TRANSIT: 'SHIPPO_PRE_TRANSIT',
        SHIPPO_TRANSIT: 'SHIPPO_TRANSIT',
        SHIPPO_DELIVERED: 'SHIPPO_DELIVERED',
        SHIPPO_RETURNED: 'SHIPPO_RETURNED',
        SHIPPO_FAILURE: 'SHIPPO_FAILURE',
        SHIPPO_UNKNOWN: 'SHIPPO_UNKNOWN',
      } as const      
      const result = await Promise.all(
        trackingList.map( async eachTracking => {
          const server = JSON.parse(localStorage.getItem("config") as string)?.apiHost
          let carrier,trackNumber
          if(server === "ecosapiprod.aitmed.io"){
            carrier = get(eachTracking,"name.data.carrierName")
            trackNumber = get(eachTracking,"name.data.trackNumber")
          }else{
            // for test mode 
            carrier = "shippo" 
            trackNumber = "SHIPPO_TRANSIT"
          }
          let tracking: Track
          // In the noodl we can return mock tracking status responses by using a custom prefix to trigger. In this case we will use the prefix "test_"
          if (trackNumber.startsWith('test_')) {
            const testTrackNumber = `SHIPPO_${trackNumber
              .replace('test_', '')
              .toUpperCase()}`
            const testTrackValue = testTrackNumbers[testTrackNumber]
            // tracking = await shippo.track.get_status('shippo', testTrackValue)
            // const data_tracking = await axios(`${proxyUrl}/goshippo/track/status`, {
            //   method: "get",
            //   params: {
            //     carrier: carrier,
            //     track_value: trackNumber
            //   },
            //   headers: {
            //     Authorization: _token
            //   }
            // })
            const data_tracking = await apiAxios('proxy')({
              method: "get",
              url: "/api/goshippo/track/status",
              params: {
                carrier: carrier,
                track_value: trackNumber
              },
              headers: {
                Authorization: _token
              }
            })
            tracking = data_tracking.data
          } else {
            // Otherwise default to normal behavior and use a real tracking number
            // tracking = await shippo.track.get_status(carrier, trackNumber)
            // const data_tracking = await axios(`${proxyUrl}/goshippo/track/status`, {
            //   method: "get",
            //   params: {
            //     carrier: carrier,
            //     track_value: trackNumber
            //   },
            //   headers: {
            //     Authorization: _token
            //   }
            // })
            const data_tracking = await apiAxios("proxy")({
              method: "get",
              url: `/api/goshippo/track/status`, 
              params: {
                carrier: carrier,
                track_value: trackNumber
              },
              headers: {
                Authorization: _token
              }
            })
            tracking = data_tracking.data
          }
          const status = get(tracking,"tracking_status.status") || "UNKNOWN"
          let statusColor: string
          switch (status) {
            case "UNKNOWN":
              statusColor = "#c1c1c1"
              break;
            case "PRE_TRANSIT":
              statusColor = "#005795"
              break;
            case "TRANSIT":
              statusColor = "#2988E6"
              break;
            case "DELIVERED":
              statusColor = "#2FB355"
              break;
            case "RETURNED":
              statusColor = "#F8AE29"
              break;
            case "FAILURE":
              statusColor = "#E24445"
              break;
            default:
              statusColor = "#333333"
              break;
          }
          set(eachTracking,"status",status)
          set(eachTracking,"statusColor",statusColor)
          return eachTracking
        })
      )
      return result 
    },
    async getTransactionDetail( { transactionId } : { transactionId:string } ){
      // const transaction = await shippo.transaction.retrieve(transactionId)
      const transaction_resp = await apiAxios("proxy")({
        method: "post",
        url: "/api/goshippo/transaction/retrieve",
        data: {
          transactionId: transactionId
        },
        headers: {
          Authorization: _token
        }
      })
      const transaction = transaction_resp.data
      // const parcel = await shippo.parcel.retrieve(transaction.parcel)
      const parcel_resp = await apiAxios("proxy")({
        method: "post",
        url: "/api/goshippo/parcel/retrieve",
        data: {
          parcel: transaction.parcel
        },
        headers: {
          Authorization: _token
        }
      })
      const parcel = parcel_resp.data
      const rate_resp = await apiAxios("proxy")({
        method: "post",
        url: "/api/goshippo/rate/retrieve",
        data: {
          string: (transaction.rate as any).toString()
        },
        headers: {
          Authorization: _token
        }
      })
      return {
        ...rate_resp.data,
        parcels: [parcel]
      }
      // const rate = await shippo.rate.retrieve((transaction.rate as any))
      // return rate
    },
    async validateAddress(dataIn?: {
      name: string
      phone: string
      email: string
      street1: string
      street2: string
      state: string
      city: string
      zip: string
      country: string
    }) {
      const {
        name,
        phone,
        email,
        street1,
        street2,
        state,
        city,
        zip,
        country,
      } = dataIn
        ? dataIn
        : {
            name: '',
            phone: '',
            email: '',
            street1: '',
            street2: '',
            state: '',
            city: '',
            zip: '',
            country: '',
          }
      try {
        const res = await shippo.address.create({
          name: name,
          phone: phone,
          email: email,
          street1: street1,
          street2: street2,
          city: city,
          state: state,
          zip: zip,
          country: country,
          validate: true,
        })
        return {
          status: !!res.validation_results?.is_valid,
          message: res.validation_results?.messages,
        }
      } catch (error) {
        log.error(error)
      }
    },
    handleParcel({ parcel }: { parcel: {} }){
      if(!parcel) return {
        dimension: '',
        weight: '',
      }
      return {
        dimension: `${(+get(parcel,"length", '')).toString()}×${(+get(parcel,"width", '')).toString()}×${(+get(parcel,"height", '')).toString()} ${get(parcel,"distance_unit")}`,
        weight: `${(+get(parcel,"weight", '')).toString()} ${get(parcel,"mass_unit")}`,
      }
    }
  }

  return o
}

export default getShippingServices
