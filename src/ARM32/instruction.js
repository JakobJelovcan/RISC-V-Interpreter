import { Register } from "./registers.js";

export class arm_instruction {
    constructor(code, instruction, rd, rs1, rs2, immed, useImmed) {
        this._code = code;
        this._instruction = instruction;
        this._rd = rd;
        this._rs1 = rs1;
        this._rs2 = rs2;
        this._immed = immed;
        this._useImmed = useImmed;
    }

    get code() {
        return this._code;
    }

    get instruction() {
        return this._instruction;
    }

    get rd() {
        return this._rd;
    }

    get rs1() {
        return this._rs1;
    }

    get rs2() {
        return this._rs2;
    }

    get immed() {
        return this._immed;
    }

    get useImmed() {
        return this._useImmed;
    }
}

/**
 * Decodes a list of instructions
 * @param {object} instructions
 * @returns
 */
export function decodeInstructions(instructions) {
    let decodedInstructions = [];
    for(const instruction of instructions) {
        decodedInstructions.push(decodeInstruction(instruction));
    }
    return decodedInstructions;
}

/**
 * Decodes the instruction and returns an object of type arm_instruction
 * 
 * @param {string} code 
 * @returns 
 */
function decodeInstruction(code) {
    const { groups: { head, tail } } = /(?<head>[a-z]+) (?<tail>.*)/.exec(code);
    if (!(head in Instruction)) {
        window.alert(`Invalid instruction ${code}`);
        return null;
    }
    const inst = Instruction[head];
    switch(inst) {
        case Instruction.add:
        case Instruction.sub:
        case Instruction.mul:
        case Instruction.and:
        case Instruction.orr:
        case Instruction.eor:
        case Instruction.bic: {
            try {
                const { groups: { rd, rs1, rs2, immed } } = /(?<rd>[a-z][a-z0-9]+)(?:, (?<rs1>[a-z][a-z0-9]+))?(?:, (?<rs2>[a-z][a-z0-9]+))?(?:, (?<immed>-?\d+))?/.exec(tail);
                if (rs2 == undefined && immed == undefined) {
                    window.alert(`Not enough operands in instruction ${code}`);
                } else if (rs2 != undefined && immed != undefined) {
                    window.alert(`Too many operands in instruction ${code}`);
                } else {
                    return new arm_instruction(code, inst, Register[rd], Register[rs1 ?? rd], Register[rs2 ?? "r0"], Number(immed ?? 0), immed != undefined);
                }
            } catch {
                window.alert(`Invalid instruction ${code}`)
            }
            return null;
        }
        case Instruction.cmp:
        case Instruction.cmn:
        case Instruction.tst:
        case Instruction.teq: {
            try {
                const { groups: { rs1, rs2, immed } } = /(?<rs1>[a-z][a-z0-9]+)(?:, (?<rs2>[a-z][a-z0-9]+))?(?:, (?<immed>-?\d+))?/.exec(tail);
                if (rs2 == undefined && immed == undefined) {
                    window.alert(`Not enough operands in instruction ${code}`);
                } else if(rs2 != undefined && immed != undefined) {
                    window.alert(`Too many operands in instruction ${code}`);
                } else {
                    return new arm_instruction(code, inst, Register.r0, Register[rs1], Register[rs2 ?? "r0"], Number(immed ?? 0), immed != undefined);
                }
            } catch {
                window.alert(`Invalid instruction ${code}`)
            }
            return null;
        }
        case Instruction.mov: {
            try {
                const { groups: { rd, rs2, immed } } = /(?<rd>[a-z][a-z0-9]+)(?:, (?<rs2>[a-z][a-z0-9]+))?(?:, (?<immed>-?\d+))?/.exec(tail);
                if (rs2 == undefined && immed == undefined) {
                    window.alert(`Not enough operands in instruction ${code}`);
                } else if(rs2 != undefined && immed != undefined) {
                    window.alert(`Too many operands in instruction ${code}`);
                } else {
                    return new arm_instruction(code, inst, Register[rd], Register.r0, Register[rs2 ?? "r0"], Number(immed ?? 0), immed != undefined);
                } 
            } catch {
                window.alert(`Invalid instruction ${code}`)
            }
            return null;
        }
        case Instruction.b:
        case Instruction.beq:
        case Instruction.bne:
        case Instruction.blo:
        case Instruction.bhi:
        case Instruction.bls:
        case Instruction.bhs:
        case Instruction.blt:
        case Instruction.bgt:
        case Instruction.bge:
        case Instruction.ble: {
            try {
                const { groups: { immed } } = /(?<immed>-?\d+)/.exec(tail);
                return new arm_instruction(code, inst, Register.r0, Register.r0, Register.r0, Number(immed), true);
            } catch {
                window.alert(`Invalid instruction ${code}`);
            }
            return null;
        }
        case Instruction.bl:
        case Instruction.bleq:
        case Instruction.blne:
        case Instruction.bllo:
        case Instruction.blhi:
        case Instruction.blls:
        case Instruction.blhs:
        case Instruction.bllt:
        case Instruction.blgt:
        case Instruction.blge:
        case Instruction.blle: {
            try {
                const { groups: { immed } } = /(?<immed>-?\d+)/.exec(tail);
                return new arm_instruction(code, inst, Register.lr, Register.r0, Register.r0, Number(immed), true);
            } catch {
                window.alert(`Invalid instruction ${code}`);
            }
            return null;
        }
        case Instruction.bx: {
            try {
                const { groups: { rs1 }} = /(?<rs1>[a-z][a-z0-9]+)/.exec(tail);
                return new arm_instruction(code, inst, Register.r0, Register[rs1], Register.r0, 0, false);
            } catch {
                window.alert(`Invalid instruction ${code}`)
            }
            return null;
        }
        case Instruction.ldr:
        case Instruction.ldrb:
        case Instruction.ldrsb:
        case Instruction.ldrh:
        case Instruction.ldrsh: {
            try {
                const { groups: { rd, rs1, immed } } = /(?<rd>[a-z][a-z0-9]+), \[(?<rs1>[a-z][a-z0-9]+)(?:, (?<immed>-?\d+))?\]/.exec(tail);
                return new arm_instruction(code, inst, Register[rd], Register.r0, Register[rs1], Number(immed ?? 0), true);
            } catch {
                window.alert(`Invalid instruction ${code}`)
            }
            return null;
        }
        case Instruction.str:
        case Instruction.strb:
        case Instruction.strh: {
            try {
                const { groups: { rs1, rs2, immed } } = /(?<rs1>[a-z][a-z0-9]+), \[(?<rs2>[a-z][a-z0-9]+)(?:, (?<immed>-?\d+))?\]/.exec(tail);
                return new arm_instruction(code, inst, Register.r0, Register[rs1], Register[rs2], Number(immed ?? 0), true);
            } catch {
                window.alert(`Invalid instruction ${code}`)
            }
            return null;
        }
    }
}

export const Instruction = Object.freeze({
    "ldr"   : 0,
    "str"   : 1,
    "mov"   : 2,
    "add"   : 3,
    "sub"   : 4,
    "mul"   : 5,
    "and"   : 6,
    "orr"   : 7,
    "eor"   : 8,
    "bic"   : 9,
    "cmp"   : 10,
    "cmn"   : 11,
    "tst"   : 12,
    "teq"   : 13,
    "bl"    : 14,
    "bx"    : 15,
    "b"     : 16,
    "beq"   : 17,
    "bne"   : 18,
    "blo"   : 19,
    "bhi"   : 20,
    "bls"   : 21,
    "bhs"   : 22,
    "blt"   : 23,
    "bgt"   : 24,
    "bge"   : 25,
    "ble"   : 26,
    "bleq"  : 27,
    "blne"  : 28,
    "bllo"  : 29,
    "blhi"  : 30,
    "blls"  : 31,
    "blhs"  : 32,
    "bllt"  : 33,
    "blgt"  : 34,
    "blge"  : 35,
    "blle"  : 36,
    "ldrb"  : 37,
    "ldrsb" : 38,
    "ldrh"  : 39,
    "ldrsh" : 40,
    "strb"  : 41,
    "strh"  : 42,
});