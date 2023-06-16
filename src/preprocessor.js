/**
 * The function preprocesses the code by removing all comments and replacing labels with offsets
 * 
 * @param {String} code 
 * @returns instructions
 */
export function preprocess(code) {
    if (typeof (code) != "string") {
        throw new TypeError("Code has to be of type string");
    }

    let lines = code.split('\n');

    let labels = new Map();
    let instructions = [];

    //Seperate lables and instructions
    let currentLine = 0;
    lines.forEach(line => {
        let instruction = line.trim();
        if (instruction.length > 0) {
            if (instruction.endsWith(':')) {
                labels.set(instruction.substring(0, instruction.length - 1), currentLine);
            } else if (!instruction.startsWith('#')) {
                instructions.push(instruction);
                ++currentLine;
            }
        }
    })

    //Replace labels in instructions with offsets
    let processedInstructions = []
    currentLine = 0
    instructions.forEach(instruction => {
        if (instruction.startsWith('j') || instruction.startsWith('b')) {
            const { groups: { head, label } } = /(?<head>[j|b].*, )(?<label>.*)/.exec(instruction)
            if (labels.has(label)) {
                let offset = (labels.get(label) - currentLine) * 4;
                processedInstructions.push(`${head}${offset}`);
            } else {
                processedInstructions.push(instruction);
            }
        } else {
            processedInstructions.push(instruction);
        }
        ++currentLine;

    })

    return processedInstructions;
}