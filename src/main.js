import { Pipeline } from './pipeline.js';
import { Labels } from './labels.js'
import { signedToHex } from './util.js';
import { preprocess } from './preprocessor.js'
import { decodeInstructions } from './instruction.js';

class Simulator {
    /**
     * Constructs a simulator object
     * @param {Canvas} canvas 
     */
    constructor(labels, registers, canvas) {
        this._registers = registers;
        this._canvas = canvas;
        this._context = canvas.getContext('2d');
        this._labels = labels;
        this._pipelineUtilization = [];
        this._pipeline = new Pipeline([]);
        this.update = this.update.bind(this);
        this.updateLabels();
        requestAnimationFrame(this.update);
    }

    /**
     * Updates the display
     */
    update() {
        const height = this._canvas.getBoundingClientRect().height;
        const width = this._canvas.getBoundingClientRect().width;
        this._context.clearRect(0, 0, width, height);
        this.drawUtilization();
        requestAnimationFrame(this.update);
    }

    /**
     * Draws the pipeline utilization graph
     */
    drawUtilization() {
        const rectSize = 20;
        const padding = 4;
        const offsetX = 10;
        const offsetY = 10;

        for(let i = 0; i < this._pipelineUtilization.length; ++i) {
            for(let j = 0; j < 5; ++j) {
                this._context.fillStyle = (this._pipelineUtilization[i][j] == null) ? 'red' : 'green';
                this._context.fillRect(offsetX + (rectSize + padding) * (i + j), offsetY + (rectSize + padding) * i, rectSize, rectSize);
            }
        }
    }

    /**
     * Gets an array containing instructions currently in the pipeline
     * @returns utilization
     */
    getUtilization() {
        const utilization = new Array(5);
        utilization[0] = this._pipeline.ifInst;
        utilization[1] = this._pipeline.deInst;
        utilization[2] = this._pipeline.exInst;
        utilization[3] = this._pipeline.maInst;
        utilization[4] = this._pipeline.wbInst;
        return utilization;
    }

    /**
     * Updates labels with the current values from the pipeline
     */
    updateLabels() {
        for(const [key, elements] of this._labels.entries()) {
            const value = this._pipeline[key];
            let text = this.getLabelText(value);
            elements.forEach(e => e.innerHTML = text);
        }
    }

    /**
     * 
     */
    updateRegisters() {
        let content = '';
        const registers = this._pipeline.registers;
        for(let i = 0; i < 32; ++i) {
            if(i < 10) {
                content += `x0${i}: ${registers[i]}\n`;
            } else {
                content += `x${i}: ${registers[i]}\n`;
            }
        }
        this._registers.innerHTML = content;
    }

    /**
     * Returns a string representing the value
     * @param {Object} value 
     * @returns 
     */
    getLabelText(value) {
        if(typeof(value) == 'boolean') {
            return (value) ? '1' : '0';
        } else if(typeof(value) == 'number') {
            return signedToHex(value);
        } else if(value != null) {
            return value.code;
        } else {
            return 'nop';
        }
    }

    /**
     * Loads the code in to the simulator
     * @param {String} code 
     */
    load(code) {
        this._pipelineUtilization = [];
        const preprocessedCode = preprocess(code);
        const instructions = decodeInstructions(preprocessedCode);
        this._pipeline = new Pipeline(instructions);
    }

    /**
     * Executes a cycle
     */
    step() {
        this._pipeline.execute();
        this.updateLabels();
        this.updateRegisters();
        const utilization = this.getUtilization();
        this._pipelineUtilization.push(utilization);
        if(this._pipelineUtilization.length > 5) {
            this._pipelineUtilization.shift();
        }
    }
}

const canvas = document.querySelector('#canvas');
const registers = document.querySelector('#registers');
const labels = getLabels();
const sim = new Simulator(labels, registers, canvas);
document.querySelector('#loadButton').addEventListener('click', loadClick);
document.querySelector('#editorButton').addEventListener('click', editorClick);
document.querySelector('#stepButton').addEventListener('click', stepClick);
document.querySelector('#registersButton').addEventListener('click', registersClick);
document.querySelector('#pointerCapture').addEventListener('click', pointerCaptureClick);

/**
 * Loads the html elements for displaying pipeline values into a dictionary
 * @returns Labels
 */
function getLabels() {
    const dict = new Map();
    Labels.forEach(label => {
        const xpath = `//font[text()='${label}']`;
        const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        let elements = [];
        let element = null;
        while((element = result.iterateNext())) {
            elements.push(element);
        }
        dict.set(label, elements);
    });
    return dict;
}

/**
 * Event handler for loadButton click
 */
function loadClick() {
    const editor = document.querySelector('#editor');
    const code = editor.value;
    sim.load(code);
}

/**
 * Event handler for stepButton click
 */
function stepClick() {
    sim.step();
}

/**
 * Event handler for editorButton click
 */
function editorClick() {
    const editor = document.querySelector('#editor');
    editor.classList.toggle('open');
    const registers = document.querySelector('#registers');
    registers.classList.remove('open');
}

/**
 * Event handler for registersButton click
 */
function registersClick() {
    const registers = document.querySelector('#registers');
    registers.classList.toggle('open');
    const editor = document.querySelector('#editor');
    editor.classList.remove('open');
}

/**
 * Event handler for pointerCapture click
 */
function pointerCaptureClick() {
    const editor = document.querySelector('#editor');
    editor.classList.remove('open');
    const registers = document.querySelector('#registers');
    registers.classList.remove('open');
}