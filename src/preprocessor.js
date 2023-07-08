
/**
 * Preprocesses the code
 * 
 * The preprocessor removes the comments, newlines and replaces labels with offsets
 * 
 * @param {string} code 
 * @returns preprocessed code
 */
export function preprocess(code) {
    let lines_of_code = code.split('\n');

    //Seperate labels from instructions and remove the comments
    let position = 0;
    let labels = new Map();
    let instructions = [];
    for (let line of lines_of_code) {
        line = line.trim();
        if (!is_comment(line) && line.length > 0) {
            if (is_label(line)) {
                labels.set(extract_label(line), position);
            } else {
                instructions.push(remove_comments(line));
                position++;
            }
        }
    }

    //Replace labels in instructions with offsets
    position = 0
    let processedInstructions = [];
    for (let instruction of instructions) {
        const { groups: { head, label } } = /(?<head>.*) (?:(?<label>\w[\w\d]*))?/.exec(instruction);
        if (label != undefined && labels.has(label)) {
            const offset = (labels.get(label) - position) * 4;
            processedInstructions.push(`${head} ${offset}`);
        } else {
            processedInstructions.push(instruction);
        }
        ++position;
    }

    return processedInstructions;
}

/**
 * Removes trailing comments from the instruction
 * 
 * @param {string} line_of_code 
 * @returns 
 */
function remove_comments(line_of_code) {
    const { groups: { instruction } } = /(?<instruction>.*)#?.*/.exec(line_of_code);
    return instruction;
}

/**
 * Checks if the line is a label
 * 
 * @param {string} line 
 */
function is_label(line) {
    return /\w[\w\d]*:/.test(line);
}

/**
 * Checks if the line is a comment
 * 
 * @param {string} line 
 * @returns 
 */
function is_comment(line) {
    return /#.*/.test(line);
}

/**
 * Extracts the label from the line
 * 
 * @param {string} line 
 */
function extract_label(line) {
    const { groups: { label } } = /(?<label>\w[\w\d]*):/.exec(line);
    return label;
}