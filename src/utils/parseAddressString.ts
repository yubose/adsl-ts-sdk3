import parseAddress from 'parse-address-string'

export interface AddressObject {
  city: null | string
  country: null | string
  state: null | string
  street1?: string
  street2?: string
  zip?: string
}

function parseAddressString(input: string): Promise<AddressObject> {
  return new Promise((resolve, reject) => {
    parseAddress(
      input,
      (
        error: null | Error,
        data: {
          city: null | string
          state: null | string
          country: null | string
          street_address1: null | string
          street_address2: null | string
          postal_code: null | string
        },
      ) => {
        if (error) {
          reject(error)
        } else {
          const address = {} as AddressObject

          if (data.city) address.city = data.city
          if (data.country) address.country = data.country
          if (data.state) address.state = data.state
          if (data.street_address1) address.street1 = data.street_address1
          if (data.street_address2) address.street2 = data.street_address2
          if (data.postal_code) address.zip = data.postal_code

          resolve(address)
        }
      },
    )
  })
}

export default parseAddressString
