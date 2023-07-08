/**
 * A dictionary mapping logical register names in to indeces
 */
export const Register = Object.freeze({
    //Hard-wired zero
    "x0": 0,
    "zero": 0,

    //Return address
    "x1": 1,
    "ra": 1,

    //Stack pointer
    "x2": 2,
    "sp": 2,

    //Global pointer
    "x3": 3,
    "gp": 3,

    //Thread pointer
    "x4": 4,
    "tp": 4,

    //Temporary/alternate link register
    "x5": 5,
    "t0": 5,

    //Temporary
    "x6": 6,
    "t1": 6,

    //Temporary
    "x7": 7,
    "t2": 7,

    //Saved register/frame pointer
    "x8": 8,
    "s0": 8,
    "fp": 8,

    //Saved register
    "x9": 9,
    "s1": 9,

    //Function argument/return value
    "x10": 10,
    "a0": 10,

    //Function argument/return value
    "x11": 11,
    "a1": 11,

    //Function argument/return value
    "x12": 12,
    "a2": 12,

    //Function argument/return value
    "x13": 13,
    "a3": 13,

    //Function argument/return value
    "x14": 14,
    "a4": 14,

    //Function argument/return value
    "x15": 15,
    "a5": 15,

    //Function argument/return value
    "x16": 16,
    "a6": 16,

    //Function argument/return value
    "x17": 17,
    "a7": 17,

    //Saved register
    "x18": 18,
    "s2": 18,

    //Saved register
    "x19": 19,
    "s3": 19,

    //Saved register
    "x20": 20,
    "s4": 20,

    //Saved register
    "x21": 21,
    "s5": 21,

    //Saved register
    "x22": 22,
    "s6": 22,

    //Saved register
    "x23": 23,
    "s7": 23,

    //Saved register
    "x24": 24,
    "s8": 24,

    //Saved register
    "x25": 25,
    "s9": 25,

    //Saved register
    "x26": 26,
    "s10": 26,

    //Saved register
    "x27": 27,
    "s11": 27,

    //Temporary
    "x28": 28,
    "t3": 28,

    //Temporary
    "x29": 29,
    "t4": 29,

    //Temporary
    "x30": 30,
    "t5": 30,

    //Temporary
    "x31": 31,
    "t6": 31,
})