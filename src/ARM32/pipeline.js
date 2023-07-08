import { Register } from "./registers.js"
import { Condition, Instruction, Modifier } from "./instruction.js"
import { byteToSigned, byteToUnsigned, halfwordToSigned, halfwordToUnsigned } from "../util.js";

export class arm_pipeline {
    /**
     * 
     * @param {Object} instructions 
     */
    constructor(instructions) {
        this._cpsr = new cpsr();
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
        this._exValid = false;
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
        this._maValid = false;
        this._maStoreData = 0;
        this._maLoadData = 0;
        this._maAddr = 0;
        this._maAluData = 0;
        this._maLoadOp = false;
        this._maWriteBackData = 0;
        this._maPC = 0;
        //Write back
        this._wbInst = null;
        this._wbValid = false;
        this._wbStoreData = 0;
        this._wbPC = 0;

        this._dataHazard = false;

        this._registers = new Array(16);
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
        if(this.isWriteBackInstruction() && this._wbValid) {
            this.writeRegister(this.wbRD, this._wbStoreData);
        }

        if (!this._dataHazard) {
            //If there isn't a data hazard update the PC
            this.writeRegister(Register.pc, (this._exBranchTaken) ? this._exBranchAddr : this.readRegister(Register.pc) + 4);
        }
    }

    /**
     * Resets the execute stage to default values
     */
    flushExecute() {
        this._exInst = null;
        this._exValid = false;
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
        this._ifPC = this.readRegister(Register.pc);
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
        this._exValid = (this._exInst != null) ? this.getConditional(this._exInst.condition) : false;
        this._exAluData = this.executeAluOperation();
        this._exBranchBase = this.getBranchBase();
        this._exBranchTaken = this.getBranchTaken() && this._exValid;
        this._exBranchAddr = this._exBranchBase + this.exImmed;
    }

    /**
     * Performs operations in the memory access stage
     */
    memoryAccessStage() {
        this._maInst = this._exInst;
        this._maValid = this._exValid;
        this._maPC = this._exPC;
        this._maAluData = this._exAluData;
        this._maAddr = this._exAluData;
        this._maStoreData = this._exStoreData;
        this._maLoadOp = this.isLoadInstruction(this._maInst);
        this._maLoadData = (this._maValid) ? this.executeMemoryOperation() : 0;
        this._maWriteBackData = (this._maLoadOp) ? this._maLoadData : this._maAluData;
    }

    /**
     * Performs operations in the write back stage
     */
    writeBackStage() {
        this._wbInst = this._maInst;
        this._wbValid = this._maValid;
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
                case Instruction.ldr:
                case Instruction.ldrb:
                case Instruction.ldrsb:
                case Instruction.ldrh:
                case Instruction.ldrsh:
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
                case Instruction.ldr:
                case Instruction.str:
                case Instruction.b:
                case Instruction.bl:
                case Instruction.bx: {
                    const res = this._exDataA + this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, true);
                    }
                    return res;
                }
                case Instruction.adc: {
                    const res = this._exDataA + this._exDataB + (this._cpsr.c) ? 1 : 0;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, true);
                    }
                    return res;
                }
                case Instruction.sub: {
                    const res = this._exDataA - this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, true);
                    }
                    return res;
                }
                case Instruction.rsb: {
                    const res = this._exDataB - this._exDataA;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, true);
                    }
                    return res;
                }
                case Instruction.mul: {
                    const res = this._exDataA * this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, true);
                    }
                    return res;
                }
                case Instruction.lsl: {
                    const res = this._exDataA << this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, false);
                    }
                    return res;
                }
                case Instruction.lsr: {
                    const res = this._exDataA >>> this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, false);
                    }
                    return res;
                }
                case Instruction.asr: {
                    const res = this._exDataA >> this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, false);
                    }
                    return res;
                }
                case Instruction.and: {
                    const res = this._exDataA & this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, false);
                    }
                    return res;
                }
                case Instruction.orr: {
                    const res = this._exDataA | this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, false);
                    }
                    return res;
                }
                case Instruction.eor: {
                    const res = this._exDataA ^ this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, this._exDataB, res, false);
                    }
                    return res;
                }
                case Instruction.bic: {
                    const res = this._exDataA & (~this._exDataB);
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(this._exDataA, (~this._exDataB), res, false);
                    }
                    return res;
                }
                case Instruction.mov: {
                    const res = this._exDataB;
                    if(this._exInst.modifier == Modifier.s) {
                        this.setFlags(0, this._exDataB, res, false);
                    }
                    return res;
                }
                case Instruction.cmp: {
                    const res = this._exDataA - this._exDataB;
                    this.setFlags(this._exDataA, this._exDataB, res, true);
                    return 0;
                }
                case Instruction.cmn: {
                    const res = this._exDataA + this._exDataB;
                    this.setFlags(this._exDataA, this._exDataB, res, true);
                    return 0;
                }
                case Instruction.tst: {
                    const res = this._exDataA & this._exDataB;
                    this.setFlags(this._exDataA, this._exDataB, res, false);
                    return 0;
                }
                case Instruction.teq: {
                    const res = this._exDataA ^ this._exDataB;
                    this.setFlags(this._exDataA, this._exDataB, res, false);
                    return 0;
                }
            }
        }
    }

    /**
     * Sets the flags
     * 
     * @param {Number} a 
     * @param {Number} b 
     * @param {Number} r 
     * @param {Boolean} set_v 
     */
    setFlags(a, b, r, set_v) {
        this._cpsr.z = this.isZero(r);
        this._cpsr.n = this.isNegative(r);
        this._cpsr.c = this.isCarry(r);
        if(set_v) {
            this._cpsr.v = this.isOverflow(a, b, r);
        }
    }

    /**
     * Tests for zero
     * 
     * @param {Number} r 
     * @returns 
     */
    isZero(r) {
        return (r & 0xFFFFFFFF) == 0;
    }

    /**
     * Tests for negative
     * 
     * @param {Number} r 
     * @returns 
     */
    isNegative(r) {
        return (r & 0x80000000) != 0;
    }

    /**
     * Tests for carry
     * 
     * @param {Number} r 
     * @returns 
     */
    isCarry(r) {
        const i = BigInt(r);
        return (i & BigInt(0x80000000)) != BigInt(0);
    }

    /**
     * Tests for overflow
     * 
     * @param {Number} a 
     * @param {Number} b 
     * @param {Number} r 
     * @returns 
     */
    isOverflow(a, b, r) {
        const a31 = (a & 0x80000000) >>> 31;
        const b31 = (b & 0x80000000) >>> 31;
        const r31 = (r & 0x80000000) >>> 31;

        return (a31 == 1 && b31 == 1 && r31 == 0 || a31 == 0 && b31 == 0 && r31 == 1);
    }

    /**
     * Checks if the instruction in the write back stage stores it's result into the register unit
     * @returns 
     */
    isWriteBackInstruction() {
        if(this._wbInst == null) {
            return false;
        } else {
            switch(this._wbInst.instruction) {
                case Instruction.add:
                case Instruction.ldr:
                case Instruction.ldrb:
                case Instruction.ldrsb:
                case Instruction.ldrh:
                case Instruction.ldrsh:
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
                case Instruction.blle:
                case Instruction.sub:
                case Instruction.mul:
                case Instruction.and:
                case Instruction.orr:
                case Instruction.eor:
                case Instruction.bic:
                case Instruction.mov:
                    return true;
                case Instruction.cmp:
                case Instruction.cmn:
                case Instruction.tst:
                case Instruction.teq:
                case Instruction.str:
                case Instruction.strb:
                case Instruction.strh:
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
                case Instruction.ble:
                case Instruction.bx:
                    return false;
                default:
                    return false;
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
                case Instruction.ldr: {
                    switch(this._exInst.modifier) {
                        case Modifier.b: {
                            const data = this.readData(addr);
                            return byteToUnsigned(data >>> (8 * (addr % 4)));
                        }
                        case Modifier.sb: {
                            const data = this.readData(addr);
                            return byteToSigned(data >>> (8 * (addr % 4)));
                        }
                        case Modifier.h: {
                            const data = this.readData(addr);
                            return halfwordToUnsigned(data >>> (8 * (addr % 4)));
                        }
                        case Modifier.sh: {
                            const data = this.readData(addr);
                            return halfwordToSigned(data >>> (8 * (addr % 4)));
                        }
                        default: {
                            return this.readData(addr);
                        }
                    }
                }
                case Instruction.str: {
                    switch(this._exInst.modifier) {
                        case Modifier.b: {
                            const offset = (addr % 4) * 8;
                            const mask = 0xFF << offset;
                            const currentData = this.readData(addr) & ~mask;
                            const storeData = (this._maStoreData << offset) & mask;
                            this.writeData(addr, storeData | currentData);
                            return 0;
                        }
                        case Modifier.h: {
                            const offset = (addr % 4) * 8;
                            const mask = 0xFFFF << offset;
                            const currentData = this.readData(addr) & ~mask;
                            const storeData = (this._maStoreData << offset) & mask;
                            this.writeData(addr, storeData | currentData);
                            return 0;
                        }
                        default: {
                            this.writeData(addr, this._maStoreData);
                            return 0;
                        }
                    }
                }
                default: {
                    return 0;
                }
            }
        }
    }

    /**
     * Checks it the execution condition is fulfilled
     * @param {Condition} cond 
     * @returns 
     */
    getConditional(cond) {
        switch (cond) {
            case Condition.eq:
                return (this._cpsr.z == true);
            case Condition.ne:
                return (this._cpsr.z == false);
            case Condition.cs:
            case Condition.hs:
                return (this._cpsr.c == true);
            case Condition.cc:
            case Condition.lo:
                return (this._cpsr.c == false);
            case Condition.mi:
                return (this._cpsr.n == true);
            case Condition.pl:
                return (this._cpsr.n == false);
            case Condition.vc:
                return (this._cpsr.v == false);
            case Condition.vs:
                return (this._cpsr.v == true);
            case Condition.hi:
                return (this._cpsr.c == true) && (this._cpsr.z == false);
            case Condition.ls:
                return (this._cpsr.c == false) || (this._cpsr.z == true);
            case Condition.ge:
                return (this._cpsr.n == this._cpsr.v);
            case Condition.lt:
                return (this._cpsr.n != this._cpsr.v);
            case Condition.gt:
                return (this._cpsr.z == false) && (this._cpsr.n == this._cpsr.v);
            case Condition.le:
                return (this._cpsr.z == true) && (this._cpsr.n != this._cpsr.v);
            case Condition.al:
                return true;
            default:
                return false;
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
            switch(this._exInst.instruction) {
                case Instruction.b:
                case Instruction.bl:
                case Instruction.bx:
                    return this.getConditional(this._exInst.condition);
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
                case Instruction.ble:
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
                case Instruction.blle:
                    return this._exPC;
                case Instruction.bx:
                    return this._deDataA;

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
            switch (this._deInst.instruction) {
                case Instruction.bl:
                    return [this._dePC, 4];
                default:
                    return [this._deDataA, (this._deInst.useImmed) ? this._deInst.immed : this._deDataB];
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

class cpsr {
    constructor() {
        this._n = false;
        this._z = false;
        this._c = false;
        this._v = false;
    }

    get n() {
        return this._n;
    }

    set n(val) {
        this._n = val;
    }

    get z() {
        return this._z;
    }

    set z(val) {
        this._z = val;
    }

    get c() {
        return this._c;
    }

    set c(val) {
        this._c = val;
    }

    get v() {
        return this._v;
    }

    set v(val) {
        this._v = val;
    }
}