import { Pipeline } from './pipeline.js';
import { LabelPositions } from './labels.js'
import { signedToHex } from './util.js';
import { preprocess } from './preprocessor.js'
import { decodeInstructions } from './instruction.js';

class Simulator {
    /**
     * Constructs a simulator object
     * @param {Canvas} canvas 
     */
    constructor(canvas) {
        this._canvas = canvas;
        this._context = canvas.getContext('2d');
        this._pipelineUtilization = [];
        this._pipeline = new Pipeline([]);
        this._width = this._canvas.getBoundingClientRect().width;
        this._height = this._canvas.getBoundingClientRect().height;
        this.update = this.update.bind(this);
        requestAnimationFrame(this.update);
    }

    /**
     * Updates the display
     */
    update() {
        this._height = this._canvas.getBoundingClientRect().height;
        this._width = this._canvas.getBoundingClientRect().width;
        this._canvas.width = this._width;
        this._canvas.height = this._height;
        this._context.clearRect(0, 0, this._width, this._height);
        this.drawUtilization();
        this.drawContent();
        requestAnimationFrame(this.update);
    }

    /**
     * Draws the pipeline utilization graph
     */
    drawUtilization() {
        const rectSize = 0.04 * this._height;
        const padding = 4;
        const offsetX = (rectSize + padding);
        const offsetY = this._height - (rectSize + padding) * 5;
        const fontSize = 0.04 * this._height;

        //Draw the title for the pipeline utilization graph
        this._context.fillStyle = 'black';
        this._context.font = `${Math.round(fontSize)}px calibri`;
        this._context.fillText("Pipeline", offsetX, offsetY - (0.02 * this._height));

        for(let i = 0; i < this._pipelineUtilization.length; ++i) {
            for(let j = 0; j < 5; ++j) {
                this._context.fillStyle = (this._pipelineUtilization[i][j] == null) ? 'red' : 'green';
                this._context.fillRect(offsetX + (rectSize + padding) * (i + j), offsetY + (rectSize + padding) * i, rectSize, rectSize);
            }
        }
    }

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
     * Draws the values on to the schematic
     */
    drawContent() {
        const fontSize = 0.02 * this._height;
        this._context.fillStyle = 'green';
        this._context.font = `${Math.round(fontSize)}px calibri`;

        for(const [key, coordinates] of Object.entries(LabelPositions)) {
            const value = this._pipeline[key];
            let text = null;
            if(typeof(value) == 'boolean') {
                text = (value) ? '1' : '0';
            } else if(typeof(value) == 'number') {
                text = signedToHex(value);
            } else if(value != null) {
                text = value.code;
            } else {
                text = 'nop';
            }
            coordinates.forEach(c => {
                const [x, y, l] = c;
                this.drawTextCentered(text, l, x * this._width, y * this._height);
            });
        }
    }

    /**
     * Draws the text onto the screen
     * 
     * @param {String} text 
     * @param {Number} l number of characters from the back to be displayed
     * @param {Number} x horizontal position of the center of the text
     * @param {Number} y 
     */
    drawTextCentered(text, l, x, y) {
        text = text.substring(Math.max(0, text.length - l));
        const width = this._context.measureText(text).width;
        this._context.fillText(text, x - width / 2, y);
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
        const utilization = this.getUtilization();
        this._pipelineUtilization.push(utilization);
        if(this._pipelineUtilization.length > 5) {
            this._pipelineUtilization.shift();
        }
    }
}

const canvas = document.querySelector('canvas');
const sim = new Simulator(canvas);
document.querySelector('#loadButton').addEventListener('click', loadClick);
document.querySelector('#editorButton').addEventListener('click', editorClick);
document.querySelector('#stepButton').addEventListener('click', stepClick);

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
    const navBar = document.querySelector('#navBar');
    navBar.classList.toggle('shadow');
}