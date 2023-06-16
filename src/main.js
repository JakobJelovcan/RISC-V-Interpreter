import { Pipeline } from "./pipeline.js";
import { LabelPositions } from './labels.js'

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


        for(let i = 0; i < 5; ++i) {
            this._pipelineUtilization[i] = new Array(5);
            this._pipelineUtilization[i].fill(null);
        }

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

        for(let i = 0; i < 5; ++i) {
            for(let j = 0; j < 5; ++j) {
                this._context.fillStyle = (this._pipelineUtilization[i][j] == null) ? 'red' : 'green';
                this._context.fillRect(offsetX + (rectSize + padding) * (i + j), offsetY + (rectSize + padding) * i, rectSize, rectSize);
            }
        }
    }

    /**
     * Draws the values on to the schematic
     */
    drawContent() {
        const fontSize = 0.02 * this._height;
        this._context.fillStyle = 'green';
        this._context.font = `${Math.round(fontSize)}px calibri`;

        for(const [key, coordinates] of Object.entries(LabelPositions)) {
            // const content = pipeline[key];
            // let text;
            // if(typeof(content) == 'boolean') {
            //     text = (content) ? 1 : 0;
            // } else if(typeof(content) == 'number') {
            //     text = content.toString(16).padStart(8, '0');
            // } else {
            //     text = content.code;
            // }

            let text = 'FFFFFFF';

            if(key.endsWith('Inst')) {
                text = 'addi x0, x1, x2'
            } else if(key == 'deDataABypassSel' || key == 'deDataBBypassSel' || key == 'maLoadOp' || key == 'exBranchTaken') {
                text = '0';
            } else if(key == 'deRS1' || key == 'deRS2' || key == 'wbRD') {
                text = '31';
            }

            
            coordinates.forEach(c => {
                const [x, y] = c;
                this._context.fillText(text, x * this._width, y * this._height);
            });
        }
    }
}

let canvas = document.querySelector('canvas');
let sim = new Simulator(canvas);