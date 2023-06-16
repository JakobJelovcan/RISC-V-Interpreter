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

export function compareSigned(a, b) {
    return a - b;
}

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