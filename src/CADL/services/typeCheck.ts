export default {
/**
 * @function
 * @description Verify the phone number
 * @param {string} phoneNumber 
 * @param {string} countryCode 
 * @returns {boolean}
 */
  phoneNumber({ phoneNumber, countryCode }) {
    let validPhoneNumber
    if (phoneNumber.includes('-')) {
      validPhoneNumber = phoneNumber.replace(/-/g, '')
    } else {
      validPhoneNumber = phoneNumber
    }
    const countryCodeAndPhoneNumber = countryCode + ' ' + validPhoneNumber
    if (countryCodeAndPhoneNumber.match(/^[+][0-9]+\s\d{10}$/)) {
      return true
    } else {
      return false
    }
  },
/**
 * @function
 * @description Verify that the name matches
 * @param {string} userName 
 * @returns {boolean}
 */
  password(password: string) {
    return /^\S{6,16}$/.test(password)
  },
  userName(userName: string) {
    return /^([a-z0-9A-Z_]){6,16}$/.test(userName)
  },
  email(email:string){
    return  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)
  },
  appleFictitiousEmail(dataIn){
    return /@privaterelay\.appleid\.com$/i.test(dataIn)
  }
}

