//
// Integration test module for the notationParser.
// Run `npm run testnotation`
// or create a test in vsCode:
//       {
//           "type": "node",
//           "request": "launch",
//           "name": "Run notation test",
//           "skipFiles": ["<node_internals>/**"],
//           "program": "${workspaceFolder}/src/scoreparsers/grammars/tabuh/test/testnotation.ts",
//           "outFiles": ["${workspaceFolder}/**/*.ts"]
//       }
//
import type { SyntaxNode } from '@lezer/common'
import { testTree } from '@lezer/generator/test'
import fs from 'fs'
import _ from 'lodash'
import { scoreToFormattedJson } from '../../../../utils/objectUtils.ts'
import { parseNotation, type ParserReturnValue } from '../../../notationParser.ts'
import { parser } from '../tabuh.ts'
import { LARGE, parserTestData, tabuhScores, type TestData } from './testdata.ts'

// ---------- COMMON FUNCTIONS --------------------------------

function readTextFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8')
}

function traverse(
    node: SyntaxNode,
    content: string,
    level: number = 0,
    callback?: (level: number, node: SyntaxNode, content: string) => void
) {
    if (callback) callback(level, node, content)
    let child = node.firstChild
    while (child) {
        traverse(child, content, level + 1, callback)
        child = child.nextSibling
    }
}

// ---------- GRAMMAR TESTER --------------------------------

// Returns the text that corresponds with the node
function getText(node: SyntaxNode | null, content: string): string {
    return node && 'from' in node ? content.slice(node.from, node.to) : ''
}

function logNode(level: number, node: SyntaxNode, content: string) {
    const nodeValue = getText(node, content)
    console.log(
        `${'\t'.repeat(level)} |${level}|${node.name}|: ${nodeValue} ${node.name == '⚠' ? (nodeValue.length > 0 ? nodeValue?.charCodeAt(0) : '``') : ''}`
    )
}

// Tests the grammar by comparing the parsed tree structure with the expected structure.
// testData.ts contains the expected tree structure (SMALLTEST, LARGETEST).
function treeTest(testData: TestData, verbose: boolean = true) {
    const content = readTextFile(testData.file)
    const tree = parser.parse(content)
    traverse(tree.topNode, content, 0, verbose ? logNode : undefined)
    if (testData.expected) testTree(tree, testData.expected)
}

//---------------- PARSER TESTER ----------------------------------------

function lineNr(str: string, position: number): number {
    return str.slice(0, position).split(String.fromCharCode(10)).length
}

function logParserResults(
    testData: TestData,
    result: ParserReturnValue,
    errorNodes: string[],
    fullReport: boolean = true
) {
    if (fullReport) {
        console.log(testData.file)
        console.log('-'.repeat(testData.file.length))
        console.log(`ERRORNODES: ${errorNodes.length}`)
        console.log(`ERRORS: ${JSON.stringify(result.errors)}`)
        console.log(`POSTPROCESSING: ${JSON.stringify(result.postProcessing)}`)
        errorNodes.forEach((node) => console.log(`⚠: ${node}`))
        if (result.score) {
            console.log('TOTAL GONGANS: ' + String(result.score.systems.length))
            console.log('GONGAN STRUCTURE')
            result.score.systems.forEach((system, idx) => {
                var metadata: string = ''
                if (system.execution) metadata = system.execution.map((exec) => exec.type.toUpperCase()).join(', ')
                console.log(`   gongan ${idx + 1}: ${metadata} ${_.keys(system.staffs).length} staffs`)
            })
        } else console.log('NO SCORE OUTPUT')

        if (result.score) {
            const json = scoreToFormattedJson(result.score)
            if (testData.outputfile) fs.writeFileSync(testData.outputfile, json)
            else console.log(json)
        }
    } else {
        console.log(
            `${testData.file
                .split(/[\//]/)
                .pop()
                ?.padEnd(30)} : ${errorNodes.length} errors ${errorNodes.length > 0 ? '⚠' : ''}`
        )
    }
}

// Tests the notationParser and logs results:
function testParseNotation(testData: TestData, verbose: boolean = true) {
    var errorNodes: string[] = []

    function collectErrors(level: number, node: SyntaxNode, content: string) {
        const nodeValue = getText(node, content)
        if (node.name == '⚠') {
            var value: string =
                nodeValue.length == 0
                    ? '<empty>'
                    : nodeValue.length == 1
                      ? `${nodeValue} chr(${nodeValue.charCodeAt(0)})`
                      : '`' + nodeValue + '`'
            if (node.parent) value += ` in ${node.parent.name} \`${getText(node.parent, content)}\``
            if (node.from) value += `-- line ${lineNr(content, node.from)}`
            errorNodes.push(value)
        }
    }

    const content = readTextFile(testData.file)
    const tree = parser.parse(content)
    traverse(tree.topNode, content, 0, collectErrors)
    const result: ParserReturnValue = parseNotation(content)

    logParserResults(testData, result, errorNodes, verbose)
}

const OPTION: number = 3
const TREETEST = LARGE // LARGE OR SMALL
const NOTATIONID = 12 // 1..29
switch (OPTION) {
    case 1:
        // Tests the Lezer grammar (file tabuh.grammar). Outputs the parser tree structure as follows
        //
        // |level|NodeName|: NodeValue
        //
        // Should complete without errors. The tree should not contain any nodes with nodename '⚠'.
        treeTest(TREETEST, true)
        break
    case 2:
        // Tests the integral parsing process for a single file, with detailed logging.
        // Look up file number in testdata.ts
        // - parsing the notation with the Lezer parser,
        // - subsequent conversion of the resulting parsing tree.
        // ERRORNODES: number of tree nodes containing an unexpected value (node name is ⚠). Should be zero.
        //             The Lezer parser skips unexpected values until it reaches a point that matches the grammar at that point.
        // ERRORS: Error messages generated while converting the parsed tree into a Score structure.
        // POSTPROCESSING: Metadata that needs to be processed after the entire tree has been processed, such as GOTO and PART.
        testParseNotation(parserTestData(NOTATIONID), true)
        break
    case 3: {
        // Tests the integral parsing process for all files listed in testdata.ts and returns an error count per file.
        // Currently only Node errors of the parsing tree are being logged, error messages generated during the tree processing
        // are not yet logged.
        // Should yield 0 errors for each file. Use OPTION 2 to deep-dive into a specific notation file.
        for (const id of _.keys(tabuhScores)) {
            testParseNotation(parserTestData(Number.parseInt(id)), false)
        }
    }
}
