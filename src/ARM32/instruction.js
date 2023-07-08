import { Register } from "./registers.js";

export class arm_instruction {
    constructor(code, instruction, cond, mod, rd, rs1, rs2, immed, useImmed) {
        this._code = code;
        this._instruction = instruction;
        this._cond = cond;
        this._mod = mod;
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

    get condition() {
        return this._cond;
    }

    get modifier() {
        return this._mod;
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
    for (const instruction of instructions) {
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
    const [_inst, _cond, _mod] = decodeInstructionHead(head);
    const inst = Instruction[_inst];
    const cond = Condition[_cond];
    const mod = Modifier[_mod];
    switch (inst) {
        case Instruction.add:
        case Instruction.adc:
        case Instruction.sub:
        case Instruction.rsb:
        case Instruction.mul:
        case Instruction.and:
        case Instruction.orr:
        case Instruction.eor:
        case Instruction.lsl:
        case Instruction.lsr:
        case Instruction.asr:
        case Instruction.bic: {
            //Arith:
            //  add rd, rn, rm
            //  add rd, rm
            //  add rd, rn, const
            //  add rd, const
            try {
                const { groups: { rd, rs1, rs2, immed } } = /(?<rd>[a-z][a-z0-9]+)(?:, (?<rs1>[a-z][a-z0-9]+))?(?:, (?<rs2>[a-z][a-z0-9]+))?(?:, (?<immed>-?\d+))?/.exec(tail);
                if (rs2 == undefined && immed == undefined) {
                    if (rs1 != undefined) {
                        return new arm_instruction(code, inst, cond, mod, Register[rd], Register[rd], Register[rs1], 0, false);
                    } else {
                        window.alert(`Not enough operands in instruction ${code}`);
                    }
                } else if (rs2 != undefined && immed != undefined) {
                    window.alert(`Too many operands in instruction ${code}`);
                } else {
                    return new arm_instruction(code, inst, cond, mod, Register[rd], Register[rs1 ?? rd], Register[rs2 ?? "r0"], Number(immed ?? 0), immed != undefined);
                }
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
        case Instruction.cmp:
        case Instruction.cmn:
        case Instruction.tst:
        case Instruction.teq: {
            //Compares:
            //  cmp rd, rd
            //  cmp rd, const
            try {
                const { groups: { rs1, rs2, immed } } = /(?<rs1>[a-z][a-z0-9]+)(?:, (?<rs2>[a-z][a-z0-9]+))?(?:, (?<immed>-?\d+))?/.exec(tail);
                if (rs2 == undefined && immed == undefined) {
                    window.alert(`Not enough operands in instruction ${code}`); //rs2 and immed are both not present
                } else if (rs2 != undefined && immed != undefined) {
                    window.alert(`Too many operands in instruction ${code}`);   //rs2 and immed are both present
                } else {
                    return new arm_instruction(code, inst, cond, mod, Register.r0, Register[rs1], Register[rs2 ?? "r0"], Number(immed ?? 0), immed != undefined);
                }
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
        case Instruction.mov: {
            //Move:
            //  mov rd, rn
            //  mov rd, const
            try {
                const { groups: { rd, rs2, immed } } = /(?<rd>[a-z][a-z0-9]+)(?:, (?<rs2>[a-z][a-z0-9]+))?(?:, (?<immed>-?\d+))?/.exec(tail);
                if (rs2 == undefined && immed == undefined) {
                    window.alert(`Not enough operands in instruction ${code}`); //rs2 and immed are both not present
                } else if (rs2 != undefined && immed != undefined) {
                    window.alert(`Too many operands in instruction ${code}`);   //rs2 and immed are both present
                } else {
                    return new arm_instruction(code, inst, cond, mod, Register[rd], Register.r0, Register[rs2 ?? "r0"], Number(immed ?? 0), immed != undefined);
                }
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
        case Instruction.b: {
            //Branch:
            //  b const
            try {
                const { groups: { immed } } = /(?<immed>-?\d+)/.exec(tail);
                return new arm_instruction(code, inst, cond, mod, Register.r0, Register.r0, Register.r0, Number(immed), true);
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
        case Instruction.bl: {
            //Branch link:
            //  bl const
            try {
                const { groups: { immed } } = /(?<immed>-?\d+)/.exec(tail);
                return new arm_instruction(code, inst, cond, mod, Register.lr, Register.r0, Register.r0, Number(immed), true);
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
        case Instruction.bx: {
            //Branch exchange:
            //  bx rm
            try {
                const { groups: { rs1 } } = /(?<rs1>[a-z][a-z0-9]+)/.exec(tail);
                return new arm_instruction(code, inst, cond, mod, Register.r0, Register[rs1], Register.r0, 0, false);
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
        case Instruction.ldr: {
            //Load:
            //  ldr rd, [rn]
            //  ldr rd, [rn, const]
            try {
                const { groups: { rd, rs1, immed } } = /(?<rd>[a-z][a-z0-9]+), \[(?<rs1>[a-z][a-z0-9]+)(?:, (?<immed>-?\d+))?\]/.exec(tail);
                return new arm_instruction(code, inst, cond, mod, Register[rd], Register.r0, Register[rs1], Number(immed ?? 0), true);
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
        case Instruction.str: {
            //Store:
            //  str rd, [rn]
            //  str rd, [rn, const]
            try {
                const { groups: { rs1, rs2, immed } } = /(?<rs1>[a-z][a-z0-9]+), \[(?<rs2>[a-z][a-z0-9]+)(?:, (?<immed>-?\d+))?\]/.exec(tail);
                return new arm_instruction(code, inst, cond, mod, Register.r0, Register[rs1], Register[rs2], Number(immed ?? 0), true);
            } catch {
                throw new Error(`Invalid operands in instruction ${code}`);
            }
        }
    }
}

/**
 * Decodes the head of the instruction
 * 
 * Example:
 *  addlts -> [add, lt, s]
 *  ldrsb  -> [ldr, al, sb]
 * 
 * @param {String} head 
 * @returns
 */
function decodeInstructionHead(head) {
    const Instructions = Object.keys(Instruction);  //List of instructions
    const Conditions = Object.keys(Condition);      //List of conditions
    const Modifiers = Object.keys(Modifier);        //List of modifiers

    //The first instruction, condition and modifier that matches the front of the head is used
    //therefore all instructions ... have to be ordered from the longest to the shortest in order
    //to always get the longest match

    //Get the instruction
    const inst = Instructions.find(i => head.startsWith(i));
    if (inst == undefined) {
        throw new Error(`Invalid instruction ${head}`);
    }

    head = head.slice(inst.length); //Remove the instruction from the head
    const condition = Conditions.find(c => head.startsWith(c)); //Get the conditiona

    head = head.slice(condition?.length ?? 0); //Remove the condition from the head
    const modifier = Modifiers.find(m => head.startsWith(m)); //Get the modifier

    head = head.slice(modifier?.length ?? 0); //Remove the modifier from the head

    if (head.length > 0) {
        //If there is anything left in the head throw an error
        throw new Error(`Invalid instruction ${head}`);
    }

    //Default value for condition is al (always)
    //Default value for modifier is n (none)
    return [inst, condition ?? "al", modifier ?? "n"];
}

export const Instruction = Object.freeze({
    "add": 0,
    "adc": 1,
    "sub": 2,
    "rsb": 3,
    "mul": 4,
    "and": 5,
    "orr": 6,
    "eor": 7,
    "and": 8,
    "bic": 9,
    "str": 10,
    "ldr": 11,
    "lsl": 12,
    "lsr": 13,
    "asr": 14,
    "cmp": 15,
    "cmn": 16,
    "tst": 17,
    "teq": 18,
    "mov": 19,
    "bl": 20,
    "bx": 21,
    "b": 22,
});

export const Condition = Object.freeze({
    "eq": 0,
    "ne": 1,
    "cs": 2,
    "hs": 2,
    "cc": 3,
    "lo": 3,
    "mi": 4,
    "pl": 5,
    "vs": 6,
    "vc": 7,
    "hi": 8,
    "ls": 9,
    "ge": 10,
    "lt": 11,
    "gt": 12,
    "le": 13,
    "al": 14,
});

export const Modifier = Object.freeze({
    "sb": 0,   //Signed byte
    "sh": 1,   //Signed halfword
    "s": 2,   //Set flags
    "b": 3,   //Unsigned byte
    "h": 4,   //Unsigned halfword
    "n": 5,   //None
});