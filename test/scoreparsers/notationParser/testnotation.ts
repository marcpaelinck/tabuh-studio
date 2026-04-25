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
import type { ExecutionItem, ExecutionItemType, ParserReturnValue, Score } from '../../..//src/typing/types.ts'
import { parser } from '../../../src/scoreparsers/grammars/tabuh/tabuh.ts'
import { parseNotation } from '../../../src/scoreparsers/notationParser.ts'
// import { scoreToFormattedJson } from '../../../src/utils/objectUtils.ts'
import path from 'path'
import { lineNr } from '../../../src/scoreparsers/notationUtils.ts'
import { scoreToFormattedJson } from '../../../src/utils/objectUtils.ts'
import { NOTATIONTSV, parserTestData, tabuhScores, type TestData } from './testdata.ts'

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

//---------------- PARSER TESTER (tree errors) ----------------------------------------

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

//---------------- PARSER TESTER (compare with Python JSON Score object export) ----------------------------------------

function equal(ex1: ExecutionItem, ex2: ExecutionItem | undefined): boolean {
    if (!ex2) return false
    for (const [key, val1] of _.entries(ex1)) {
        if (!(key in ex2) && val1 != undefined) return false
        const val2 = ex2[key as keyof ExecutionItem]
        const same =
            Array.isArray(val1) && Array.isArray(val2)
                ? JSON.stringify(val1.toSorted()) == JSON.stringify(val2.toSorted())
                : val1 == val2
        if (!same) return false
    }
    return true
}

function diff(ex1: ExecutionItem, ex2: ExecutionItem): object {
    const ignoreKeys = ['targetuuid', 'uuids']
    const deltas: Record<string, string[]> = {}

    for (const [key, val1] of _.entries(ex1)) {
        const val2 = ex2[key as keyof ExecutionItem]
        const ignore = ignoreKeys.includes(key)
        const same =
            Array.isArray(val1) && Array.isArray(val2)
                ? JSON.stringify(val1.toSorted()) == JSON.stringify(val2.toSorted())
                : val1 == val2
        if (!same && !ignore) deltas[key] = [val1, val2]
    }
    return deltas
}

function compareExecutionItems(
    execItems: ExecutionItem[],
    refItems: ExecutionItem[],
    skip: ExecutionItemType[],
    exact: boolean = true
): { diffMsgs: string[]; nomatch: ExecutionItem[]; nomatchRef: ExecutionItem[] } {
    const refRemaining = [...refItems]
    const nomatch = [] // collects the execItems for which no match was found
    const diffMsgs: string[] = []

    for (const exec of execItems) {
        if (skip.includes(exec.type)) continue
        const strExec = JSON.stringify(exec, _.keys(exec).toSorted())
        var matchingIdxs: number[] = []
        if (exact)
            matchingIdxs = refRemaining
                .map((it, idx) => [idx, it.seqId])
                .filter(([_id, seqId]) => seqId == exec.seqId)
                .map(([id, _seqId]) => id)
        else
            // Find ref items which match the sequence ID on the first two digits.
            matchingIdxs = refRemaining
                .map((re, idx) => [idx, re.seqId])
                .filter(([_id, seqId]) => Math.abs(seqId - exec.seqId) < 100)
                .map(([id, _seqId]) => id)
        if (matchingIdxs.length == 0) {
            nomatch.push(exec)
            continue
        }

        // Find the best match
        var bestMatch: { id: number; delta: object; diffCount: number } | undefined = undefined
        for (const id of matchingIdxs) {
            const delta = diff(exec, refRemaining[id])
            const diffCount = _.keys(delta).length
            if (!bestMatch || diffCount < bestMatch.diffCount) {
                bestMatch = { id, delta, diffCount }
            }
        }

        if (!bestMatch) {
            // should not happen
            nomatch.push(exec)
            if (!exact) {
                diffMsgs.push(`   parsed:  ${strExec}`)
                diffMsgs.push(`   parsed:  NO MATCH`)
            }
            continue
        }

        if (bestMatch.diffCount) {
            const id = bestMatch.id
            const strRefexec = JSON.stringify(refRemaining[id], _.keys(refRemaining[id]).toSorted())
            // diffMsgs.push(`   parsed:  ${strExec}`)
            // diffMsgs.push(`   ref   :  ${strRefexec}`)
            diffMsgs.push(`    ${refRemaining[id].type.toUpperCase()} ${JSON.stringify(bestMatch.delta)}`)
        }
        refRemaining.splice(bestMatch.id, 1) // Remove the matched item
    }
    return { diffMsgs, nomatch, nomatchRef: refRemaining }
}

function compareScores(score: Score, ref: Score, skip: ExecutionItemType[]): string[] {
    const messages: string[] = []
    // Compare execution items
    for (const system of score.systems) {
        const refsys = ref.systems.find((sys) => sys.id == system.id)
        if (!system.execution) continue
        if (!refsys) {
            messages.push(`System ${system.id} not found in reference score. Aborting test.`)
            continue
        }
        const refexecution = refsys.execution ? [...refsys.execution] : []

        // Find exact match
        const executionMsg = []
        var { diffMsgs, nomatch, nomatchRef } = compareExecutionItems(system.execution, refexecution, skip)
        executionMsg.push(...diffMsgs)
        var { diffMsgs, nomatch } = compareExecutionItems(nomatch, nomatchRef, skip, false)
        executionMsg.push(...diffMsgs)

        if (executionMsg.length > 0) {
            messages.push(`System ${system.id} (line ${system.line}): `)
            messages.push(...executionMsg)
        }
    }
    // if (messages.length == 0) messages.push('     No differences')
    return messages
}

// Parses the input file (.tsv) into a Score obejct and compares the result with the object
// stored in the reference file.
// Currently only the execution items are compared.
// inputFile: TSV file that should be parsed
// referenceFile: contains the expected result (generated with the Python application)
// id: file id (for logging purposes)
// skip: Metadata items that should not be compared.
function parseAndCompare(
    inputFile: string,
    referenceFile: string,
    id: number,
    skip: ExecutionItemType[],
    suppressSame: boolean = false // Print logging if no differences were found
) {
    const fileName = path.parse(inputFile).name
    const messages: string[] = []
    const title = `${id} - ${fileName.toUpperCase()}`

    // Import the input file (TSV) and the reference file (JSON)
    const tsvContent: string | undefined = readTextFile(inputFile)
    var jsonContent: string | undefined
    try {
        jsonContent = readTextFile(referenceFile)
    } catch {
        messages.push('JSON reference file not found')
    }
    if (jsonContent) {
        const parsedContent: ParserReturnValue = parseNotation(tsvContent)
        const score = parsedContent.score
        const refScore = JSON.parse(jsonContent)
        if (score) {
            const compareMsgs: string[] = compareScores(score, refScore, skip)
            if (!suppressSame && compareMsgs.length == 0) compareMsgs.push('     No differences')
            messages.push(...compareMsgs)
        } else messages.push('No parsing result.')
    }

    if (messages.length) {
        console.log(title)
        console.log('-'.repeat(title.length))
        messages.push('\n')
    }
    messages.forEach((msg) => console.log(msg))
}

const OPTION: number = 4
const TREETEST = NOTATIONTSV // LARGE OR SMALL OR NOTATIONTSV
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
        const NOTATIONID = 28 // 1..28
        testParseNotation(parserTestData(NOTATIONID), true)
        break
    case 3: {
        // Tests the integral parsing process for all files listed in testdata.ts and returns an error count per file.
        // Currently only Node errors of the parsing tree are being logged, error messages generated during the tree processing
        // are not yet logged.
        // Should yield 0 errors for each file. Use OPTION 2 to deep-dive into a specific notation file.
        for (const id of _.keys(tabuhScores).map((id) => Number.parseInt(id))) {
            const SELECT = false // required file id for single file testing or false/undefined to test all files
            if (!SELECT || SELECT == id) testParseNotation(parserTestData(id), false)
        }
        break
    }
    case 4: {
        // Parses all files listed in testdata.ts and compares the resulting Score object with the reference json file.
        // Currently only the Execution items are compared.
        for (const id of _.keys(tabuhScores).map((id) => Number.parseInt(id))) {
            const SELECT = false // required file id for single file testing or false/undefined to test all files
            // const skip = ['kempli', 'suppress', 'sequence', 'wait'] as ExecutionItemType[] // These metadata items are not available in the reference file.
            const skip = [] as ExecutionItemType[] // These metadata items are not available in the reference file.
            const tsvFile = parserTestData(id).file
            if (!SELECT || SELECT == id) parseAndCompare(tsvFile, tsvFile.replace('.tsv', '.json'), id, skip, false)
        }
    }
}
