import { Pipeline } from "./pipeline.js";

export const LabelPositions = Object.freeze({
    "ifPC":
        [
            [0.075, 0.39],
            [0.19, 0.39],
        ],
    "ifInst":
        [
            [0.179, 0.67],
        ],
    "deInst":
        [
            [0.298, 0.67],
        ],
    "deDataA":
        [
            [0.418, 0.457],
        ],
    "deDataB":
        [
            [0.418, 0.597],
        ],
    "deRS1":
        [
            [0.279, 0.46],
        ],
    "deRS2":
        [
            [0.279, 0.6],
        ],
    // "deRegDataA":
    //     [
    //         [0.416, 0.44],
    //     ],
    // "deRegDataB":
    //     [
    //         [0.416, 0.577],
    //     ],
    // "deImmed":
    //     [
    //         [0, 0],
    //     ],
    "dePC":
        [
            [0.33, 0.39],
        ],
    "deDataABypassSel":
        [
            [0.41, 0.495],
        ],
    "deDataBBypassSel":
        [
            [0.41, 0.635],
        ],
    "exInst":
        [
            [0.54, 0.67],
        ],
    "exDataA":
        [
            [0.493, 0.482],
        ],
    "exDataB":
        [
            [0.493, 0.574],
        ],
    "exAluData":
        [
            [0.57, 0.53],
        ],
    "exStoreData":
        [
            [0.55, 0.61],
        ],
    "exBranchAddr":
        [
            [0.332, 0.110],
            [0.493, 0.447]
        ],
    // "exBranchBase":
    //     [
    //         [0, 0],
    //     ],
    // "exImmed":
    //     [
    //         [0, 0],
    //     ],
    "exBranchTaken":
        [
            [0.348, 0.065],
        ],
    "exPC":
        [
            [0.55, 0.39],
        ],
    "maInst":
        [
            [0.75, 0.67],
        ],
    "maStoreData":
        [
            [0.695, 0.61],
        ],
    "maLoadData":
        [
            [0.813, 0.46],
        ],
    // "maAddr":
    //     [
    //         [0, 0],
    //     ],
    "maAluData":
        [
            [0.695, 0.53],
        ],
    "maLoadOp":
        [
            [0.815, 0.564],
        ],
    "maWriteBackData":
        [
            [0.830, 0.509],
        ],
    "maPC":
        [
            [0.695, 0.39],
            [0.825, 0.39],
        ],
    // "wbInst":
    //     [
    //         [0, 0],
    //     ],
    "wbRD":
        [
            [0.563, 0.715],
        ],
    "wbStoreData":
        [
            [0.55, 0.761],
        ],
    // "wbPC":
    //     [
    //         [0, 0],
    //     ],
    // "branch":
    //     [
    //         [0, 0],
    //     ],
    // "dataHazard":
    //     [
    //         [0, 0],
    //     ],
});