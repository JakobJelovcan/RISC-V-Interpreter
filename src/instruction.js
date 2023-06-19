import {Register} from "./registers.js"
/**
 * Decodes instructions
 * 
 * @param {Object} instructions 
 * @returns 
 */
export function decodeInstructions(instructions) {
    let decodedInstructions = [];
    instructions.forEach(instruction => {
        decodedInstructions.push(decodeInstruction(instruction));
    });
    return decodedInstructions;
}

/**
 * Decodes an instruction
 * @param {String} code 
 * @returns instruction
 */
export function decodeInstruction(code) {
    if(typeof(code) != "string") {
        throw new TypeError("Instruction has to be of type string");
    }

    const { groups: { head, tail }} = /(?<head>[a-z]+) (?<tail>.*)/.exec(code)
    const inst = Instruction[head]

    switch(inst) {
        case Instruction.lui:
        case Instruction.auipc: {
            try {
                const { groups: { rd, immed }} = /(?<rd>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_u_format, inst, Register[rd], Register.zero, Register.zero, Number(immed) << 12);
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }

        case Instruction.jal: {
            try {
                const { groups: { rd, immed }} = /(?:(?<rd>[a-z][a-z0-9]+), )?(?<immed>-?[0-9]+)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_j_format, inst, ((rd == undefined) ? Register.ra : Register[rd]), Register.zero, Register.zero, Number(immed));
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }

        case Instruction.lb:
        case Instruction.lh:
        case Instruction.lw:
        case Instruction.lbu:
        case Instruction.lhu: {
            try {
                const { groups: { rd, rs1, immed }} = /(?<rd>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)\((?<rs1>[a-z][a-z0-9]+)\)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_i_format, inst, Register[rd], Register[rs1], Register.zero, Number(immed));
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }

        case Instruction.jalr: {
            try {
                const { groups: { rd, rs1, immed }} = /(?:(?<rd>[a-z][a-z0-9]+),)? (?<rs1>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_i_format, inst, ((rd == undefined) ? Register.ra : Register[rd]), Register[rs1], Register.zero, Number(immed));
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }
        case Instruction.addi:
        case Instruction.slti:
        case Instruction.sltiu:
        case Instruction.xori:
        case Instruction.ori:
        case Instruction.andi:
        case Instruction.slli:
        case Instruction.srli:
        case Instruction.srai: {
            try {
                const { groups: { rd, rs1, immed }} = /(?<rd>[a-z][a-z0-9]+), (?<rs1>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_i_format, inst, Register[rd], Register[rs1], Register.zero, Number(immed));
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }

        case Instruction.beq:
        case Instruction.bne:
        case Instruction.blt:
        case Instruction.bge:
        case Instruction.bltu:
        case Instruction.bgeu: {
            try {
                const { groups: { rs1, rs2, immed }} = /(?<rs1>[a-z][a-z0-9]+), (?<rs2>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_b_format, inst, Register.zero, Register[rs1], Register[rs2], Number(immed));
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }

        case Instruction.sb:
        case Instruction.sh:
        case Instruction.sw: {
            try {
                const { groups: { rs1, rs2, immed }} = /(?<rs2>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)\((?<rs1>[a-z][a-z0-9]+)\)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_s_format, inst, Register.zero, Register[rs1], Register[rs2], Number(immed));
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }

        case Instruction.add:
        case Instruction.sub:
        case Instruction.xor:
        case Instruction.or:
        case Instruction.and:
        case Instruction.sll:
        case Instruction.slt:
        case Instruction.sltu:
        case Instruction.srl:
        case Instruction.sra: {
            try {
                const { groups: { rd, rs1, rs2 }} = /(?<rd>[a-z][a-z0-9]+), (?<rs1>[a-z][a-z0-9]+), (?<rs2>[a-z][a-z0-9]+)/.exec(tail);
                return new rv32i_instruction(code, Format.rv32i_r_format, inst, Register[rd], Register[rs1], Register[rs2], 0);
            } catch {
                window.alert(`Invalid instruction "${code}"`);
            }
            return null;
        }
        default:
            window.alert(`Invalid instruction "${head}"`)
            return null;
    }
}

/**
 * Base class for RV32I instructions
 */
export class rv32i_instruction {
    /**
     * 
     * @param {String} code 
     * @param {Format} format 
     * @param {Instruction} inst 
     * @param {Registers} rd 
     * @param {Registers} rs1 
     * @param {Registers} rs2 
     * @param {Number} immed 
     */
    constructor(code, format, inst, rd, rs1, rs2, immed) {
        this._code = code;
        this._format = format;
        this._inst = inst;
        this._rd = rd;
        this._rs1 = rs1;
        this._rs2 = rs2;
        this._immed = immed;
    }

    /**
     * Code
     */
    get code() {
        return this._code;
    }

    /**
     * Instruction format
     */
    get format() {
        return this._format;
    }

    /**
     * Instruction
     */
    get instruction() {
        return this._inst;
    }

    /**
     * Destination register
     */
    get rd() {
        return this._rd;
    }

    /**
     * Source register 1
     */
    get rs1() {
        return this._rs1;
    }

    /** 
     * Source register 2
    */
    get rs2() {
        return this._rs2;
    }

    /**
     * Immediate operand
     */
    get immed() {
        return this._immed;
    }
}

export const Format = Object.freeze({
    "rv32i_i_format" : 0,
    "rv32i_r_format" : 1,
    "rv32i_b_format" : 2,
    "rv32i_j_format" : 3,
    "rv32i_u_format" : 4,
    "rv32i_s_format" : 5,
});

export const Instruction = Object.freeze({
    "lui"   : 0,
    "auipc" : 1,
    "jal"   : 2,
    "jalr"  : 3,
    "beq"   : 4,
    "bne"   : 5,
    "blt"   : 6,
    "bge"   : 7,
    "bltu"  : 8,
    "bgeu"  : 9,
    "lb"    : 10,
    "lh"    : 11,
    "lw"    : 12,
    "lbu"   : 13,
    "lhu"   : 14,
    "sb"    : 15,
    "sh"    : 16,
    "sw"    : 17,
    "addi"  : 18,
    "slti"  : 19,
    "sltiu" : 20,
    "xori"  : 21,
    "ori"   : 22,
    "andi"  : 23,
    "add"   : 24,
    "sub"   : 25,
    "sll"   : 26,
    "slt"   : 27,
    "sltu"  : 28,
    "xor"   : 29,
    "srl"   : 30,
    "sra"   : 31,
    "or"    : 32,
    "and"   : 33,
    "slli"  : 34,
    "srli"  : 35,
    "srai"  : 36,
});