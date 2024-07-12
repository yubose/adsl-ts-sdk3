//@ts-nocheck

import { is_map } from './inline';
//@ts-ignore
import sample from '../../static/yaml_wasm_bg.wasm';


let wasm:any

export async function setWasm(){
    const instance = sample({wbg});
    let res = await instance.then()
    wasm = res.instance.exports
    // return wasm;
}


const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

//@ts-ignore
const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

let WASM_VECTOR_LEN = 0;

//@ts-ignore
const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let cachegetUint32Memory0 = null;
function getUint32Memory0() {
    if (cachegetUint32Memory0 === null || cachegetUint32Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory0;
}

function getArrayJsValueFromWasm0(ptr, len) {
    const mem = getUint32Memory0();
    const slice = mem.subarray(ptr / 4, ptr / 4 + len);
    const result = [];
    for (let i = 0; i < slice.length; i++) {
        result.push(takeObject(slice[i]));
    }
    return result;
}
/**
* Parse a YAML Text into a JavaScript value.
*
* Throws on failure.
* @param {string} text
* @param {ParseOptions | undefined} options
* @returns {any[]}
*/
export function parse(text, options) {
    var ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.parse(8, ptr0, len0, isLikeNone(options) ? 0 : addHeapObject(options));
    var r0 = getInt32Memory0()[8 / 4 + 0];
    var r1 = getInt32Memory0()[8 / 4 + 1];
    var v1 = getArrayJsValueFromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 4);
    return v1;
}

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
* Encode a JavaScript value into a YAML text.
*
* Throws on failure.
*
* **NOTE:** Circular object will result in infinite loop.
* @param {any} value
* @returns {string}
*/
export function stringify(value) {
    try {
        wasm.stringify(8, addBorrowedObject(value));
        var r0 = getInt32Memory0()[8 / 4 + 0];
        var r1 = getInt32Memory0()[8 / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        heap[stack_pointer++] = undefined;
        wasm.__wbindgen_free(r0, r1);
    }
}

function handleError(f) {
    return function () {
        try {
            return f.apply(this, arguments);

        } catch (e) {
            wasm.__wbindgen_exn_store(addHeapObject(e));
        }
    };
}

const wbg = {
    __wbindgen_object_drop_ref: function(arg0) {
        takeObject(arg0);
    },
    
    __wbindgen_number_new: function(arg0) {
        var ret = arg0;
        return addHeapObject(ret);
    },
    
    __wbindgen_string_new: function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    },
    
    __wbindgen_is_function: function(arg0) {
        var ret = typeof(getObject(arg0)) === 'function';
        return ret;
    },
    
    __wbindgen_is_symbol: function(arg0) {
        var ret = typeof(getObject(arg0)) === 'symbol';
        return ret;
    },
    
    __wbindgen_is_undefined: function(arg0) {
        var ret = getObject(arg0) === undefined;
        return ret;
    },
    
    __wbindgen_is_null: function(arg0) {
        var ret = getObject(arg0) === null;
        return ret;
    },
    
    __wbindgen_is_object: function(arg0) {
        const val = getObject(arg0);
        var ret = typeof(val) === 'object' && val !== null;
        return ret;
    },
    
    __wbindgen_is_falsy: function(arg0) {
        var ret = !getObject(arg0);
        return ret;
    },
    
    __wbg_ismap_7df605ee637a2398: function(arg0) {
        var ret = is_map(getObject(arg0));
        return ret;
    },
    
    __wbindgen_object_clone_ref: function(arg0) {
        var ret = getObject(arg0);
        return addHeapObject(ret);
    },
    
    __wbg_entries_24efaff98a2ed8c7: function(arg0) {
        var ret = Object.entries(getObject(arg0));
        return addHeapObject(ret);
    },
    
    __wbg_new_59cb74e423758ede: function() {
        var ret = new Error();
        return addHeapObject(ret);
    },
    
    __wbg_stack_558ba5917b466edd: function(arg0, arg1) {
        var ret = getObject(arg1).stack;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    },
    
    __wbg_error_4bb6c2a97407129a: function(arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    },
    
    __wbg_get_f5f75a85b3c573d3: function(arg0, arg1) {
        var ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    },
    
    __wbg_length_b6f1989cb582d53f: function(arg0) {
        var ret = getObject(arg0).length;
        return ret;
    },
    
    __wbg_get_38f68ddea9e54820: handleError(function(arg0, arg1) {
        var ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }),
    
    __wbg_newwithlength_023948b39342dc1d: function(arg0) {
        var ret = new Array(arg0 >>> 0);
        return addHeapObject(ret);
    },
    
    __wbg_set_1c3a88d0b7ce5a23: function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    },
    
    __wbg_from_c3096a5b15a30c31: function(arg0) {
        var ret = Array.from(getObject(arg0));
        return addHeapObject(ret);
    },
    
    __wbg_isArray_9daeb1a30751fdc8: function(arg0) {
        var ret = Array.isArray(getObject(arg0));
        return ret;
    },
    
    __wbg_new_d333a6e567133fdb: function(arg0, arg1) {
        var ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    },
    
    __wbg_new_4d63b46bdff6e16c: function() {
        var ret = new Map();
        return addHeapObject(ret);
    },
    
    __wbg_set_dfa2f1a42cb24532: function(arg0, arg1, arg2) {
        var ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    },
    
    __wbg_isFinite_939d8b0af9f2fe87: function(arg0) {
        var ret = Number.isFinite(getObject(arg0));
        return ret;
    },
    
    __wbg_isInteger_11504f9229cb2209: function(arg0) {
        var ret = Number.isInteger(getObject(arg0));
        return ret;
    },
    
    __wbg_new_17a08b876c4dedc9: function() {
        var ret = new Object();
        return addHeapObject(ret);
    },
    
    __wbg_new_30e6564e636fe5db: function(arg0, arg1) {
        var ret = new SyntaxError(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    },
    
    __wbg_new_4f288b3dc5388d97: function(arg0, arg1) {
        var ret = new TypeError(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    },
    
    __wbg_set_ede434d91072bd5f: handleError(function(arg0, arg1, arg2) {
        var ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    }),
    
    __wbindgen_number_get: function(arg0, arg1) {
        const obj = getObject(arg1);
        var ret = typeof(obj) === 'number' ? obj : undefined;
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    },
    
    __wbindgen_is_string: function(arg0) {
        var ret = typeof(getObject(arg0)) === 'string';
        return ret;
    },
    
    __wbindgen_string_get: function(arg0, arg1) {
        const obj = getObject(arg1);
        var ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    },
    
    __wbindgen_boolean_get: function(arg0) {
        const v = getObject(arg0);
        var ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    },
    
    __wbindgen_debug_string: function(arg0, arg1) {
        var ret = debugString(getObject(arg1));
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    },
    
    __wbindgen_throw: function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    },
    
    __wbindgen_rethrow: function(arg0) {
        throw takeObject(arg0);
    }
}

