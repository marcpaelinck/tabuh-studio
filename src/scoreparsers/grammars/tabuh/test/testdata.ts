export interface TestData {
    file: string
    expected?: string // Expected structure of the resulting Tree
    outputfile?: string // if given, the score will be output here (only used for notationParser test). Otherwise it will be output to the console
}

export const tabuhScores: Record<number, string> = {
    1: 'bapang selisir gk.tsv',
    2: 'bapang selisir sp.tsv',
    3: 'cendrawasih.tsv',
    4: 'gilak deng.tsv',
    5: 'gilak penutup wassenaar.tsv',
    6: 'gilak penutup.tsv',
    7: 'godek miring gk.tsv',
    8: 'godek miring sp.tsv',
    9: 'hujan mas.tsv',
    10: 'janger.tsv',
    11: 'kacang saur.tsv',
    12: 'kahayangan.tsv',
    13: 'legong dwi.tsv',
    14: 'legong mahawidya gk.tsv',
    15: 'legong mahawidya sp.tsv',
    16: 'lengker gk.tsv',
    17: 'lengker sp.tsv',
    18: 'margapati.tsv',
    19: 'merah putih.tsv',
    20: 'narasimha.tsv',
    21: 'palawakya.tsv',
    22: 'pendet.tsv',
    23: 'puspa mekar.tsv',
    24: 'rejang dewa.tsv',
    25: 'sekar gendot gk.tsv',
    26: 'sekar gendot sp.tsv',
    27: 'sinom ladrang gk.tsv',
    28: 'sinom ladrang sp.tsv',
    29: 'teruna jaya.tsv'
}

export const parserTestData = (id: number): TestData => {
    return {
        file: './public/tabuh-notation/' + tabuhScores[id],
        outputfile: './src/scoreparsers/grammars/tabuh/test/parsed_score.json'
    }
}

export const NOTATIONTSV = { file: './src/scoreparsers/grammars/tabuh/test/notation.tsv', expected: undefined }

export const SMALL = {
    file: './src/scoreparsers/grammars/tabuh/test/small.tsv',
    expected: `Document(
                    InfoMetadataLine(
                        InfoMetadata(
                            ScoreParameter(StringValue),
                            PartParameter(StringValue),
                            TitleParameter(StringValue),
                            InstrumentgroupParameter(StringValue),
                            FontParameter(StringValue),
                            RuntypesParameter(StringList(StringValue, StringValue)),
                            DoLoopParameter(BooleanValue),
                            BeatAtEndParameter(BooleanValue)
                        ),
                    ),
                    EmptyLine(),
                    EmptyLine(),
                    Gongan(
                        MetadataLine(
                            Metadata(
                                TempoMetadata(
                                    TempoValue(IntegerValue)
                                )
                            ),
                            Eol
                        )
                    )
                )
`
}
export const LARGE = {
    file: './src/scoreparsers/grammars/tabuh/test/large.tsv',
    expected: `Document(
                    InfoMetadataLine(
                        InfoMetadata(
                            ScoreParameter(StringValue),
                            PartParameter(StringValue),
                            TitleParameter(StringValue),
                            InstrumentgroupParameter(StringValue),
                            FontParameter(StringValue),
                            RuntypesParameter(StringList(StringValue, StringValue)),
                            DoLoopParameter(BooleanValue),
                            BeatAtEndParameter(BooleanValue)
                        )
                    ),
                    EmptyLine(),
                    EmptyLine(),
                    Gongan(
                        MetadataLine(
                            Metadata(
                                TempoMetadata(
                                    TempoValue(IntegerValue)
                                )
                            ),
                            Eol
                        ),
                        MetadataLine(
                            Metadata(
                                DynamicsMetadata(
                                    DynamicsValue(DynamicsLiteral),
                                    PositionsParameter(StringList(StringValue, StringValue)),
                                )
                            ),
                            Eol
                        ),
                        MetadataLine(
                            Metadata(
                                DynamicsMetadata(
                                    DynamicsValue(DynamicsLiteral),
                                    PositionsParameter(StringList(StringValue, StringValue)),
                                    PassesParameter(IntegerList(IntegerValue)),
                                    NthpassParameter(BooleanValue)
                                )
                            ),
                            Eol
                        ),
                        MetadataLine(
                            Metadata(
                                LabelMetadata(StringValue)
                            ),
                            Eol
                        ),
                        MetadataLine(
                            Metadata(
                                PartMetadata(StringValue)
                            ),
                            Eol
                        ),
                        MetadataLine(
                            Metadata(
                                SuppressMetadata(
                                    StringList(StringValue, StringValue),
                                    BeatsParameter(IntegerList(IntegerValue)),
                                    PassesParameter(IntegerList(IntegerValue)),
                                )
                            ),
                            Eol
                        ),
                        StaffLine(
                            PositionLabel(
                            ),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Eol
                        ),
                        StaffLine(
                            PositionLabel(
                            ),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Eol
                        ),
                        StaffLine(
                            PositionLabel(
                            ),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Measure(Note, Note, Note, Note),
                            Eol
                        ),
                        StaffLine(
                            PositionLabel(
                            ),
                            Measure(Note),
                            Measure(Note),
                            Measure(Note),
                            Measure(Note),
                            Measure(Note),
                            Measure(Note),
                            Measure(Note),
                            Measure(Note),
                            Eol
                        ),
                        StaffLine(
                            PositionLabel(
                            ),
                            Measure(Note),
                            Measure(),
                            Measure(),
                            Measure(),
                            Measure(Note),
                            Measure(),
                            Measure(),
                            Measure(),
                            Eol
                        ),
                        StaffLine(
                            PositionLabel(
                            ),
                            Measure(Note),
                            Measure(),
                            Measure(),
                            Measure(),
                            Measure(Note),
                            Measure(Note),
                            Measure(),
                            Measure(Note),
                            Eol
                        ),
                        MetadataLine(
                            Metadata(
                                WaitMetadata(FloatValue)
                            ),
                            Eol
                        ),
                        MetadataLine(
                            Metadata(
                                SequenceMetadata(
                                    StringList(StringValue, StringValue, StringValue, StringValue, StringValue, Eol, StringValue, StringValue, StringValue, StringValue, StringValue),
                                )
                            ),
                            Eol
                        ),
                    )
                )
`
}
