export interface TestData {
    file: string
    expected?: string // Expected structure of the resulting Tree
    outputfile?: string // if given, the score will be output here (only used for notationParser test). Otherwise it will be output to the console
}

export const NOTATIONPARSERTEST = {
    file: './src/scoreparsers/grammars/tabuh/test/notation.tsv',
    outputfile: './src/scoreparsers/grammars/tabuh/test/parsed_score.json'
}

export const SMALLTEST = {
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
                        Eol
                    ),
                    Gongan(
                        EmptyLine,
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
export const LARGETEST = {
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
                        ),
                        Eol
                    ),
                    Gongan(
                        EmptyLine,
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
