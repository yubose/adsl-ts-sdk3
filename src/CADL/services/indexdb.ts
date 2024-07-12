import indexLocalForage from "./localforage"
import get from 'lodash/get'
import log from '../../utils/log'
export default {

    // 根据索引名获取索引
    async getObj({ indexName }: {
        indexName: string
    }) {
        return await indexLocalForage.getItem(indexName)
    },

    // 根据每页数量获取分页页数
    async getPageNumber({ indexName, count }: {
        indexName: string,
        count: number
    }) {
        const indexT: Array<object> | null = await indexLocalForage.getItem(indexName)
        if (indexT) {
            return Math.ceil(indexT?.length / count)
        }
        return 0
    },
    // 获取表长度
    async getTableLength({ indexName }: {
        indexName: string
    }) {
        const indexT: Array<object> | null = await indexLocalForage.getItem(indexName)
        if (indexT) {
            return indexT?.length
        }
        return 0
    },
    // 根据 第几页 和 每页数量 获取分页数据
    async pageSplit({ indexName, pageNumber, count }: {
        indexName: string,
        pageNumber: number,
        count: number
    }) {
        const indexT: Array<object> | null = await indexLocalForage.getItem(indexName)
        if (indexT) {
            return indexT.slice(count * (pageNumber - 1), count * pageNumber)
        }
        return []
    },
    // 索引表搜索 传入索引名、搜索路径、搜索字符串、字符串长度、状态路径、状态值
    async indexdbSearch({
        indexName,
        path,
        compareStr,
        strLength,
        statusPath,
        statusValue
    }: {
        indexName: string
        path: string[] | string
        compareStr: string
        strLength: 3
        statusPath: string
        statusValue: string
    }) {
        let objArr: Array<object> | null = await indexLocalForage.getItem(indexName)
        if (!objArr) {
            return
        }
        if (statusValue != 'All') {
            log.debug(objArr);
            
            objArr = objArr.filter(item => {
                return item[statusPath] == statusValue
            })
            log.debug('objArr');
            log.debug(objArr);
            
        }
        let arrCom: { [x: string]: any }[] = []
        if (compareStr.length < strLength) {
            arrCom = objArr
        } else {
            objArr?.forEach((objItem) => {
                if (Array.isArray(path)) {
                    path?.forEach((pathItem) => {
                        let pathValue: string | any[] = get(objItem, pathItem)
                        if (
                            Array.isArray(pathValue)
                                ? pathValue?.some((item) => {
                                    return item
                                        ?.split('')
                                        ?.filter((e) => e !== ' ')
                                        ?.join('')
                                        ?.match(
                                            new RegExp(
                                                `${compareStr
                                                    ?.split('')
                                                    ?.filter((e) => e !== ' ')
                                                    ?.join('')}`,
                                                'ig',
                                            ),
                                        )
                                })
                                : pathValue
                                    ?.split('')
                                    ?.filter((e: string) => e !== ' ')
                                    ?.join('')
                                    ?.match(
                                        new RegExp(
                                            `${compareStr
                                                ?.split('')
                                                ?.filter((e: string) => e !== ' ')
                                                ?.join('')}`,
                                            'ig',
                                        ),
                                    )
                        ) {
                            if (!arrCom.includes(objItem)) arrCom.push(objItem)
                        }
                    })
                } else {
                    let pathValueStr: string | string[] = get(objItem, path)
                    if (
                        Array.isArray(pathValueStr)
                            ? pathValueStr.some((item) => {
                                return item
                                    ?.split('')
                                    ?.filter((e) => e !== ' ')
                                    ?.join('')
                                    ?.match(
                                        new RegExp(
                                            `${compareStr
                                                ?.split('')
                                                ?.filter((e) => e !== ' ')
                                                ?.join('')}`,
                                            'ig',
                                        ),
                                    )
                            })
                            : (pathValueStr as string)
                                ?.split('')
                                ?.filter((e: string) => e !== ' ')
                                ?.join('')
                                ?.match(
                                    new RegExp(
                                        `${compareStr
                                            ?.split('')
                                            ?.filter((e: string) => e !== ' ')
                                            ?.join('')}`,
                                        'ig',
                                    ),
                                )
                    ) {
                        arrCom.push(objItem)
                    }
                }
            })
        }
        const indexdbKeys = await indexLocalForage.keys()
        if (indexdbKeys.includes(`${indexName}_search`)) {
            // 之前已经有过了，所以不需要重复的设置
            indexLocalForage.removeItem(`${indexName}_search`)
        }

        await indexLocalForage.setItem(`${indexName}_search`, arrCom)
    },
    async searchPatient({
        indexName,
        path,
        keywords,
        strLength,
    }: {
        indexName: string
        path: string[] | string
        keywords: string
        strLength: 3
    }) {
        let objArr: Array<object> | null = await indexLocalForage.getItem(indexName)
        if (!objArr) {
            return
        }
        let arrCom: { [x: string]: any }[] = []
        if (keywords.length < strLength) {
            return []
        } else {
            objArr?.forEach((objItem) => {
                if (Array.isArray(path)) {
                    path?.forEach((pathItem) => {
                        let pathValue: string | any[] = get(objItem, pathItem)
                        if (
                            Array.isArray(pathValue)
                                ? pathValue?.some((item) => {
                                    return item
                                        ?.split('')
                                        ?.filter((e) => e !== ' ')
                                        ?.join('')
                                        ?.match(
                                            new RegExp(
                                                `${keywords
                                                    ?.split('')
                                                    ?.filter((e) => e !== ' ')
                                                    ?.join('')}`,
                                                'ig',
                                            ),
                                        )
                                })
                                : pathValue
                                    ?.split('')
                                    ?.filter((e: string) => e !== ' ')
                                    ?.join('')
                                    ?.match(
                                        new RegExp(
                                            `${keywords
                                                ?.split('')
                                                ?.filter((e: string) => e !== ' ')
                                                ?.join('')}`,
                                            'ig',
                                        ),
                                    )
                        ) {
                            if (!arrCom.includes(objItem)) arrCom.push(objItem)
                        }
                    })
                } else {
                    let pathValueStr: string | string[] = get(objItem, path)
                    if (
                        Array.isArray(pathValueStr)
                            ? pathValueStr.some((item) => {
                                return item
                                    ?.split('')
                                    ?.filter((e) => e !== ' ')
                                    ?.join('')
                                    ?.match(
                                        new RegExp(
                                            `${keywords
                                                ?.split('')
                                                ?.filter((e) => e !== ' ')
                                                ?.join('')}`,
                                            'ig',
                                        ),
                                    )
                            })
                            : (pathValueStr as string)
                                ?.split('')
                                ?.filter((e: string) => e !== ' ')
                                ?.join('')
                                ?.match(
                                    new RegExp(
                                        `${keywords
                                            ?.split('')
                                            ?.filter((e: string) => e !== ' ')
                                            ?.join('')}`,
                                        'ig',
                                    ),
                                )
                    ) {
                        arrCom.push(objItem)
                    }
                }
            })
        }
        return arrCom
    },
    async searchAitmedStore({
        items,
        status,
        vendor,
        key
    }: {
        items: productItem[]
        status: string    
        vendor: string
        key: string
    }){
        // if (type == 'Durable Medical Equipment') type = "DME"
        const formattedKeyword = key.replace(/\s+/g, '').toLowerCase();
        // 根据关键字和类型筛选数组
        const filteredItems = items.filter(
            (item) => {
                if (!formattedKeyword) return (status === "All" || item.status === status) && (vendor === "All" || item.vendor === vendor) ;
                const formattedTitle = item.title.replace(/\s+/g, '').toLowerCase();
                return formattedTitle.includes(formattedKeyword) && (status === "All" || item.status === status) && (vendor === "All" || item.vendor === vendor)
            }
        );
        // 返回分页后的结果
        return filteredItems
    },
    async getIndexDB({ indexDBName } : {
        indexDBName: string
    }) {
        let indexDB = await indexLocalForage.getItem(indexDBName)
        return !(indexDB) ? [] : indexDB
    },
    startSearch({ string, num }: {
        string: string,
        num: number
    }) {
        log.debug('string.length>=num');
        console.error(string.length >= num);

        return string.length >= num
    },
    async removeIndex({indexs}: {indexs: Array<string>}) {
        const indexdbKeys = await indexLocalForage.keys()
        indexs.forEach(async item=>{
            if (indexdbKeys.includes(item)) {
                // 之前已经有过了，所以不需要重复的设置
                log.debug(item);
                await indexLocalForage.removeItem(item)
            }
        })
      
    }
}

type productItem = {
    id: string;
    title: string;
    type: string;
    coverImgId: string;
    price: string;
    status: string;
    vendor: string;
}