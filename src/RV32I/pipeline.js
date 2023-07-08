import { Register } from "./registers.js"
import { Format, Instruction } from "./instruction.js"
import { byteToSigned, byteToUnsigned, compareSigned, compareUnsigned, halfwordToSigned, halfwordToUnsigned } from "../util.js";

export class rv32i_pipeline {
    /**
     * 
     * @param {Object} instructions 
     */
    constructor(instructions) {
        //Instruction fetch
        this._pc = 0;
        this._ifInst = null;
        this._ifPC = 0;
        //Instruction decode
        this._deInst = null;
        this._deDataA = 0;
        this._deDataB = 0;
        this._deRegDataA = 0;
        this._deRegDataB = 0;
        this._dePC = 0;
        this._deBypassA = false;
        this._deBypassB = false;
        //Execute
        this._exInst = null;
        this._exDataA = 0;
        this._exDataB = 0;
        this._exAluData = 0;
        this._exStoreData = 0;
        this._exBranchAddr = 0;
        this._exBranchBase = 0;
        this._exBranchTaken = false;
        this._exPC = 0;
        //Memory access
        this._maInst = null;
        this._maStoreData = 0;
        this._maLoadData = 0;
        this._maAddr = 0;
        this._maAluData = 0;
        this._maLoadOp = false;
        this._maWriteBackData = 0;
        this._maPC = 0;
        //Write back
        this._wbInst = null;
        this._wbStoreData = 0;
        this._wbPC = 0;

        this._dataHazard = false;

        this._registers = new Array(32);
        this._instructionMemory = new Array(1024);
        this._dataMemory = new Array(1024);

        this._registers.fill(0);
        this._dataMemory.fill(0);

        this._instructionMemory.fill(null);
        for (let i = 0; i < Math.min(instructions.length, 1024); ++i) {
            this._instructionMemory[i] = instructions[i];
        }
    }

    /**
     * Read the value from the specified register
     * @param {Number} reg 
     * @returns 
     */
    readRegister(reg) {
        return this._registers[reg];
    }

    /**
     * Store the provided value in to the specified register
     * @param {Number} reg 
     * @param {Number} data 
     */
    writeRegister(reg, data) {
        if (reg != 0) {
            this._registers[reg] = data;
        }
    }

    /**
     * Read the next instruction from the address specified by PC
     * @param {Number} pc 
     * @returns 
     */
    readInstruction(pc) {
        return this._instructionMemory[Math.floor(pc / 4)];
    }

    /**
     * Read the value from the memory 
     * @param {Number} addr 
     * @returns 
     */
    readData(addr) {
        return this._dataMemory[Math.floor(addr / 4)];
    }

    /**
     * Stores the provided data in to the data memory on the specified location
     * @param {Number} addr 
     * @param {Number} data 
     */
    writeData(addr, data) {
        this._dataMemory[Math.floor(addr / 4)] = data;
    }

    /**
     * Executes a cycle
     */
    execute() {
        this.writeBackStage();
        this.memoryAccessStage();
        if (this._dataHazard) {
            //If there is a data hazard flush the execute stage and refresh decode stage
            this._dataHazard = false;
            this.flushExecute();
            this.refreshDecodeStage();
        } else {
            this.executeStage();
            if (this._exBranchTaken) {
                //If there is a branch flush the instruction fetch and decode stages
                this.flushFetchAndDecode();
            } else {
                this.decodeStage();
                this.instructionFetchStage();
            }
        }
        //Store the data from the write back stage in to the register unit
        this.writeRegister(this.wbRD, this._wbStoreData);

        if (!this._dataHazard) {
            //If there isn't a data hazard update the PC
            this._pc = (this._exBranchTaken) ? this._exBranchAddr : this._pc + 4;
        }
    }

    /**
     * Resets the execute stage to default values
     */
    flushExecute() {
        this._exInst = null;
        this._dataHazard = false;
        this._exAluData = 0;
        this._exBranchAddr = 0;
        this._exBranchTaken = false;
        this._exBranchBase = 0;
        this._exDataA = 0;
        this._exDataB = 0;
        this._exPC = 0;
        this._exStoreData = 0;
    }

    /**
     * Resets the fetch and decode stages to default values
     */
    flushFetchAndDecode() {
        this._deInst = null;
        this._dePC = 0;
        this._dataHazard = 0;
        this._deBypassA = false;
        this._deBypassB = false;
        this._deRegDataA = 0;
        this._deRegDataB = 0;
        this._deDataA = 0;
        this._deDataA = 0;
        this._ifPC = 0;
        this._ifInst = null;
    }

    /**
     * Performs operations in the fetch stage
     */
    instructionFetchStage() {
        this._ifPC = this._pc;
        this._ifInst = this.readInstruction(this._ifPC);
    }

    /**
     * Performs operations in the decode stage
     */
    decodeStage() {
        this._deInst = this._ifInst;
        this._dePC = this._ifPC;
        const [[rs1Valid, rs1Use, rs1Data], [rs2Valid, rs2Use, rs2Data]] = this.bypassUnit();

        this._dataHazard = !rs1Valid || !rs2Valid;

        this._deBypassA = rs1Use;
        this._deBypassB = rs2Use;

        this._deRegDataA = this.readRegister(this.deRS1);
        this._deRegDataB = this.readRegister(this.deRS2);
        this._deDataA = (this._deBypassA) ? rs1Data : this._deRegDataA;
        this._deDataB = (this._deBypassB) ? rs2Data : this._deRegDataB;
    }

    /**
     * Refreshes DataA and DataB
     */
    refreshDecodeStage() {
        const [[rs1Valid, rs1Use, rs1Data], [rs2Valid, rs2Use, rs2Data]] = this.bypassUnit();

        this._dataHazard = !rs1Valid || !rs2Valid;

        this._deBypassA = rs1Use;
        this._deBypassB = rs2Use;

        this._deRegDataA = this.readRegister(this.deRS1);
        this._deRegDataB = this.readRegister(this.deRS2);
        this._deDataA = (this._deBypassA) ? rs1Data : this._deRegDataA;
        this._deDataB = (this._deBypassB) ? rs2Data : this._deRegDataB;
    }

    /**
     * Performs operations in the execute stage
     */
    executeStage() {
        this._exInst = this._deInst;
        this._exPC = this._dePC;
        [this._exDataA, this._exDataB] = this.getExecuteOperands();
        this._exStoreData = this._deDataB;
        this._exAluData = this.executeAluOperation();
        this._exBranchBase = this.getBranchBase();
        this._exBranchTaken = this.getBranchTaken();
        this._exBranchAddr = this._exBranchBase + this.exImmed;
    }

    /**
     * Performs operations in the memory access stage
     */
    memoryAccessStage() {
        this._maInst = this._exInst;
        this._maPC = this._exPC;
        this._maAluData = this._exAluData;
        this._maAddr = this._exAluData;
        this._maStoreData = this._exStoreData;
        this._maLoadOp = this.isLoadInstruction(this._maInst);
        this._maLoadData = this.executeMemoryOperation();
        this._maWriteBackData = (this._maLoadOp) ? this._maLoadData : this._maAluData;
    }

    /**
     * Performs operations in the write back stage
     */
    writeBackStage() {
        this._wbInst = this._maInst;
        this._wbPC = this._maPC;
        this._wbRegD = this._wbInst?.rd ?? 0;
        this._wbStoreData = this._maWriteBackData;
    }

    /**
     * Checks if the instruction is a memory load
     * 
     * @param {rv32i_instruction} inst 
     * @returns boolean
     */
    isLoadInstruction(inst) {
        if (inst == null) {
            return false;
        } else {
            switch (inst.instruction) {
                case Instruction.lb:
                case Instruction.lh:
                case Instruction.lw:
                case Instruction.lbu:
                case Instruction.lhu:
                    return true;
                default:
                    return false;
            }
        }
    }

    /**
     * Returns the values for opA and opB and their status
     * 
     * @returns 
     */
    bypassUnit() {
        //[valid, use, data]
        let rs1Bypass = [true, false, 0];
        let rs2Bypass = [true, false, 0];
        if (this._deInst != null) {

            //RS1
            if (this._deInst.rs1 != Register.zero) {
                if (this._exInst != null && this._deInst.rs1 == this._exInst.rd) {
                    let valid = !this.isLoadInstruction(this._exInst);
                    rs1Bypass = [valid, true, this._exAluData];
                } else if (this._maInst != null && this._deInst.rs1 == this._maInst.rd) {
                    rs1Bypass = [true, true, this._maWriteBackData];
                } else if (this._wbInst != null && this._deInst.rs1 == this._wbInst.rd) {
                    rs1Bypass = [true, true, this._wbStoreData];
                }
            }


            //RS2
            if (this._deInst.rs2 != Register.zero) {
                if (this._exInst != null && this._deInst.rs2 == this._exInst.rd) {
                    let valid = !this.isLoadInstruction(this._exInst);
                    rs2Bypass = [valid, true, this._exAluData];
                } else if (this._maInst != null && this._deInst.rs2 == this._maInst.rd) {
                    rs2Bypass = [true, true, this._maWriteBackData];
                } else if (this._wbInst != null && this._deInst.rs2 == this._wbInst.rd) {
                    rs2Bypass = [true, true, this._wbStoreData];
                }
            }
        }
        return [rs1Bypass, rs2Bypass];
    }

    /**
     * Executes the ALU operation and returns the result
     * @returns Alu result
     */
    executeAluOperation() {
        if (this._exInst == null) {
            return 0;
        } else {
            switch (this._exInst.instruction) {
                case Instruction.add:
                case Instruction.addi:
                case Instruction.lb:
                case Instruction.lbu:
                case Instruction.lh:
                case Instruction.lhu:
                case Instruction.lw:
                case Instruction.sb:
                case Instruction.sh:
                case Instruction.sw:
                case Instruction.auipc:
                case Instruction.lui:
                case Instruction.jalr:
                case Instruction.jal:
                    return this._exDataA + this._exDataB;
                case Instruction.sub:
                    return this._exDataA - this._exDataB;
                case Instruction.and:
                case Instruction.andi:
                    return this._exDataA & this._exDataB;
                case Instruction.or:
                case Instruction.ori:
                    return this._exDataA | this._exDataB;
                case Instruction.xor:
                case Instruction.xori:
                    return this._exDataA ^ this._exDataB;
                case Instruction.beq:
                    return (this._exDataA == this._exDataB) ? 1 : 0;
                case Instruction.bne:
                    return (this._exDataA != this._exDataB) ? 1 : 0;
                case Instruction.blt:
                case Instruction.slt:
                case Instruction.slti:
                    return (compareSigned(this._exDataA, this._exDataB) < 0) ? 1 : 0;
                case Instruction.bltu:
                case Instruction.sltu:
                case Instruction.sltui:
                    return (compareUnsigned(this._exDataA, this._exDataB) < 0) ? 1 : 0;
                case Instruction.bge:
                    return (compareSigned(this._exDataA, this._exDataB) >= 0) ? 1 : 0;
                case Instruction.bgeu:
                    return (compareUnsigned(this._exDataA, this._exDataB) >= 0) ? 1 : 0;
                case Instruction.sll:
                case Instruction.slli:
                    return this._exDataA << this._exDataB;
                case Instruction.srl:
                case Instruction.srli:
                    return this._exDataA >>> this._exDataB;
                case Instruction.sra:
                case Instruction.srai:
                    return this._exDataA >> this._exDataB;
            }
        }
    }

    /**
     * Executes the memory operation and returns the result
     * @returns Mem result
     */
    executeMemoryOperation() {
        if (this._exInst == null) {
            return 0;
        } else {
            const addr = this._maAddr;
            switch (this._exInst.instruction) {
                case Instruction.lb: {
                    const data = this.readData(addr);
                    return byteToSigned(data >>> (8 * (addr % 4)));
                }
                case Instruction.lh: {
                    const data = this.readData(addr);
                    return halfwordToSigned(data >>> (8 * (addr % 4)));
                }
                case Instruction.lw: {
                    return this.readData(addr);
                }
                case Instruction.lbu: {
                    const data = this.readData(addr);
                    return byteToUnsigned(data >>> (8 * (addr % 4)));
                }
                case Instruction.lhu: {
                    const data = this.readData(addr);
                    return halfwordToUnsigned(data >>> (8 * (addr % 4)));
                }
                case Instruction.sb: {
                    const offset = (addr % 4) * 8;
                    const mask = 0xFF << offset;
                    const currentData = this.readData(addr) & ~mask;
                    const storeData = (this._maStoreData << offset) & mask;
                    this.writeData(addr, storeData | currentData);
                    return 0;
                }
                case Instruction.sh: {
                    const offset = (addr % 4) * 8;
                    const mask = 0xFFFF << offset;
                    const currentData = this.readData(addr) & ~mask;
                    const storeData = (this._maStoreData << offset) & mask;
                    this.writeData(addr, storeData | currentData);
                    return 0;
                }
                case Instruction.sw: {
                    this.writeData(addr, this._maStoreData);
                    return 0;
                }
                default:
                    return 0;
            }
        }
    }

    /**
     * Checks if the branch is taken
     * @returns branch taken
     */
    getBranchTaken() {
        if (this._exInst == null) {
            return false;
        } else {
            switch (this._exInst.instruction) {
                case Instruction.beq:
                case Instruction.bne:
                case Instruction.blt:
                case Instruction.bltu:
                case Instruction.bge:
                case Instruction.bgeu:
                    return this._exAluData == 1;
                case Instruction.jal:
                case Instruction.jalr:
                    return true;
                default:
                    return false;
            }
        }
    }

    /**
     * Computes the base address of the branch
     * @returns branch base
     */
    getBranchBase() {
        if (this._exInst == null) {
            return 0;
        } else {
            switch (this._exInst.instruction) {
                case Instruction.beq:
                case Instruction.bne:
                case Instruction.blt:
                case Instruction.bltu:
                case Instruction.bge:
                case Instruction.bgeu:
                case Instruction.jal:
                    return this._exPC;
                case Instruction.jalr:
                    return this._deDataA;
                default:
                    return 0;
            }
        }
    }

    /**
     * Returns the operands for the execute stage
     * @returns [DataA, DataB]
     */
    getExecuteOperands() {
        if (this._deInst == null) {
            return [0, 0];
        } else {
            switch (this._deInst.format) {
                case Format.rv32i_r_format:
                case Format.rv32i_b_format:
                    return [this._deDataA, this._deDataB];
                case Format.rv32i_s_format:
                    return [this._deDataA, this.deImmed];
                case Format.rv32i_i_format:
                    if (this._deInst.inst == Instruction.jalr) {
                        return [this._dePC, 4];
                    } else {
                        return [this._deDataA, this.deImmed];
                    }
                case Format.rv32i_j_format:
                    return [this._dePC, 4];
                case Format.rv32i_u_format:
                    if (this._deInst.inst == Instruction.auipc) {
                        return [this._dePC, this.deImmed];
                    } else {
                        return [this._deDataA, this.deImmed];
                    }
                default:
                    return [0, 0];
            }
        }
    }

    get registers() {
        return this._registers;
    }

    //Instruction fetch getters
    /**
     * Fetch PC
     */
    get ifPC() {
        return this._ifPC;
    }

    /**
     * Fetch instruction
     */
    get ifInst() {
        return this._ifInst;
    }

    //Instruction decode getters
    /**
     * Decode instruction
     */
    get deInst() {
        return this._deInst;
    }

    /**
     * Decode data A
     */
    get deDataA() {
        return this._deDataA;
    }

    /**
     * Decode data b
     */
    get deDataB() {
        return this._deDataB;
    }

    /**
     * Decode RS1
     */
    get deRS1() {
        return this._deInst?.rs1 ?? 0;
    }

    /**
     * Decode RS2
     */
    get deRS2() {
        return this._deInst?.rs2 ?? 0;
    }

    /**
     * Decode, value from the RS1 register
     */
    get deRegDataA() {
        return this._deRegDataA;
    }

    /**
     * Decode, value from the RS2 register
     */
    get deRegDataB() {
        return this._deRegDataB;
    }

    /**
     * Decode immediate
     */
    get deImmed() {
        return this._deInst?.immed ?? 0;
    }

    /**
     * Decode PC
     */
    get dePC() {
        return this._dePC;
    }

    /**
     * Decode data a bypass selector
     */
    get deBypassA() {
        return this._deBypassA;
    }

    /**
     * Decode data b bypass selector
     */
    get deBypassB() {
        return this._deBypassB;
    }

    //Execute getters
    /**
     * Execute instruction
     */
    get exInst() {
        return this._exInst;
    }

    /**
     * Execute data a
     */
    get exDataA() {
        return this._exDataA;
    }

    /**
     * Execute data b
     */
    get exDataB() {
        return this._exDataB;
    }

    /**
     * Execute ALU result
     */
    get exAluData() {
        return this._exAluData;
    }

    /**
     * Execute store data
     */
    get exStoreData() {
        return this._exStoreData;
    }

    /**
     * Execute branch address
     */
    get exBranchAddr() {
        return this._exBranchAddr;
    }

    /**
     * Execute branch base address
     */
    get exBranchBase() {
        return this._exBranchBase;
    }

    /**
     * Execute immediate
     */
    get exImmed() {
        return this._exInst?.immed ?? 0;
    }

    /**
     * Execute branch taken
     */
    get exBranchTaken() {
        return this._exBranchTaken;
    }

    /**
     * Execute PC
     */
    get exPC() {
        return this._exPC;
    }

    //Memory access getters
    /**
     * Memory access instruction
     */
    get maInst() {
        return this._maInst;
    }

    /**
     * Memory access store data
     */
    get maStoreData() {
        return this._maStoreData;
    }

    /**
     * Memory access load data
     */
    get maLoadData() {
        return this._maLoadData;
    }

    /**
     * Memory access address
     */
    get maAddr() {
        return this._maAddr;
    }

    /**
     * Memory access ALU data
     */
    get maAluData() {
        return this._maAluData;
    }

    /**
     * Memory access load/ALU selector
     */
    get maLoadOp() {
        return this._maLoadOp;
    }

    /**
     * Memory access write back data
     */
    get maWriteBackData() {
        return this._maWriteBackData;
    }

    /**
     * Memory access PC
     */
    get maPC() {
        return this._maPC;
    }

    //Write back getters
    /**
     * Write back instruction
     */
    get wbInst() {
        return this._wbInst;
    }

    /**
     * Write back RD
     */
    get wbRD() {
        return this._wbInst?.rd ?? 0;
    }

    /**
     * Write back store data
     */
    get wbStoreData() {
        return this._wbStoreData;
    }

    /**
     * Write back PC
     */
    get wbPC() {
        return this._wbPC;
    }

    /**
     * Branch
     */
    get branch() {
        return this._exBranchTaken;
    }

    /**
     * Data hazard
     */
    get dataHazard() {
        return this._dataHazard;
    }
}