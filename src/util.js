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

export function byteToSigned(b) {
    b &= 0xFF;
    if((b & (1 << 7)) != 0) {
        b |= 0xFFFFFF00;
    }
    return b;
}

export function byteToUnsigned(b) {
    return b & 0xFF;
}

export function halfwordToSigned(h) {
    h &= 0xFFFF;
    if((h & (1 << 15)) != 0) {
        h |= 0xFFFF0000;
    }
    return h;
}

export function halfwordToUnsigned(h) {
    return h & 0xFFFF;
}