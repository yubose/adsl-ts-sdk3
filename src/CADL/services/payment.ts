import * as u from '@jsmanifest/utils'
import log from '../../utils/log'

export default {
  /**
   * @function
   * @description createSqPaymentForm is deprecated. The form is now being rendered from s3 in an html file from an assetsUrl link
   * @returns {void}
   */
  createSqPaymentForm() {
    if (!u.isBrowser()) return
    const sqNode___ = document.createElement('script')
    sqNode___.type = 'text/javascript'
    sqNode___.src = 'https://js.squareupsandbox.com/v2/paymentform'
    sqNode___.onload = () => {
      // onGetCardNonce is triggered when the "Pay $1.00" button is clicked
      // Create and initialize a payment form object
      //@ts-ignore
      window.paymentForm = new SqPaymentForm({
        // Initialize the payment form elements
        //TODO: Replace with your sandbox application ID
        applicationId: 'sandbox-sq0idb-NZW9Yiwvqiqf5zAaaoFQgA',
        inputClass: 'sq-input',
        autoBuild: false,
        // Customize the CSS for SqPaymentForm iframe elements
        inputStyles: [
          {
            fontSize: '16px',
            lineHeight: '24px',
            padding: '16px',
            placeholderColor: '#a0a0a0',
            backgroundColor: 'transparent',
          },
        ],
        // Initialize the credit card placeholders
        cardNumber: {
          elementId: 'sq-card-number',
          placeholder: 'Card Number',
        },
        cvv: {
          elementId: 'sq-cvv',
          placeholder: 'CVV',
        },
        expirationDate: {
          elementId: 'sq-expiration-date',
          placeholder: 'MM/YY',
        },
        postalCode: {
          elementId: 'sq-postal-code',
          placeholder: 'Postal',
        },
        // SqPaymentForm callback functions
        callbacks: {
          /*
           * callback function: cardNonceResponseReceived
           * Triggered when: SqPaymentForm completes a card nonce request
           */
          //@ts-ignore
          cardNonceResponseReceived: async function (errors, nonce, cardData) {
            if (errors) {
              // Log errors from nonce generation to the browser developer console.
              log.error('Encountered Square errors:')
              errors.forEach(function (error) {
                log.error('  ' + error.message)
              })
              alert(
                'Unable to process your payment at this time. Please try again later.',
              )
              return
            }
            const formContainer = document.getElementById('form-container')
            const nonceElement = document.createElement('div')
            nonceElement.setAttribute('type', 'hidden')
            nonceElement.setAttribute('id', 'card-nonce')
            formContainer?.appendChild(nonceElement)
            //@ts-ignore
            document.getElementById('card-nonce').value = nonce
            alert('Please click continue to finish the payment.')
            //@ts-ignore
            delete window.onGetCardNonce
            //@ts-ignore
            delete window.paymentForm
          },
        },
      })

      function onGetCardNonce(event) {
        log.debug(event)
        // Don't submit the form until SqPaymentForm returns with a nonce
        event.preventDefault()
        // Request a nonce from the SqPaymentForm object
        //@ts-ignore
        paymentForm.requestCardNonce()
      }
      //@ts-ignore
      window.onGetCardNonce = onGetCardNonce

      //@ts-ignore
      paymentForm.build()
    }
    document.body.appendChild(sqNode___)
  },
  /**
   * @function
   * @description Pay as you go for page tips
   * @returns {void}
   */
  getPaymentNonce() {
    const iframes = Array.from(document.getElementsByClassName('page'))

    if (iframes.length) {
      const iframe = iframes[0] as HTMLIFrameElement

      if (iframe) {
        const iframeDoc = iframe.contentWindow?.document
        iframe.contentWindow?.postMessage(
          {
            getMeTheToken: true,
          },
          iframe.contentWindow.origin,
        )
        const nonceElem = iframeDoc?.getElementById(
          'card-nonce',
        ) as HTMLInputElement
        const token = nonceElem?.value
        log.debug({ iframeDoc })
        log.debug({ nonceElem })
        log.debug({ token })
        if (token) return token
      } else {
        log.error(
          `%cCould not find the page component iframe`,
          `color:#ec0000;`,
        )
      }
    }

    const nonceElem = document.getElementById('card-nonce') as HTMLInputElement

    if (nonceElem) {
      return nonceElem.value
    } else {
      log.error(
        `%cNonce element using selector "#card-nonce" not found`,
        `color:#ec0000;`,
      )
    }

    return
  },
}
