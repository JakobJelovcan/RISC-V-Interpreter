import { Registers } from "./registers.js"
import {
    rv32i_b_instruction,
    rv32i_i_instruction,
    rv32i_j_instruction,
    rv32i_r_instruction,
    rv32i_s_instruction,
    rv32i_u_instruction,
    Instruction
} from "./instruction.js"

export class Pipeline {
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
        this._deImmed = 0;
        this._dePC = 0;
        this._deDataABypassSel = false;
        this._deDataBBypassSel = false;
        //Execute
        this._exInst = null;
        this._exDataA = 0;
        this._exDataB = 0;
        this._exAluData = 0;
        this._exStoreData = 0;
        this._exBranchAddr = 0;
        this._exBranchBase = 0;
        this._exImmed = 0;
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

    readRegister(reg) {
        return this._registers[reg];
    }

    writeRegister(reg, data) {
        if (reg != 0) {
            this._registers[reg] = data;
        }
    }

    readInstruction(pc) {
        return this._instructionMemory[Math.floor(pc / 4)];
    }

    readData(addr, size) {
        let val = this._dataMemory[Math.floor(addr / 4)];
        if (size == 1) {
            val >>>= 8 * (3 - addr % 4);
            return val &= 0xFF;
        } else if (size == 2) {
            val >>>= 8 * (3 - addr % 4);
            return val &= 0xFFFF;
        } else {
            return val;
        }
        //TODO: unsigned
    }


    writeData(addr, size, data) {
        let val = this._dataMemory[Math.floor(addr / 4)];
        let mask = 0xFFFFFFFF;
        if (size == 1) {
            mask = 0xFF;
            data &= mask;
        } else if (size == 2) {
            mask = 0xFFFF;
            data &= mask;
        }
        data <<= 8 * (3 - addr % 4);
        mask <<= 8 * (3 - addr % 4);

        val &= ~mask;
        val |= data;

        this._dataMemory[Math.floor(addr / 4)] = val;
    }

    /**
     * Executes a cycle
     */
    execute() {
        this.writeBackStage();
        this.memoryAccessStage();
        if (this._dataHazard) {
            this._dataHazard = false;
            this.flushExecute();
        } else {
            this.executeStage();
        }
        if (this._exBranchTaken) {
            this.flushFetchAndDecode();
        } else {
            this.decodeStage();
            this.instructionFetchStage();
        }
        this.writeRegister(this._wbInst?.rd ?? 0, this._wbStoreData);
        if(!this._dataHazard) {
            this._pc = (this._exBranchTaken) ? this._exBranchAddr : this._pc + 4;
        }
    }

    flushExecute() {
        this._exInst = null;
        this._dataHazard = false;
        this._exAluData = 0;
        this._exBranchAddr = 0;
        this._exBranchTaken = false;
        this._exBranchBase = 0;
        this._exImmed = 0;
        this._exDataA = 0;
        this._exDataB = 0;
        this._exPC = 0;
        this._exStoreData = 0;
    }

    flushFetchAndDecode() {
        this._deInst = null;
        this._dePC = 0;
        this._dataHazard = 0;
        this._deDataABypassSel = false;
        this._deDataBBypassSel = false;
        this._deRegA = 0;
        this._deRegB = 0;
        this._deRegDataA = 0;
        this._deRegDataB = 0;
        this._deDataA = 0;
        this._deDataA = 0;
        this._ifPC = 0;
        this._ifInst = null;
    }

    instructionFetchStage() {
        this._ifPC = this._pc;
        this._ifInst = this.readInstruction(this._ifPC);
    }

    decodeStage() {
        this._deInst = this._ifInst;
        this._dePC = this._ifPC;
        const [[rs1Valid, rs1Use, rs1Data], [rs2Valid, rs2Use, rs2Data]] = this.bypassUnit();

        this._dataHazard = !rs1Valid || !rs2Valid;

        this._deDataABypassSel = rs1Use;
        this._deDataBBypassSel = rs2Use;

        this._deRegDataA = this.readRegister(this._deRegA);
        this._deRegDataB = this.readRegister(this._deRegB);
        this._deDataA = (this._deDataABypassSel) ? rs1Data : this._deRegDataA;
        this._deDataB = (this._deDataBBypassSel) ? rs2Data : this._deRegDataB;
        this._deImmed = this._deInst?.immed ?? 0;
    }

    executeStage() {
        this._exInst = this._deInst;
        this._exPC = this._dePC;
        [this._exDataA, this._exDataB] = this.getExData();
        this._exStoreData = this._deDataB;
        this._exImmed = this._deImmed;
        this._exAluData = this.executeAluOperation();
        this._exBranchBase = this.getBranchBase();
        this._exBranchTaken = this.getBranchTaken();
        this._exBranchAddr = this._exBranchBase + this._exImmed;
    }

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
                case Instruction.lbh:
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
            if (this._deInst.rs1 != Registers.zero) {
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
            if (this._deInst.rs2 != Registers.zero) {
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
                    return (this._exDataA < this._exDataB) ? 1 : 0;
                case Instruction.bltu:
                case Instruction.sltu:
                case Instruction.sltui:
                    //TODO: Fix unsigned
                    return (this._exDataA < this._exDataB) ? 1 : 0;
                case Instruction.bge:
                    return (this._exDataA >= this._exDataB) ? 1 : 0;
                case Instruction.bgeu:
                    //TODO: Fix unsigned
                    return (this._exDataA >= this._exDataB) ? 1 : 0;
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

    executeMemoryOperation() {
        if (this._exInst == null) {
            return 0;
        } else {
            switch (this._exInst.instruction) {
                case Instruction.lb:
                    return this.readData(this._maAddr, 1);
                case Instruction.lh:
                    return this.readData(this._maAddr, 2);
                case Instruction.lw:
                    return this.readData(this._maAddr, 4);
                case Instruction.lbu:
                    return this.readData(this._maAddr, 1);
                case Instruction.lhu:
                    return this.readData(this._maAddr, 2);
                case Instruction.sb:
                    this.writeData(this._maAddr, 1, this._maStoreData);
                    return 0;
                case Instruction.sh:
                    this.writeData(this._maAddr, 2, this._maStoreData);
                    return 0;
                case Instruction.sw:
                    this.writeData(this._maAddr, 4, this._maStoreData);
                    return 0;
                default:
                    return 0;
            }
        }
    }

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

    getExData() {
        if (this._deInst == null) {
            return [0, 0];
        } else {
            switch (this._deInst.constructor) {
                case rv32i_r_instruction:
                case rv32i_b_instruction:
                    return [this._deDataA, this._deDataB];
                case rv32i_s_instruction:
                    return [this._deDataA, this._deImmed];
                case rv32i_i_instruction:
                    if (this._deInst.inst == Instruction.jalr) {
                        return [this._dePC, 4];
                    } else {
                        return [this._deDataA, this._deImmed];
                    }
                case rv32i_j_instruction:
                    return [this._dePC, 4];
                case rv32i_u_instruction:
                    if (this._deInst.inst == Instruction.auipc) {
                        return [this._dePC, this._deDataB];
                    } else {
                        return [this._deDataA, this._deDataB];
                    }
                default:
                    return [0, 0];
            }
        }
    }

    //Instruction fetch getters
    get ifPC() {
        return this._ifPC;
    }

    get ifInst() {
        return this._ifInst;
    }

    //Instruction decode getters
    get deInst() {
        return this._deInst;
    }

    get deDataA() {
        return this._deDataA;
    }

    get deDataB() {
        return this._deDataB;
    }

    get deRS1() {
        return this._deInst?.rs1 ?? 0;
    }

    get deRS2() {
        return this._deInst?.rs2 ?? 0;
    }

    get deRegDataA() {
        return this._deRegDataA;
    }

    get deRegDataB() {
        return this._deRegDataB;
    }

    get deImmed() {
        return this._deImmed;
    }

    get dePC() {
        return this._dePC;
    }

    get deDataABypassSel() {
        return this._deDataABypassSel;
    }

    get deDataBBypassSel() {
        return this._deDataBBypassSel;
    }

    //Execute getters
    get exInst() {
        return this._exInst;
    }

    get exDataA() {
        return this._exDataA;
    }

    get exDataB() {
        return this._exDataB;
    }

    get exAluData() {
        return this._exAluData;
    }

    get exStoreData() {
        return this._exStoreData;
    }

    get exBranchAddr() {
        return this._exBranchAddr;
    }

    get exBranchBase() {
        return this._exBranchBase;
    }

    get exImmed() {
        return this._exImmed;
    }

    get exBranchTaken() {
        return this._exBranchTaken;
    }

    get exPC() {
        return this._exPC;
    }

    //Memory access getters
    get maInst() {
        return this._maInst;
    }

    get maStoreData() {
        return this._maStoreData;
    }

    get maLoadData() {
        return this._maLoadData;
    }

    get maAddr() {
        return this._maAddr;
    }

    get maAluData() {
        return this._maAluData;
    }

    get maLoadOp() {
        return this._maLoadOp;
    }

    get maWriteBackData() {
        return this._maWriteBackData;
    }

    get maPC() {
        return this._maPC;
    }

    //Write back getters
    get wbInst() {
        return this._wbInst;
    }

    get wbRD() {
        return this._wbInst?.rd ?? 0;
    }

    get wbStoreData() {
        return this._wbStoreData;
    }

    get wbPC() {
        return this._wbPC;
    }

    get branch() {
        return this._exBranchTaken;
    }

    get dataHazard() {
        return this._dataHazard;
    }
}