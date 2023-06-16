import { decodeInstructions } from "./instruction.mjs";
import { preprocess } from "./preprocessor.mjs"
import { Pipeline } from "./pipeline.mjs";

function main() {
    let instructions = preprocess(code);
    let decodedInstructions = decodeInstructions(instructions);
    let pipeline = new Pipeline(decodedInstructions);
    for(let i = 0; i < 50; ++i) {
        pipeline.execute();
    }
}

const code = "lw x3, 20(x0)\naddi x1, x3, 10\naddi x2, x0, 20\nadd x3, x2, x1";
main();