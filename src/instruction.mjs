import {Registers} from "./registers.mjs"
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
 * @param {String} instruction 
 * @returns instruction
 */
export function decodeInstruction(instruction) {
    if(typeof(instruction) != "string") {
        throw new TypeError("Instruction has to be of type string");
    }
    const { groups: { head, tail }} = /(?<head>[a-z]+) (?<tail>.*)/.exec(instruction)
    const inst = Instruction[head]
    switch(inst) {
        case Instruction.lui:
        case Instruction.auipc:
            return new rv32i_u_instruction(inst, tail);

        case Instruction.jal:
            return new rv32i_j_instruction(inst, tail);

        case Instruction.lb:
        case Instruction.lh:
        case Instruction.lw:
        case Instruction.lbu:
        case Instruction.lhu:
            return new rv32i_l_instruction(inst, tail);
        case Instruction.jalr:
        case Instruction.addi:
        case Instruction.slti:
        case Instruction.sltiu:
        case Instruction.xori:
        case Instruction.ori:
        case Instruction.andi:
        case Instruction.slli:
        case Instruction.srli:
        case Instruction.srai:
            return new rv32i_i_instruction(inst, tail);

        case Instruction.beq:
        case Instruction.bne:
        case Instruction.blt:
        case Instruction.bge:
        case Instruction.bltu:
        case Instruction.bgeu:
            return new rv32i_b_instruction(inst, tail);

        case Instruction.sb:
        case Instruction.sh:
        case Instruction.sw:
            return new rv32i_s_instruction(inst, tail);

        case Instruction.add:
        case Instruction.sub:
        case Instruction.xor:
        case Instruction.or:
        case Instruction.and:
        case Instruction.sll:
        case Instruction.slt:
        case Instruction.sltu:
        case Instruction.srl:
        case Instruction.sra:
            return new rv32i_r_instruction(inst, tail);
    }
}

/**
 * Base class for RV32I instructions
 */
export class rv32i_instruction {
    constructor(inst, rd, rs1, rs2, immed) {
        this._inst = inst;
        this._rd = rd;
        this._rs1 = rs1;
        this._rs2 = rs2;
        this._immed = immed;
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

/**
 * Class representing an R format RV32I instruction
 */
export class rv32i_r_instruction extends rv32i_instruction {
    /**
     * 
     * @param {Instruction} inst 
     * @param {String} tail 
     */
    constructor(inst, tail) {
        const { groups: { rd, rs1, rs2 }} = /(?<rd>[a-z][a-z0-9]+), (?<rs1>[a-z][a-z0-9]+), (?<rs2>[a-z][a-z0-9]+)/.exec(tail);
        super(inst, Registers[rd], Registers[rs1], Registers[rs2], 0);
    }
}

/**
 * Class representing an I format RV32I instruction
 */
export class rv32i_i_instruction extends rv32i_instruction {
    /**
     * 
     * @param {Instruction} inst 
     * @param {String} tail 
     */
    constructor(inst, tail) {
        const { groups: { rd, rs1, immed }} = /(?<rd>[a-z][a-z0-9]+), (?<rs1>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
        super(inst, Registers[rd], Registers[rs1], Registers.zero, Number(immed));
    }
}

/**
 * Class representing an I format RV32I instruction
 */
export class rv32i_l_instruction extends rv32i_instruction {
    /**
     * 
     * @param {Instruction} inst 
     * @param {String} tail 
     */
    constructor(inst, tail) {
        const { groups: { rd, rs1, immed }} = /(?<rd>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)\((?<rs1>[a-z][a-z0-9]+)\)/.exec(tail);
        super(inst, Registers[rd], Registers[rs1], Registers.zero, Number(immed));
    }
}

/**
 * Class representing an B format RV32I instruction
 */
export class rv32i_b_instruction extends rv32i_instruction {
    /**
     * 
     * @param {Instruction} inst 
     * @param {String} tail 
     */
    constructor(inst, tail) {
        const { groups: { rs1, rs2, immed }} = /(?<rs1>[a-z][a-z0-9]+), (?<rs2>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
        super(inst, Registers.zero, Registers[rs1], Registers[rs2], Number(immed));
    }
}

/**
 * Class representing an J format RV32I instruction
 */
export class rv32i_j_instruction extends rv32i_instruction {
    /**
     * 
     * @param {Instruction} inst 
     * @param {String} tail 
     */
    constructor(inst, tail) {
        const { groups: { rd, immed }} = /(?<rd>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
        super(inst, Registers[rd], Registers.zero, Registers.zero, Number(immed));
    }
}

/**
 * Class representing an U format RV32I instruction
 */
export class rv32i_u_instruction extends rv32i_instruction {
    /**
     * 
     * @param {Instruction} inst
     * @param {String} tail 
     */
    constructor(inst, tail) {
        const { groups: { rd, immed }} = /(?<rd>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)/.exec(tail);
        super(inst, Registers[rd], Registers.zero, Registers.zero, Number(immed));
    }
}

/**
 * Class representing an S format RV32I instruction
 */
export class rv32i_s_instruction extends rv32i_instruction {
    /**
     * 
     * @param {Instruction} inst 
     * @param {String} tail 
     */
    constructor(inst, tail) {
        const { groups: { rs1, rs2, immed }} = /(?<rs2>[a-z][a-z0-9]+), (?<immed>-?[0-9]+)\((?<rs1>[a-z][a-z0-9]+)\)/.exec(tail);
        super(inst, Registers.zero, Registers[rs1], Registers[rs2], Number(immed));
    }
}

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
})