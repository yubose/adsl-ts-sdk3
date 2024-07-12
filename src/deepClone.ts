export function deepCopy(obj, map = new Map()) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    let cloneObj = obj instanceof Array ? [] : {};

    if (map.get(obj)) {
        return map.get(obj);
    }
    map.set(obj, cloneObj);
    
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloneObj[key] = deepCopy(obj[key]);
        }
    }
    
    return cloneObj;
}