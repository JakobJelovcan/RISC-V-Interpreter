/**
 * Converts number to signed hex string
 * @param {Number} n 
 * @returns String
 */
export function signedToHex(n) {
    let str = '';
    for(let i = 0; i < 32; i += 4) {
        let nibble = 0;
        for(let j = 0; j < 4; ++j) {
            nibble += ((n & (1 << (i + j))) >>> i);
        }
        str = nibble.toString(16).toUpperCase() + str;
    }
    return str;
}

/**
 * Compares two signed numbers
 * @param {Number} a 
 * @param {Number} b 
 * @returns Number
 */
export function compareSigned(a, b) {
    return a - b;
}

/**
 * Compares two unsigned numbers
 * @param {Number} a 
 * @param {Number} b 
 * @returns 
 */
export function compareUnsigned(a, b) {
    for(let i = 31; i >= 0; --i) {
        const a_i = (a & (1 << i));
        const b_i = (b & (1 << i));
        if(a_i != 0 && b_i == 0) {
            return 1;
        } else if(b_i != 0) {
            return -1;
        }
    }
    return 0;
}

/**
 * Converts a byte to a signed number
 * @param {Number} b 
 * @returns 
 */
export function byteToSigned(b) {
    b &= 0xFF;
    if((b & (1 << 7)) != 0) {
        b |= 0xFFFFFF00;
    }
    return b;
}

/**
 * Converts a byte to an unsigned number
 * @param {Number} b 
 * @returns 
 */
export function byteToUnsigned(b) {
    return b & 0xFF;
}

/**
 * Converts a halfword to an signed number
 * @param {Number} h 
 * @returns 
 */
export function halfwordToSigned(h) {
    h &= 0x0000FFFF;
    if((h & (1 << 15)) != 0) {
        h |= 0xFFFF0000;
    }
    return h;
}

/**
 * Converts a halfword to an unsigned number
 * @param {Number} h 
 * @returns 
 */
export function halfwordToUnsigned(h) {
    return h & 0x0000FFFF;
}