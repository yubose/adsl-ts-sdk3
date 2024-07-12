// handle csv data
import get from 'lodash/get'
import set from 'lodash/set'
import moment from 'moment'
import isArray from 'lodash/isArray'
import uniq from 'lodash/uniq'
import Document, {documentToNote} from '../../services/Document'
import fcm from './fcm'
import _, { differenceWith, find, flattenDeep, forEach, includes, isNumber, remove } from 'lodash'
import store from '../../common/store'
import repeat from 'lodash/repeat'
import { customAlphabet } from 'nanoid'
import indexLocalForage from "./localforage"
import { replaceUint8ArrayWithBase64 } from '../utils'
import { key } from 'localforage'

export default {
    // 导出audit log 的csv
    handleAuditLogCsvData({ originalArray }: { originalArray: {}[] }) {
        let handledArray: {}[] = []
        originalArray.forEach((eachData) => {
            let logObj = {}
            // compatible with old data, which date is null
            if (/^(\-|\+)?\d+(.\d+)?$/.test(eachData?.['name']?.['data']?.['date'])) {
                logObj['Date'] = moment(
                    eachData?.['name']?.['data']?.['date'] * 1000,
                ).format('L')
                logObj['Time'] = moment(
                    eachData?.['name']?.['data']?.['date'] * 1000,
                ).format('hh:mm:ss A')
            } else if (eachData?.['name']?.['data']?.['date']) {
                logObj['Date'] = eachData?.['name']?.['data']?.['date'].split(',')[0]
                logObj['Time'] = eachData?.['name']?.['data']?.['date'].split(',')[1]
            } else {
                logObj['Date'] = ''
                logObj['Time'] = ''
            }
            logObj['User'] = eachData?.['name']?.['data']?.['user'].split(':')[0]
            logObj['User ID'] = eachData?.['name']?.['data']?.['user'].split(':')[1]
            logObj['Action'] = eachData?.['name']?.['data']?.['action']
            logObj['Record'] = eachData?.['name']?.['data']?.['record']
            logObj['Target User'] = eachData?.['name']?.['data']?.['targetUserId']
            logObj['Access Device'] = eachData?.['name']?.['data']?.['accessDevice']
            let details
            if (!['block', 'none'].includes(get(eachData, 'name.data.details', ''))) {
                details = get(eachData, 'name.data.details')
            } else if (get(eachData, 'name.data.details') == 'block') {
                let dateStart = moment(
                    eachData?.['name']?.['data']?.['date'] * 1000,
                ).format('L hh:mm:ss A')
                let dateEnd = moment(
                    eachData?.['name']?.['data']?.['dateEnd'] * 1000,
                ).format('L hh:mm:ss A')
                details = `Range Start: ${dateStart} Range End: ${dateEnd}`
            } else {
                details = ''
            }
            // compatible with data that is no detail
            if (eachData?.['name']?.['data']?.['amendment']) {
                logObj['Details'] = details.concat(
                    eachData?.['name']?.['data']?.['amendment'],
                )
            } else {
                logObj['Details'] = details
            }

            handledArray.push(logObj)
        })
        return handledArray
    },
    // 导入商品csv
    handleProductionCsvData({ originalArray }: { originalArray: {}[] }) {
        let handledArray: {}[] = []
        let errorArray: string[] = []
        const typeColorObj = {
            'Durable Medical Equipment': '0xf88f00',
            Medication: '0xfa5051',
            Nutrition: '0xfecd53',
            'Vital Devices': '0x157ce3',
        }
        const statusObj = {
            Draft: '0xf9bb4d',
            Active: '0x2fb355',
            Archived: '0x4b5266',
        }
        const tageObj = { Draft: 0, Active: 1, Archived: 2 }
        originalArray.forEach((eachData) => {
            let optionArr = [
                { key: 'Option1 Name', value: eachData?.['Option1 Value'] },
                { key: 'Option2 Name', value: eachData?.['Option2 Value'] },
                { key: 'Option3 Name', value: eachData?.['Option3 Value'] },
                { key: 'Option4 Name', value: eachData?.['Option4 Value'] },
            ]
            if (_.find(handledArray, { handle: eachData?.['Handle*'] })) {
                let handleData = _.find(handledArray, { handle: eachData?.['Handle*'] })
                let variantsObj: {} = {}
                let combination: string[] = []
                let innerOptions: {} = {}
                variantsObj['title'] = eachData['Variant Stock']
                set(variantsObj, `data.costPerItem`, eachData['Variant Cost per Item'])
                set(variantsObj, `data.barcode`, eachData['Variant Barcode'])
                set(variantsObj, `data.price`, eachData['Variant Price'])
                set(variantsObj, `data.sku`, eachData['Variant SKU'])
                optionArr.forEach((eachOption) => {
                    if (eachOption['value']) {
                        innerOptions[eachData[eachOption['key']]] = eachOption['value']
                        combination.push(eachOption['value'])
                    }
                })
                set(variantsObj, `data.options`, innerOptions)
                set(variantsObj, `data.combination`, combination.join('/'))
                handleData?.['name']['data']?.['variants'].push(variantsObj)
                if (
                    isArray(handleData?.['name']?.['data']?.['options']?.['optionsValue'])
                ) {
                    let optionsValue: {}[] =
                        handleData?.['name']?.['data']?.['options']?.['optionsValue']
                    optionsValue.forEach((data) => {
                        optionArr.forEach((each) => {
                            if (data['styleName'] == eachData[each['key']]) {
                                if (!_.find(data['styleValue'], { value: each['value'] })) {
                                    let styleValueObj: {} = {}
                                    styleValueObj['value'] = each['value']
                                    styleValueObj['color'] = '0x333333'
                                    styleValueObj['borderStyle'] = 'none'
                                    data['styleValue'].push(styleValueObj)
                                }
                            }
                        })
                    })
                }
            } else {
                if (
                    !(
                        eachData?.['Handle*'] &&
                        eachData?.['Title*'] &&
                        eachData?.['Standardized Product Type*'] &&
                        eachData?.['Introduction*'] &&
                        eachData?.['Price*'] &&
                        eachData?.['Expedited*'] &&
                        eachData?.['Standard*'] && 
                        eachData?.['Cost per Item*']
                    )
                )
                    errorArray.push(eachData?.['Title*'])
                let obj = {}
                set(obj, `handle`, eachData?.['Handle*'])
                set(obj, `name.title`, eachData?.['Inventory Count'])
                set(obj, `name.data.basicInfo.title`, eachData?.['Title*'])
                if (
                    ![
                        'Durable Medical Equipment',
                        'Medication',
                        'Nutrition',
                        'Vital Devices',
                    ].includes(eachData?.['Standardized Product Type*'])
                )
                    errorArray.push(eachData?.['Standardized Product Type*'])
                eachData?.['Standardized Product Type*'] == 'Durable Medical Equipment'
                    ? set(obj, `name.data.basicInfo.type`, 'DME')
                    : set(
                        obj,
                        `name.data.basicInfo.type`,
                        eachData?.['Standardized Product Type*'],
                    )

                set(
                    obj,
                    `name.data.basicInfo.typeColor`,
                    get(typeColorObj, obj['name']?.['data']?.['basicInfo']?.['type']),
                )
                set(obj, `name.data.basicInfo.vendor`, '')
                set(obj, `name.data.basicInfo.productDirection`, eachData?.['Product Directions'])
                set(obj, `name.data.basicInfo.manufacturer`, eachData?.['Manufacturer'])
                set(obj, `name.data.basicInfo.introduction`, eachData?.['Introduction*'])
                set(obj, `name.data.basicInfo.productStatus.value`, 'Draft')
                set(
                    obj,
                    `name.data.basicInfo.productStatus.color`,
                    get(
                        statusObj,
                        obj?.['name']?.['data']?.['basicInfo']?.['productStatus']?.[
                        'value'
                        ],
                    ),
                )
                set(
                    obj,
                    `tage`,
                    get(
                        tageObj,
                        obj?.['name']?.['data']?.['basicInfo']?.['productStatus']?.[
                        'value'
                        ],
                    ),
                )
                set(obj, `name.data.media`, '')
                set(obj, `name.data.pricing.price`, eachData?.['Price*'])
                set(obj, `name.data.pricing.costPerItem`, eachData?.['Cost per Item*'])
                set(obj, `name.data.pricing.MRSP`, eachData?.['MRSP'])
                set(obj, `name.data.pricing.isChargeTax`, '')
                set(obj, `name.data.inventory.sku`, eachData?.['SKU'])
                set(obj, `name.data.inventory.barcode`, eachData?.['Barcode'])
                set(obj, `name.data.inventory.isOutStockContinueSell`, false)
                set(
                    obj,
                    `name.data.inventory.inventoryLocation`,
                    '1000 S Anaheim Blvd Ste 306 Anaheim, CA 92805',
                )
                set(obj, `name.data.shipping.isPickUp`, true)
                set(obj, `name.data.shipping.pickUpMethod`, 'sameInventory')
                set(obj, `name.data.shipping.pickUpLocation`, {})
                eachData?.['Standardized Product Type*'] == 'Vital Devices'
                    ? set(obj, `name.data.shipping.isPhysicalProduct`, false)
                    : set(obj, `name.data.shipping.isPhysicalProduct`, true)
                set(obj, `name.data.shipping.weight`, eachData?.['Weight'])
                set(obj, `name.data.shipping.weightUnit`, eachData?.['Weight Unit'])
                set(
                    obj,
                    `name.data.shipping.nextDayShipping`,
                    eachData?.['Expedited*'],
                )
                set(
                    obj,
                    `name.data.shipping.flagRateShipping`,
                    eachData?.['Standard*'],
                )
                set(obj, `name.data.shipping.manufactured`, '')
                set(obj, `name.data.shipping.length`, eachData?.['Length'])
                set(obj, `name.data.shipping.width`, eachData?.['Width'])
                set(obj, `name.data.shipping.height`, eachData?.['Height'])
                set(obj, `name.data.shipping.heightUnit`, eachData?.['Length Unit'])
                set(obj, `name.data.coverImgId`, '')
                let optionSpliceStr: string[] = []
                let variants: {}[] = []
                let variantsObj: {} = {}
                variantsObj['title'] = eachData['Variant Stock']
                set(variantsObj, `data.costPerItem`, eachData['Variant Cost per Item'])
                set(variantsObj, `data.barcode`, eachData['Variant Barcode'])
                set(variantsObj, `data.price`, eachData['Variant Price'])
                set(variantsObj, `data.sku`, eachData['Variant SKU'])
                set(obj, `name.data.options.isHasOptions`, false)
                optionArr.forEach((element) => {
                    if (element.value) {
                        optionSpliceStr.push(eachData[element.key])
                        set(obj, `name.data.options.isHasOptions`, true)
                    }
                })
                let optionsValue: {}[] = []
                let innerOptions: {} = {}
                let combination: string[] = []
                optionSpliceStr.forEach((data) => {
                    let styleObj = {}
                    let styleValue: {}[] = []
                    styleObj['styleName'] = data
                    if (!['Color', 'Size', 'Material', 'Style'].includes(data))
                        errorArray.push(data)
                    let styleValueObj = {}
                    optionArr.forEach((each) => {
                        if (data == eachData[each['key']]) {
                            styleValueObj['value'] = each['value']
                            innerOptions[data] = each['value']
                            combination.push(each['value'])
                        }
                    })
                    styleValueObj['color'] = '0x333333'
                    styleValueObj['borderStyle'] = 'none'
                    styleValue.push(styleValueObj)
                    styleObj['styleValue'] = styleValue
                    optionsValue.push(styleObj)
                })
                set(variantsObj, `data.options`, innerOptions)
                set(variantsObj, `data.combination`, combination.join('/'))
                variants.push(variantsObj)
                obj?.['name']?.['data']?.['options']?.['isHasOptions']
                    ? set(obj, `name.data.variants`, variants)
                    : set(obj, `name.data.variants`, [])
                set(obj, `name.data.options.optionsValue`, optionsValue)
                set(obj, `name.data.options.optionSpliceStr`, optionSpliceStr.join('/'))
                handledArray.push(obj)
            }
        })
        if (errorArray.length) return errorArray
        return handledArray
    },
    // 导出商品csv
    async handleOutCsvData() {
        let handledArray: {}[] = []
        // get the inventory list
        const facilityId = localStorage.getItem('user_vid') as string
        const options: any = {
            type: 197121,
            xfname: 'ovid',
            obfname: "mtime",
            maxcount: "1000",
            asc: false,
        }
        const docResponse2 = await store.level2SDK.documentServices.retrieveDocument({
            idList: [facilityId],
            options: options,
        })
        const documents: Array<Object> = docResponse2.data.document
        let originalArray = await Promise.all(
            documents.map(async (doc) => {
                let note: any
                try {
                    note = await documentToNote({ document: doc })
                } catch (error) {
                    const err =
                        error instanceof Error ? error : new Error(String(error))
                }
                return note
            })
        ) as []
        originalArray.forEach((eachData) => {
            if (eachData?.['name']?.['data']?.['options']?.['isHasOptions']) {
                let variantArray: {}[] = eachData?.['name']?.['data']?.['variants']
                variantArray.forEach((variant, variantIndex) => {
                    let productObj: {} = {}
                    if (variantIndex == 0) {
                        productObj['Title*'] = get(eachData, 'name.data.basicInfo.title')
                        productObj['Standardized Product Type*'] = 
                            get(eachData, 'name.data.basicInfo.type') == 'DME'
                            ? 'Durable Medical Equipment'
                            : get(eachData, 'name.data.basicInfo.type')
                        // productObj["Vendor"] = get(eachData,"name.data.basicInfo.vendor")
                        productObj['Introduction*'] = get(
                            eachData,
                            'name.data.basicInfo.introduction',
                        )
                        productObj['Price*'] = get(eachData, 'name.data.pricing.price')
                        productObj['Cost per Item*'] = get(
                            eachData,
                            'name.data.pricing.costPerItem',
                        )
                        productObj['MRSP'] = get(eachData, 'name.data.pricing.MRSP')
                        productObj['SKU'] = get(eachData, 'name.data.inventory.sku')
                        productObj['Barcode'] = get(eachData, 'name.data.inventory.barcode')
                        productObj['Inventory Count'] = get(eachData, 'name.title')
                        productObj['Length'] = get(eachData, 'name.data.shipping.length')
                        productObj['Width'] = get(eachData, 'name.data.shipping.width')
                        productObj['Length Unit'] = get(
                            eachData,
                            'name.data.shipping.heightUnit',
                        )
                        productObj['Height'] = get(eachData, 'name.data.shipping.height')
                        productObj['Weight'] = get(eachData, 'name.data.shipping.weight')
                        productObj['Weight Unit'] = get(
                            eachData,
                            'name.data.shipping.weightUnit',
                        )
                        productObj['Expedited*'] = get(
                            eachData,
                            'name.data.shipping.nextDayShipping',
                        )
                        productObj['Standard*'] = get(
                            eachData,
                            'name.data.shipping.flagRateShipping',
                        )                
                        productObj['Manufacturer'] = get(
                            eachData,
                            'name.data.basicInfo.manufacturer',
                        ) || ""             
                        productObj['Product Directions'] = get(
                            eachData,
                            'name.data.basicInfo.productDirection',
                        ) || ""  
                        
                    } else {
                        productObj['Title*'] = ''
                        productObj['Standardized Product Type*'] = ''
                        productObj['Manufacturer'] = ''
                        productObj['Introduction*'] = ''
                        productObj['Price*'] = ''
                        productObj['Product Directions'] = ''
                        productObj['Cost per Item*'] = ''
                        productObj['MRSP'] = ''
                        productObj['SKU'] = ''
                        productObj['Barcode'] = ''
                        productObj['Inventory Count'] = ''
                        productObj['Length'] = ''
                        productObj['Width'] = ''
                        productObj['Length Unit'] = ''
                        productObj['Height'] = ''
                        productObj['Weight'] = ''
                        productObj['Weight Unit'] = ''
                        productObj['Expedited*'] = ''
                        productObj['Standard*'] = ''
                    }
                    (productObj['Handle*'] = get(eachData, 'name.data.basicInfo.title') as string) //+"-"+get(eachData,"name.data.basicInfo.vendor"))
                        .toLowerCase()
                        .replace(/\s/g, '-')
                    productObj['Option1 Name'] = 'Color'
                    productObj['Option2 Name'] = 'Size'
                    productObj['Option3 Name'] = 'Material'
                    productObj['Option4 Name'] = 'Style'
                    let optionStr: string, optionValue: string, optionsValueArr: []
                    optionsValueArr = get(eachData, 'name.data.options.optionsValue')
                    optionsValueArr.forEach((option, index) => {
                        optionStr = 'Option' + (index + 1) + ' ' + 'Name'
                        optionValue = 'Option' + (index + 1) + ' ' + 'Value'
                        productObj[optionStr] = get(option, 'styleName')
                        productObj[optionValue] = get(
                            variant?.['data']?.['options'],
                            get(option, 'styleName'),
                        )
                    })
                    for (let i = optionsValueArr.length + 1; i <= 4; i++) {
                        optionStr = 'Option' + i + ' ' + 'Name'
                        productObj[optionStr] = ''
                        optionValue = 'Option' + i + ' ' + 'Value'
                        productObj[optionValue] = ''
                    }
                    productObj['Variant Price'] = get(variant, 'data.price') || ''
                    productObj['Variant Cost per Item'] = get(variant, 'data.costPerItem') || ''
                    productObj['Variant Stock'] = get(variant, 'title') || ''
                    productObj['Variant SKU'] = get(variant, 'data.sku') || ''
                    productObj['Variant Barcode'] = get(variant, 'data.barcode') || ''
                    handledArray.push(productObj)
                })
            } else {
                let productObj: {} = {}
                productObj['Title*'] = get(eachData, 'name.data.basicInfo.title')
                // productObj["Vendor"] = get(eachData,"name.data.basicInfo.vendor")
                productObj['Handle*'] = (
                    get(eachData, 'name.data.basicInfo.title') +
                    '-' +
                    get(eachData, 'name.data.basicInfo.vendor')
                )
                    .toLowerCase()
                    .replace(/\s/g, '-')
                productObj['Standardized Product Type*'] = 
                    get(eachData, 'name.data.basicInfo.type') == 'DME'
                    ? 'Durable Medical Equipment'
                    : get(eachData, 'name.data.basicInfo.type')
                productObj['Introduction*'] = get(
                    eachData,
                    'name.data.basicInfo.introduction',
                )
                productObj['Price*'] = get(eachData, 'name.data.pricing.price')
                productObj['Cost per Item*'] = get(
                    eachData,
                    'name.data.pricing.costPerItem',
                )
                productObj['MRSP'] = get(eachData, 'name.data.pricing.MRSP')
                productObj['SKU'] = get(eachData, 'name.data.inventory.sku')
                productObj['Barcode'] = get(eachData, 'name.data.inventory.barcode')
                productObj['Inventory Count'] = get(eachData, 'name.title')
                productObj['Length'] = get(eachData, 'name.data.shipping.length')
                productObj['Width'] = get(eachData, 'name.data.shipping.width')
                productObj['Length Unit'] = get(
                    eachData,
                    'name.data.shipping.heightUnit',
                )
                productObj['Height'] = get(eachData, 'name.data.shipping.height')
                productObj['Weight'] = get(eachData, 'name.data.shipping.weight')
                productObj['Weight Unit'] = get(
                    eachData,
                    'name.data.shipping.weightUnit',
                )
                productObj['Expedited*'] = get(
                    eachData,
                    'name.data.shipping.nextDayShipping',
                )
                productObj['Standard*'] = get(
                    eachData,
                    'name.data.shipping.flagRateShipping',
                )
                productObj['Manufacturer'] = get(
                    eachData,
                    'name.data.basicInfo.manufacturer',
                ) || "" 
                productObj['Product Directions'] = get(
                    eachData,
                    'name.data.basicInfo.productDirection',
                ) || "" 
                productObj['Option1 Name'] = ''
                productObj['Option2 Name'] = ''
                productObj['Option3 Name'] = ''
                productObj['Option4 Name'] = ''
                productObj['Option1 Value'] = ''
                productObj['Option2 Value'] = ''
                productObj['Option3 Value'] = ''
                productObj['Option4 Value'] = ''
                productObj['Variant Price'] = ''
                productObj['Variant Cost per Item'] = ''
                productObj['Variant Stock'] = ''
                productObj['Variant SKU'] = ''
                productObj['Variant Barcode'] = ''
                handledArray.push(productObj)
            }
        })
        return handledArray
    },
    // 导入payer 列表的csv
    /**
     * 
     * @param {array} csvData 
     * @param {array} payerAll
     * @returns {object}   
     * 返回的参数：
     * otherError: 有空值或者等其他错误
     * repeatError: csv内部有重复
     * createArr: 需要创建的数组
     * updateArr: 需要更新的数组->可用来判断是否和当前列表已有的payer重复
     */
    handlePayerCsvData({ csvData, payerAll}:{ csvData: {}[], payerAll: {}[]}){
        let createArr: {}[] = [] 
        let updateArr: {}[] = [] 
        for (let index = 0; index < csvData.length; index++) {
            const eachData = csvData[index];
            let eachObj:{} = {}
            // 判断是否有空值
            if(!(
                get(eachData,"Address Line*") &&
                get(eachData,"Billing Type*") &&
                get(eachData,"City*") &&
                get(eachData,"Payer Name*") &&
                get(eachData,"Payer Type*") &&
                get(eachData,"State*") && 
                get(eachData,"Zip Code*")
            )){
                return {
                    otherError: true,
                    repeatError: false,
                    createArr,
                    updateArr
                }
            }
            if(get(eachData,"Billing Type*") === "EDI" && get(eachData,"Payer ID*")===""){
                return {
                    otherError: true,
                    repeatError: false,
                    createArr,
                    updateArr
                }
            }
            // 设置对应的值
            set(eachObj,"name.data.address1",get(eachData,"Address Line*"))
            set(eachObj,"name.data.address2",get(eachData,"Address Second Line"))
            set(eachObj,"name.data.billingType",get(eachData,"Billing Type*"))
            set(eachObj,"name.data.city",get(eachData,"City*"))
            set(eachObj,"name.data.contact",get(eachData,"Contact"))
            set(eachObj,"name.data.email",get(eachData,"Email"))
            set(eachObj,"name.data.fax",get(eachData,"Fax#"))
            set(eachObj,"name.data.insuranceType",get(eachData,"Insurance Type*"))
            set(eachObj,"name.data.payerID",get(eachData,"Payer ID*")||"")
            set(eachObj,"name.data.payerName",get(eachData,"Payer Name*"))
            set(eachObj,"name.data.payerType",get(eachData,"Payer Type*"))
            set(eachObj,"name.data.phone",get(eachData,"Phone#"))
            set(eachObj,"name.data.state",get(eachData,"State*"))
            set(eachObj,"name.data.zip",get(eachData,"Zip Code*"))
            set(eachObj,"type",get(eachData,"Payer Type*")==="Insurance"?314880:314881)
            set(eachObj,"title","PayerInfo")
            let fullAddress = [
                    get(eachData,"Address Line*"),
                    get(eachData,"Address Second Line"),
                    get(eachData,"City*"),
                    get(eachData,"State*"),
                    get(eachData,"Zip Code*")
                ]
            set(eachObj,"name.data.fullAddress",fullAddress.filter(item=>{
                if(item) return item
            }).join(","))
            
            if(createArr.length){
                // 判断是否完全一致
                for (let i = 0; i < createArr.length; i++) {
                    const element = createArr[i];
                    if(
                        get(element,"name.data.payerName")==get(eachObj,"name.data.payerName") &&
                        get(element,"name.data.payerID")==get(eachObj,"name.data.payerID") &&
                        get(element,"name.data.address1")==get(eachObj,"name.data.address1") &&
                        get(element,"name.data.city")==get(eachObj,"name.data.city") &&
                        get(element,"name.data.state")==get(eachObj,"name.data.state") &&
                        get(element,"name.data.zip")==get(eachObj,"name.data.zip")
                    ){ 
                        return {
                            otherError: false,
                            repeatError: true,
                            createArr,
                            updateArr
                        }
                    }
                }
            }

            let updateFlag:boolean = false
            for (let i = 0; i < payerAll.length; i++) {
                const element = payerAll[i];
                if(
                    get(element,"name.data.payerName")==get(eachObj,"name.data.payerName") &&
                    get(element,"name.data.payerID")==get(eachObj,"name.data.payerID") &&
                    get(element,"name.data.address1")==get(eachObj,"name.data.address1") &&
                    get(element,"name.data.city")==get(eachObj,"name.data.city") &&
                    get(element,"name.data.state")==get(eachObj,"name.data.state") &&
                    get(element,"name.data.zip")==get(eachObj,"name.data.zip")
                ){ 
                    updateFlag = true
                    eachObj = {...element,...eachObj}
                    break
                }else{
                    updateFlag = false
                }
            }
            updateFlag ? updateArr.push(eachObj) : createArr.push(eachObj)   
               
        }
        return {
            otherError: false,
            repeatError: false,
            createArr,
            updateArr
        }
    },
    handleProcedureCodeCsvData(
        { 
            csvData, procedureCodeAll, posList, modifierList
        } : {
            csvData: {}[], procedureCodeAll: {}[], posList: string[], modifierList: string[]
        }){
            let createArr:{}[] = []
            for (let i = 0; i < csvData.length; i++) {
                const element = csvData[i];
                let procedureObj: {} = {}
                // 判断是否有错误
                if(!(
                    element["Code Number*"] && element["Description*"] && element["Charge*"] && 
                    (["CPT","HCPCS"].includes(element["Code Type"])) 
                )){
                    return {
                        otherError: true,
                        createArr
                    }
                }
                if(["CPT","HCPCS"].includes(element["Code Type"])){
                    set(procedureObj,"type","CPT"===element["Code Type"]?309760:312320)
                }else{
                    return {
                        otherError: true,
                        createArr
                    }
                }
                if(element["Requires NDC code(N4 Qualifier will be automatically added)"] == "Yes"){
                    
                    if(element["NDC Code"].replace(/[\"\']/g,"").length <= 11){
                        set(procedureObj,"name.data.isRequireNdc",true)
                        set(
                            procedureObj,
                            "name.data.ndc.ndcCode",
                            element["NDC Code"].replace(/[\"\']/g,"").length < 11 ? 
                                `${repeat("0",11-element["NDC Code"].replace(/[\"\']/g,"").length)}${element["NDC Code"].replace(/[\"\']/g,"")}` : 
                                element["NDC Code"].replace(/[\"\']/g,"") 
                        )
                        set(procedureObj,"name.data.ndc.ndcUnits",element["NDC Units"])
                        set(procedureObj,"name.data.ndc.quantity",element["Quantity Qualifier"])
                    }else{
                        return {
                            otherError: true,
                            createArr
                        }  
                    }
                }else{
                    set(procedureObj,"name.data.isRequireNdc",false)
                    set(procedureObj,"name.data.ndc.ndcCode","")
                    set(procedureObj,"name.data.ndc.ndcUnits","")
                    set(procedureObj,"name.data.ndc.quantity","")
                }
                
                if(element["Quantity"] && isNumber(+element["Quantity"])){
                    if((+element["Quantity"])>0){
                        set(procedureObj,"name.data.quantity",element["Quantity"])
                    }else{
                        set(procedureObj,"name.data.quantity","1")
                    }
                }else{
                    return {
                        otherError: true,
                        createArr
                    }  
                }
                function findRepeat(originArr, path,value, suffix) {
                    if (find(originArr,
                        each => {
                            if (suffix === 0) {
                                return get(each, path) === value
                            } else {
                                return get(each, path) === `${value}#${suffix}`
                            }
                        })) {
                        return findRepeat(originArr, path, value, suffix + 1)
                    } else {
                        if (suffix === 0) return value.replaceAll("\"", "")
                        return `${value}#${suffix}`
                    }
                }
                set(procedureObj,"name.data.charge",element["Charge*"].replace(/[\"\']/g,""))
                set(
                    procedureObj,
                    "name.data.code", 
                    element["Code Number*"].replace(/[\"\']/g,"").length < 5 ? 
                        `${repeat("0",5-element["Code Number*"].replace(/[\"\']/g,"").length)}${element["Code Number*"].replace(/[\"\']/g,"")}` :
                        element["Code Number*"].replace(/[\"\']/g,"")
                    )
                set(procedureObj,"name.data.description",element["Description*"])
                set(procedureObj,"name.data.folder",element["Category"] ? element["Category"] : "Default") // 如果文件夹没填就带入默认
                set(procedureObj,"name.data.hashCode",fcm.getAPPID({ appName: [customAlphabet("0123456789", 13)(),"name","mtime","type"].join(',') }))
                set(procedureObj,"name.data.icd",{"icd1": "" ,"icd2": "" ,"icd3": "" ,"icd4": "" })
                let inputMod = [element["Mod1"],element["Mod2"],element["Mod3"],element["Mod4"]]
                let modLi:string[] = []
                inputMod.forEach(eachMod => {
                    if(eachMod){
                        modifierList.forEach(modifier => {
                            if(eachMod===modifier){
                                modLi.push(modifier)
                            }else{
                                if( modifier.split("-")[0].trim() === eachMod?.split("-")?.[0]?.trim()){
                                    modLi.push(modifier)
                                }
                            }
                        });
                    }
                });
                set(procedureObj,"name.data.modifiers",modLi)
                set(procedureObj,"name.data.num",modLi.length)
                set(procedureObj,"name.data.panelCode",findRepeat(procedureCodeAll,"panelCode",element["Code Number*"].replace(/[\"\']/g,""),0))      
                set(
                    procedureObj,
                    "name.data.panelCode",
                    findRepeat(
                        createArr,
                        "name.data.panelCode",
                        get(procedureObj,"name.data.panelCode", '').split("#")[0],
                        get(procedureObj,"name.data.panelCode", '').split("#")[1]?+get(procedureObj,"name.data.panelCode", '').split("#")[1]:0
                    )
                )
                // 设置pos
                if(element["POS"]){
                    for (let index = 0; index < posList.length; index++) {
                        const eachPos = posList[index];
                        if(eachPos.split("-")[0].trim() === element["POS"].replace(/[\"\']/g,"")?.split("-")?.[0]?.trim()){
                            set(procedureObj,"name.data.pos",eachPos)
                            break
                        }
                        if(index===(posList.length-1)){
                            set(procedureObj,"name.data.pos",element["POS"].replace(/[\"\']/g,""))
                        }
                    }
                }else{
                    set(procedureObj,"name.data.pos","")
                }
                set(
                    procedureObj,
                    "name.data.revenueCode",
                    element["Revenue Code"].replace(/[\"\']/g,"").length < 4?
                        `${repeat("0",4-element["Revenue Code"].replace(/[\"\']/g,"").length)}${element["Revenue Code"].replace(/[\"\']/g,"")}` : 
                        element["Revenue Code"].replace(/[\"\']/g,"") 
                    )                        
                set(procedureObj,"title","Procedure Code")
                createArr.push(procedureObj)
            }
            return {
                otherError: false,
                createArr
            }
    },
    async handleProCodeCategory({ codeList , categoryList , eid }:{ codeList: {}[], categoryList: {}[] ,eid: string }){
        let ctCategoryList: string[] = []
        // 过滤出所有的需要新建的category
        codeList.forEach(eachCode => {
            let categoryObj = find(categoryList,eachCategory=> get(eachCategory,"name.data.category") === get(eachCode,"name.data.folder"))
            if(!categoryObj){
                ctCategoryList.push(get(eachCode,"name.data.folder", ''))
            }
        });
        const newCateGoryList = await Promise.all(uniq(ctCategoryList).map( async eachCategory=> {
            const createCategoryResp = await Document.nocheckcreate({
                edge_id: eid,
                content: {
                    category: eachCategory,
                    hashCode: fcm.getAPPID({ appName: ["name","mtime","type", Date.now()].join(',') })
                },
                title: "Procedure Category",
                mediaType: 'application/json',
                type: 320000,
                atimes: -10,
            })
            return replaceUint8ArrayWithBase64(createCategoryResp["doc"])        
        }))
        categoryList = [...categoryList,...newCateGoryList]
        const newCodeList = codeList.map(eachCode => {
            const category = get(eachCode,"name.data.folder")
            const categoryObj = find(categoryList,eachCategory=> get(eachCategory,"name.data.category") === category)
            set(eachCode,"reid",get(categoryObj,"id"))
            set(eachCode,"name.data.folderHashCode",get(categoryObj,"name.data.hashCode"))
            return eachCode
        })
        return {codeList: newCodeList,newCateGoryList}
    },    
   
    handleOutProcedureCsvData({ originArray }:{ originArray:{}[] }){
        let exportArray: {}[] = []
        if(originArray.length){
            originArray.forEach(eachCode => {
                let exportObj = {
                    "Code Number*": `'${get(eachCode,"code")}'`,
                    "Description*": get(eachCode,"description"),
                    "Charge*": get(eachCode,"charge"),
                    "Code Type": get(eachCode,"type")===309760 ? "CPT":"HCPCS",
                    "Quantity": get(eachCode,"quantity"),
                    "Category": get(eachCode,"folder"),
                    "POS": get(eachCode,"pos"),
                    "Revenue Code": get(eachCode,"revenueCode") ? `'${get(eachCode,"revenueCode")}'` : "" ,
                    "Mod1": get(eachCode,"modifiers", [])[0] || "",
                    "Mod2": get(eachCode,"modifiers", [])[1] || "",
                    "Mod3": get(eachCode,"modifiers", [])[2] || "",
                    "Mod4": get(eachCode,"modifiers", [])[3] || "",
                    "Requires NDC code(N4 Qualifier will be automatically added)": (get(eachCode,"isRequireNdc") || false) ? "Yes":"No",
                    "NDC Code": get(eachCode,"ndc.ndcCode") ? `'${get(eachCode,"ndc.ndcCode")}'` : "" ,
                    "Quantity Qualifier": get(eachCode,"ndc.quantity") || "",
                    "NDC Units": get(eachCode,"ndc.ndcUnits") || "" ,
                } 

                exportArray.push(exportObj)
            });
            return exportArray
        }
    },
    handleOutPayerCsvData({ originArray }:{ originArray:{}[] }){
        let exportArray: {}[] = []
        if(originArray.length){
            originArray.forEach(eachPayer => {
                let exportObj = {
                    "Payer Name*": get(eachPayer,"payerName"),
                    "Payer ID*": get(eachPayer,"payerID"),
                    "Payer Type*": get(eachPayer,"payerType"),
                    "Address Line*": get(eachPayer,"address1"),
                    "Address Second Line": get(eachPayer,"address2"),
                    "City*": get(eachPayer,"city"),
                    "State*": get(eachPayer,"state"),
                    "Zip Code*": get(eachPayer,"zip"),
                    "Billing Type*": get(eachPayer,"billingType"),
                    "Insurance Type*": get(eachPayer,"insuranceType"),
                    "Contact": get(eachPayer,"contact"),
                    "Email": get(eachPayer,"email"),
                    "Phone#": get(eachPayer,"phone"),
                    "Fax#": get(eachPayer,"fax"),
                } 
                exportArray.push(exportObj)
            });
            return exportArray
        }
    },
    handlePrePatdCsvData({ originArray }:{ originArray: {}[] }){
        let handleData:{}[] = []
        // 处理phone-> 去除-,没有countryCode则+1,有跳过
        function phoneTrim(phone: string): string {
            if (!phone) return phone
            phone = includes(phone, "-") ? phone.replaceAll("-", "") : phone
            phone = includes(phone, "+") ? phone : `+1 ${phone}`
            return phone
        }        
        for (let i = 0; i < originArray.length; i++) {
            const eachPat = originArray[i];
            if(!(
                get(eachPat,"Patient First Name*") && 
                get(eachPat,"Patient Last Name*") && 
                get(eachPat,"Patient Date of Birth*") && 
                get(eachPat,"Patient Gender(Male/Female/Other)*")
            )){
                return {
                    otherError: true,
                    handleData
                }
            }

            // 处理alternate phone
            let alternatePhone = get(eachPat,"Patient Alternate Phone #", '')
            let countryCode,phoneNumber
            if(alternatePhone){
                if(alternatePhone.split(" ")[1]){
                    countryCode = alternatePhone.split(" ")[0]
                    phoneNumber = alternatePhone.split(" ")[1]
                }else{
                    countryCode = "+1"
                    phoneNumber = alternatePhone.split(" ")[0]
                }
            }
            alternatePhone = countryCode ? `${countryCode} ${phoneNumber}` : "" 
            alternatePhone = phoneTrim(alternatePhone)
            let phone = phoneTrim(get(eachPat,"Patient Phone Number", ''))
            // 处理male/Female
            let gender 
            switch (get(eachPat,"Patient Gender(Male/Female/Other)*", '' as any)) {
                case "F":
                    gender = "Female"
                    break;
                case "M": 
                    gender = "Male"
                    break;
                default:
                    gender = get(eachPat,"Patient Gender(Male/Female/Other)*")
                    break;
            }
            // patObj => patient profile
            let patObj:{} = {
                "isFirstCreateProfile": false,
                "version": 2,
                "insuranceId": "",
                "basicInfo": {
                    "avatar": "",
                    "phone":  phone ? phone : alternatePhone,
                    "firstName": get(eachPat,"Patient First Name*"),
                    "middleName": get(eachPat,"Patient Middle Name"),
                    "lastName": get(eachPat,"Patient Last Name*"),
                    "dateOfBirth": get(eachPat,"Patient Date of Birth*"),
                    "gender": gender,
                    "socialSecurity": get(eachPat,"Patient Social Security #"),
                    "fullName": remove([
                        get(eachPat, "Patient First Name*"),
                        get(eachPat, "Patient Middle Name"),
                        get(eachPat, "Patient Last Name*")
                    ], item => item != "").join(" "),
                    "userName": ""
                },
                "contactInfo": {
                    "alternatePhone": {
                        "countryCode": countryCode || "",
                        "phoneNumber": phoneNumber || "",
                        "fullPhone": alternatePhone
                    },
                    "email": get(eachPat,"Patient Email"),
                    "address": {
                        "line": get(eachPat,"Patient Street Line 1"),
                        "secondLine": get(eachPat,"Patient Street Line 2"),
                        "city": get(eachPat,"Patient City"),
                        "county": get(eachPat,"Patient County"),
                        "state": get(eachPat,"Patient State"),
                        "zipCode": get(eachPat,"Patient Zip"),
                        "fullAddress": remove([
                            get(eachPat, "Patient Street Line 1"),
                            get(eachPat, "Patient Street Line 2"),
                            get(eachPat, "Patient City"),
                            get(eachPat, "Patient County"),
                            get(eachPat, "Patient State"),
                            get(eachPat, "Patient Zip")
                        ], item => item != "").join(",")
                    }
                },
                "emergencyContact": {
                    "firstName": get(eachPat,"Emergency Contact First Name"),
                    "middleName": get(eachPat,"Emergency Contact Middle Name"),
                    "lastName": get(eachPat,"Emergency Contact Last Name"),
                    "relation": get(eachPat,"Emergency Contact Relation"),
                    "phone": {
                        "countryCode": get(eachPat,"Emergency Contact Phone #", '').split(" ")[0] || "",
                        "phoneNumber": get(eachPat,"Emergency Contact Phone #", '').split(" ")[1] || "",
                        "fullPhone": get(eachPat,"Emergency Contact Phone #")
                    }
                },
                "identification": {
                    "type": get(eachPat,"Patient ID Type"),
                    "id": get(eachPat,"Patient ID Number"),
                    "imageId": "",
                },
                "employment": {
                    "employerName": "",
                    "dept": "",
                    "NatureBusiness": "",
                    "Occupation": "",
                    "Telephone": "",
                    "fax": "",
                    "email": "",
                    "address": {
                        "fullAddress": "",
                        "line": "",
                        "secondLine": "",
                        "city": "",
                        "county": "",
                        "state": "",
                        "zipCode": ""
                    }
                },
                "shoppingAddressId": "",
                "attorneysInfo": {
                    "name": "",
                    "phone": "",
                    "fax": "",
                    "address": {
                        "fullAddress": "",
                        "line": "",
                        "secondLine": "",
                        "city": "",
                        "county": "",
                        "state": "",
                        "zipCode": ""
                    }
                }
            } 
            let primaryInsurance:object =  get(eachPat,"Primary Medical Insurance Company Name") ? 
                {
                "insuranceInfo": `${get(eachPat,"Primary Medical Insurance Company Name")} - ${get(eachPat,"Primary Insurance ID #")}`,
                "default": true,
                "companyName": get(eachPat,"Primary Medical Insurance Company Name"),
                "planOrMedicalGroup": get(eachPat,"Primary Insurance Plan / Medical Group"),
                "memberName": get(eachPat,"Primary Insured Name"),
                "memberId": get(eachPat,"Primary Insurance ID #"),
                "groupNumber": get(eachPat,"Primary Group #"),
                "claims": {
                    "address": {
                        "city":  get(eachPat,"Primary Claims City"),
                        "county":  get(eachPat,"Primary Claims County"),
                        "fullAddress": remove([
                            get(eachPat, "Primary Claims Address Line"),
                            get(eachPat, "Primary Claims Address Second Line"),
                            get(eachPat, "Primary Claims City"),
                            get(eachPat, "Primary Claims County"),
                            get(eachPat, "Primary Claims State"),
                            get(eachPat, "Primary Claims Zip Code")
                        ], item => item != "").join(","),
                        "line":  get(eachPat,"Primary Claims Address Line"),
                        "secondLine":  get(eachPat,"Primary Claims Address Second Line"),
                        "state":  get(eachPat,"Primary Claims State"),
                        "zipCode":  get(eachPat,"Primary Claims Zip Code"),
                    }
                },
                "policyNumber": "",
                "policyHolderName": "",
                "relation": get(eachPat,"Primary Relationship to Patient(Self/Spouse/Child/Other)"),
                "relationAddress": {
                    "line": get(eachPat,"Primary Relation Address Line"),
                    "secondLine": get(eachPat,"Primary Relation Address Second Line"),
                    "city": get(eachPat,"Primary Relation City"),
                    "county": get(eachPat,"Primary Relation County"),
                    "state": get(eachPat,"Primary Relation State"),
                    "zipCode": get(eachPat,"Primary Relation Zip Code"),
                    "fullAddress": remove([
                        get(eachPat,"Primary Relation Address Line"),
                        get(eachPat,"Primary Relation Address Second Line"),
                        get(eachPat,"Primary Relation City"),
                        get(eachPat,"Primary Relation County"),
                        get(eachPat,"Primary Relation State"),
                        get(eachPat,"Primary Relation Zip Code")
                    ], item => item != "").join(","),
                },
                "gender": get(eachPat,"Primary Relation Gender(Male/Female/Other)"),
                "relationBirth": get(eachPat,"Primary Relation Date of Birth"),
                "relationName": get(eachPat,"Primary Relation Name"),
                "front_InsuranceCardId": "",
                "back_InsuranceCardId": "",
                } : {} 
            let secondInsurance:object = get(eachPat,"Secondary Medical Insurance Company Name") ?
                 {
                "insuranceInfo": `${get(eachPat,"Secondary Medical Insurance Company Name")} - ${get(eachPat,"Secondary Insurance ID #")}`,
                "default": true,
                "companyName": get(eachPat,"Secondary Medical Insurance Company Name"),
                "planOrMedicalGroup": get(eachPat,"Secondary Insurance Plan / Medical Group"),
                "memberName": get(eachPat,"Secondary Insured Name"),
                "memberId": get(eachPat,"Secondary Insurance ID #"),
                "groupNumber": get(eachPat,"Secondary Group #"),
                "claims": {
                    "address": {
                        "city":  get(eachPat,"Secondary Claims City"),
                        "county":  get(eachPat,"Secondary Claims County"),
                        "fullAddress": remove([
                            get(eachPat, "Secondary Claims Address Line"),
                            get(eachPat, "Secondary Claims Address Second Line"),
                            get(eachPat, "Secondary Claims City"),
                            get(eachPat, "Secondary Claims County"),
                            get(eachPat, "Secondary Claims State"),
                            get(eachPat, "Secondary Claims Zip Code")
                        ], item => item != "").join(","),
                        "line":  get(eachPat,"Secondary Claims Address Line"),
                        "secondLine":  get(eachPat,"Secondary Claims Address Second Line"),
                        "state":  get(eachPat,"Secondary Claims State"),
                        "zipCode":  get(eachPat,"Secondary Claims Zip Code"),
                    }
                },
                "policyNumber": "",
                "policyHolderName": "",
                "relation": get(eachPat,"Secondary Relationship to Patient(Self/Spouse/Child/Other)"),
                "relationAddress": {
                    "line": get(eachPat,"Secondary Relation Address Line"),
                    "secondLine": get(eachPat,"Secondary Relation Address Second Line"),
                    "city": get(eachPat,"Secondary Relation City"),
                    "county": get(eachPat,"Secondary Relation County"),
                    "state": get(eachPat,"Secondary Relation State"),
                    "zipCode": get(eachPat,"Secondary Relation Zip Code"),
                    "fullAddress": remove([
                        get(eachPat,"Secondary Relation Address Line"),
                        get(eachPat,"Secondary Relation Address Second Line"),
                        get(eachPat,"Secondary Relation City"),
                        get(eachPat,"Secondary Relation County"),
                        get(eachPat,"Secondary Relation State"),
                        get(eachPat,"Secondary Relation Zip Code")
                    ], item => item != "").join(","),
                },
                "gender": get(eachPat,"Secondary Relation Gender(Male/Female/Other)"),
                "relationBirth": get(eachPat,"Secondary Relation Date of Birth"),
                "relationName": get(eachPat,"Secondary Relation Name"),
                "front_InsuranceCardId": "",
                "back_InsuranceCardId": "",
                } : {} 
            let workersComp:object =  get(eachPat,"Workers Comp Employer Name") ? 
                {
                "insuranceInfo": `${get(eachPat,"Ins. Co. Name(Claims Administrator)")}-${get(eachPat,"Workers Comp Claim #")}`,
                "dateOfInjury": get(eachPat,"Workers Comp Date of Injury"),
                "employmentInfo": {
                    "name": get(eachPat,"Workers Comp Employer Name"),
                    "dept": get(eachPat,"Dept."),
                    "natureOfBusiness": get(eachPat,"Nature Of Business"),
                    "occupation": get(eachPat,"Occupation"),
                    "telephone": get(eachPat,"Employer Telephone #"),
                    "fax": get(eachPat,"Employer Fax #"),
                    "email": get(eachPat,"Employer Email"),
                    "address": {
                        "line": get(eachPat,"Employer Address Line"),
                        "secondLine": get(eachPat,"Employer Address Second Line"),
                        "city": get(eachPat,"Employer City"),
                        "county": get(eachPat,"Employer County"),
                        "state": get(eachPat,"Employer State"),
                        "zipCode": get(eachPat,"Employer Zip Code"),
                        "fullAddress": remove([
                            get(eachPat,"Employer Address Line"),
                            get(eachPat,"Employer Address Second Line"),
                            get(eachPat,"Employer City"),
                            get(eachPat,"Employer County"),
                            get(eachPat,"Employer State"),
                            get(eachPat,"Employer Zip Code")
                        ], item => item != "").join(","),
                    },
                    "contactName": get(eachPat,"Employer Contact Name"),
                    "contactPhone": get(eachPat,"Employer Contact Phone #"),
                },
                "attorneyInfo": {
                    "name": get(eachPat,"Workers Comp Attorneys Name"),
                    "phone": get(eachPat,"Workers Comp Attorneys Phone #"),
                    "fax": get(eachPat,"Workers Comp Attorneys Fax #"),
                    "email": get(eachPat,"Workers Comp Attorneys Email"),
                    "address": {
                        "line": get(eachPat,"Workers Comp Attorneys Address Line"),
                        "secondLine": get(eachPat,"Workers Comp Attorneys Address Second Line"),
                        "city": get(eachPat,"Workers Comp Attorneys City"),
                        "county": get(eachPat,"Workers Comp Attorneys County"),
                        "state": get(eachPat,"Workers Comp Attorneys State"),
                        "zipCode": get(eachPat,"Workers Comp Attorneys Zip Code"),
                        "fullAddress": remove([
                            get(eachPat,"Workers Comp Attorneys Address Line"),
                            get(eachPat,"Workers Comp Attorneys Address Second Line"),
                            get(eachPat,"Workers Comp Attorneys City"),
                            get(eachPat,"Workers Comp Attorneys County"),
                            get(eachPat,"Workers Comp Attorneys State"),
                            get(eachPat,"Workers Comp Attorneys Zip Code")
                        ], item => item != "").join(","),
                    },
                    "contactName": get(eachPat,"Workers Comp Contact Name"),
                },
                "sendReportTo": {
                    "name": get(eachPat,"Send Report To: Name"),
                    "fax": get(eachPat,"Send Report To: Fax #"),
                    "email": get(eachPat,"Send Report To: Email"),
                    "address": {
                        "line": get(eachPat,"Send Report To: Address Line"),
                        "secondLine": get(eachPat,"Send Report To: Address Second Line"),
                        "city": get(eachPat,"Send Report To: City"),
                        "county": get(eachPat,"Send Report To: County"),
                        "state": get(eachPat,"Send Report To: State"),
                        "zipCode": get(eachPat,"Send Report To: Zip Code"),
                        "fullAddress": remove([
                            get(eachPat,"Send Report To: Address Line"),
                            get(eachPat,"Send Report To: Address Second Line"),
                            get(eachPat,"Send Report To: City"),
                            get(eachPat,"Send Report To: County"),
                            get(eachPat,"Send Report To: State"),
                            get(eachPat,"Send Report To: Zip Code")
                        ], item => item != "").join(","),
                    }
                },
                "insurance": {
                    "companyName": get(eachPat,"Ins. Co. Name(Claims Administrator)"),
                    "claim": get(eachPat,"Workers Comp Claim #"),
                    "address": {
                        "line": get(eachPat,"Workers Comp Claims Address Line"),
                        "secondLine": get(eachPat,"Workers Comp Claims Address Second Line"),
                        "city": get(eachPat,"Workers Comp Claims City"),
                        "county": get(eachPat,"Workers Comp Claims County"),
                        "state": get(eachPat,"Workers Comp Claims State"),
                        "zipCode": get(eachPat,"Workers Comp Claims Zip Code"),
                        "fullAddress": remove([
                            get(eachPat,"Workers Comp Claims Address Line"),
                            get(eachPat,"Workers Comp Claims Address Second Line"),
                            get(eachPat,"Workers Comp Claims City"),
                            get(eachPat,"Workers Comp Claims County"),
                            get(eachPat,"Workers Comp Claims State"),
                            get(eachPat,"Workers Comp Claims Zip Code")
                        ], item => item != "").join(","),
                    },
                    "claimsAdjuster": get(eachPat,"Workers Comp Claims Adjuster"),
                    "adjusterPhone": get(eachPat,"Workers Comp Adjuster Phone #"),
                    "adjusterFax": get(eachPat,"Adjusters Fax #"),
                    "adjusterEmail": get(eachPat,"Adjuster Email"),
                }
                } : {}
            let personalInjury:object =  get(eachPat,"Personal Injury Attorneys Name") ? 
                {
                "dateOfInjury": get(eachPat,"Personal Injury Date of Injury"),
                "attorneyInfo": {
                    "name": get(eachPat,"Personal Injury Attorneys Name"),
                    "phone": get(eachPat,"Personal Injury Attorneys Phone #"),
                    "fax": get(eachPat,"Personal Injury Attorneys Fax #"),
                    "email": get(eachPat,"Personal Injury Attorneys Email"),
                    "address": {
                        "line": get(eachPat,"Personal Injury Attorneys Address Line"),
                        "secondLine": get(eachPat,"Personal Injury Attorneys Address Second Line"),
                        "city": get(eachPat,"Personal Injury Attorneys City"),
                        "county": get(eachPat,"Personal Injury Attorneys County"),
                        "state": get(eachPat,"Personal Injury Attorneys State"),
                        "zipCode": get(eachPat,"Personal Injury Attorneys Zip Code"),
                        "fullAddress": remove([
                            get(eachPat,"Personal Injury Attorneys Address Line"),
                            get(eachPat,"Personal Injury Attorneys Address Second Line"),
                            get(eachPat,"Personal Injury Attorneys City"),
                            get(eachPat,"Personal Injury Attorneys County"),
                            get(eachPat,"Personal Injury Attorneys State"),
                            get(eachPat,"Personal Injury Attorneys Zip Code")
                        ], item => item != "").join(","),
                    },
                    "contactName": get(eachPat,"Personal Injury Contact Name"),
                }
                } : {}
            handleData.push(
                {   
                    title: get(patObj,"basicInfo.phone"),
                    user: get(patObj,"basicInfo.fullName"),
                    nonce: get(patObj,"basicInfo.dateOfBirth"),
                    orderNumber: alternatePhone,
                    data: {
                        patObj,
                        primaryInsurance,
                        secondInsurance,
                        workersComp,
                        personalInjury
                    }
                }
            )
        }
        return {
            otherError: false,
            handleData
        }
    },
    async updateImportProcedureError(){
        const procedureIndexDBList:[] = await indexLocalForage.getItem("procedureCodeIndex") || []
        const procedureCodeDocList:any[] = await Promise.all(procedureIndexDBList.map(async procedureCode => {
            const procedureResp = await store.level2SDK.documentServices.retrieveDocument({idList: [get(procedureCode,"id")]})
            return await documentToNote({document: replaceUint8ArrayWithBase64(procedureResp?.data?.document[0])})
        }))
        // 按照hash code 分组
        const groupProcedureList = procedureCodeDocList.reduce((group, procedure) => {
            group[get(procedure,"name.data.hashCode")] = group[get(procedure,"name.data.hashCode")] || []
            group[get(procedure,"name.data.hashCode")].push(procedure)
            return group
        }, {})
        for(let key in groupProcedureList){
            // 如果hash code 重复
            if(groupProcedureList[key].length !== 1){
                // 遍历数组，且更新对应的hashCode
                const updateProcedureList = await Promise.all(groupProcedureList[key].map(async curProcedureCode => {
                    const {hashCode,...restData} = get(curProcedureCode,"name.data")
                    const randomString = customAlphabet("0123456789", 13)()
                    const updateProcedureResp = await Document.update(curProcedureCode?.id,{
                        atimes: -10,
                        edge_id: get(curProcedureCode,"eid"),
                        content: {
                            hashCode: fcm.getAPPID({ appName: [randomString,"name","mtime","type"].join(',') }),
                            ...restData
                        },
                        paymentNonce: get(curProcedureCode,"nonce"),
                        user: get(curProcedureCode,"name.user"),
                        type: get(curProcedureCode,"type"),
                        title: get(curProcedureCode,"name.title"),
                        tags: get(curProcedureCode,"name.tags"),
                        reid: get(curProcedureCode,"esig"),
                        fid: get(curProcedureCode,"fid"),
                        tage: get(curProcedureCode,"tage"),
                        mediaType: get(curProcedureCode,"name.type"),                        
                        dTypeProps: get(curProcedureCode,"subtype"),
                      })
                    return replaceUint8ArrayWithBase64(updateProcedureResp["doc"])
                }))
                console.error(`${key}:`,updateProcedureList);
                
            }
        }
        console.error("OVER")
    }
}