# PDF generator

This document discusses the requirement for a PDF generator that creates a PDF document containing the formatted notation of a `Score`.

## Context

I need the Tabuh Studio app to generate a human-readable version of `Score` objects in PDF format. I have a Python application which performs this conversion. I would like to to reproduce this functionality in TypeScript in Tabuh Studio.

The Python code comes from a predecessor of Tabuh Studio called `gamelan-notation`. This application runs locally on a computer and can convert `TS Script` notation files (the .tsv input format that is used by the `tabuhParser` in Tabuh Studio) into several formats, including MIDI and PDF. The PDF export is essentially a formatted version of the `TS Script` format.

I added the following documents in folder `CLAUDE/PDF generator docs`.

**score_to_pdf.py** and **formatting.py**: The main modules of the Python PDF generator.
**Sinom_Ladrang_GK.tsv**, **Sinom_Ladrang_GK.json**, **Sinom_Ladrang_GK.txt**, **Sinom_Ladrang_GK.pdf** The same score in four different formats: 
- Sinom_Ladrang_GK.tsv: `TS Script` format
- Sinom_Ladrang_GK.json: the Tabuh Studio `Score` format 
- Sinom_Ladrang_GK.txt: a dump of the Python script's `Score` object
- Sinom_Ladrang_GK.pdf: the Python script's PDF output

## Requested functionality

- A new menu item `File - Export PDF...` should be added to the main menu. When selected, it should export the current score to a PDF file.
- The PDF layout should be similar to the PDFs produced by the `gamelan-notation` Python script.

# Python code

This section contains information about the `gamelan-notation` Python code that is currently used to generate PDF versions of the scores. 

The application can read a `TS Script` (.tsv) file and convert it internally to an object model of a `Score`. This object model is similar to the one used in the Tabuh Studio app, but it is more comples and uses Beats and Measures explicitly, whereas in Tabuh Studio these two concepts are virtual and only globally represented as BeatSlice objects.

As soon as it has createdd the object model of a `Score` the `gamelan-notation` appplication can produce exports as PDF, MIDI and JSON documents.
The following information focuses on the code that is used for the generation of PDF exports.

## score_to_pdf.py

This is the main module of the PDF generator. It contains the definition of a PDFGeneratorAgent which subclasses the Agent class (explained below). The _main method of this class is its entry point.

## formatting.py

This module is used by the score_to_pdf.py module. It contains formatting settings and helper functions.

## Additional information

This section contains information about classes and functions that are used in score_to_pdf.py and formatting.py

### Run Settings

The following attributes of the RunSettings data class are being used

**pdf_converter.notation_webpage**
Has value 'https://swarasanti.nl/music-notation/'
**notation_settings.title**
Equivalent to Score.title in Tabuh Studio
**pdf_out_filepath**
The output file path for the PDF document. This should be retrieved from the user with a 'save as' dialog.
**notation_datetime**
If the score was opened from the database, this should be the score's datetime stamp in the `scores` database table. Otherwise it should be current date and time.
**configdata.font.ttf_filepath** 
This should have the value `frontend/public/fonts/BaliMusic5.ttf`.

### Enums
These classes are subclasses of the `Enum` type.

#### Position
Equivalent to the Tabuh Studio Position type.

```Python
class Position(NotationEnum):
    # TODO replace with values from settings file
    # Be aware that the order of the list is the order in which
    # the positions will occur in the PDF notation output
    # (see common.utils.gongan_to_records)
    UGAL = "UGAL"
    SULING = "SULING"
    GENDERRAMBAT = "GENDERRAMBAT"
    TROMPONG = "TROMPONG"
    PEMADE_POLOS = "PEMADE_POLOS"
    PEMADE_SANGSIH = "PEMADE_SANGSIH"
    KANTILAN_POLOS = "KANTILAN_POLOS"
    KANTILAN_SANGSIH = "KANTILAN_SANGSIH"
    REYONG_1 = "REYONG_1"
    REYONG_2 = "REYONG_2"
    REYONG_3 = "REYONG_3"
    REYONG_4 = "REYONG_4"
    PENYACAH = "PENYACAH"
    CALUNG = "CALUNG"
    JEGOGAN = "JEGOGAN"
    KENDANG = "KENDANG"
    CENGCENG = "CENGCENG"
    GONGS = "GONGS"
    KEMPLI = "KEMPLI"
    GENDERWAYANG_POLOS = "GENDERWAYANG_POLOS"
    GENDERWAYANG_SANGSIH = "GENDERWAYANG_SANGSIH"
    
    @property
    def instrumenttype(self):
        # TODO this should be replaced by a lookup based on the instruments.tsv settings file
        return InstrumentType[self.split("_")[0]]

    @property
    def shortcode(self):
        return self.value.replace("_POLOS", "_P").replace("_SANGSIH", "_S").replace("WAYANG", "").replace("RAMBAT", "")
```

### FontField
Defines the fields of a table that lists all the characters of the BaliMusic font.
This is the Tabuh Studio equivalent of the `alphabet` dictionary  in `shared/config/alphabet.ts`

```
class FontFields(SStrEnum):
    SYMBOL = "symbol"
    UNICODE = "unicode"
    SYMBOL_DESCRIPTION = "symbol_description"
    BALIFONT_SYMBOL_DESCRIPTION = "balifont_symbol_description"
    PITCH = "pitch"
    OCTAVE = "octave"
    MODIFIER = "modifier"
    NOTE_VALUE = "note_value"
    DESCRIPTION = "description"
```

#### Modifier
Combines the octave and modifier attribute values of a NoteObject.

```Python
class Modifier(NotationEnum):
    # The order of the values should correspond with the
    # standardized sequence for the font characters:
    # 1. NONE (=pitch character)
    # 2. octave modifiers
    # 3. stroke modifiers
    # 4. duration modifiers
    # 5. pattern modifiers
    NONE = "NONE"
    OCTAVE_0 = "OCTAVE_0"
    OCTAVE_2 = "OCTAVE_2"
    ABBREVIATE = "ABBREVIATE"
    MUTE = "MUTE"
    HALF_NOTE = "HALF_NOTE"
    QUARTER_NOTE = "QUARTER_NOTE"
    GRACE_NOTE = "GRACE_NOTE"
    TREMOLO = "TREMOLO"
    TREMOLO_ACCELERATING = "TREMOLO_ACCELERATING"
    NOROT = "NOROT"
    RAKE_LEFT = "RAKE_LEFT"
    RAKE_RIGHT = "RAKE_RIGHT"
```

### Classes


#### Score
Data class.

```Python

class Score(BaseModel, validate_assignment=True):
    title: str
    composer: str = ""
    settings: RunSettings
    instrument_positions: set[Position] = None
    gongans: list[Gongan] = Field(default_factory=list)
    global_metadata: DefaultDict = Field(default_factory=lambda: defaultdict(list))
    global_comments: list[str] = Field(default_factory=list)
    flowinfo: FlowInfo = Field(default_factory=FlowInfo)
    midifile_duration: int = None
    part_info: Part = None
```

#### Gongan, Beat, Measure
Data classes.
A Gongan is the equivalent of a System.
A gongan consists of Beats. Each beat contains a dictionary Position->Measure where Measure contains notation that spans one (kempli) beat.
When there is no kempli beat, the span of a measure is determined by the user.

```Python
class Gongan(BaseModel):
    # A set of beats.
    # A Gongan consists of a set of instrument parts.
    # Gongans in the input file are separated from each other by an empty line.
    id: int
    beats: list[Beat] = Field(default_factory=list)
    gongantype: GonganType = GonganType.REGULAR
    metadata: DefaultDict = Field(default_factory=lambda: defaultdict(list))
    comments: list[str] = Field(default_factory=list)
    haslabel: bool = False  # Will be set if the gongan has a Label metadata
    _pass_: PassSequence = 0  # Counts the number of times the gongan is passed during generation of MIDI file.
    
class Beat(BaseModel):
    id: int
    gongan_id: int
    # duration: float
    measures: dict[Position, Measure] = Field(default_factory=dict)
    prev: Optional["Beat"] = Field(default=None, repr=False)  # previous beat in the score
    next: Optional["Beat"] = Field(default=None, repr=False)  # next beat in the score
    has_kempli_beat: bool = True
    kempli_status: MetaDataSwitch = MetaDataSwitch.ON
    is_waitmeta_beat: bool = False
    validation_ignore: dict[ValidationProperty, list[Position]] = Field(default_factory=dict)
    
    @computed_field
    @property
    def full_id(self) -> str:
        return f"{int(self.gongan_id)}-{self.id}"

    @computed_field
    @property
    def gongan_seq(self) -> int:
        # Returns the pythonic sequence id (numbered from 0)
        return self.gongan_id - 1

    @computed_field
    @property
    def max_duration(self) -> float:
        return max(measure.duration for measure in self.measures.values())

    @computed_field
    @property
    def duration(self) -> float:
        return mode(measure.duration for measure in self.measures.values())

    def get_pass_object(self, position: Position, passid: int = DEFAULT) -> Measure.Pass:
        # Convenience function for a much-used query.
        # Especially useful for list comprehensions
        if not position in self.measures.keys():  # pylint: disable=no-member
            return None
        return self.measures[position].passes.get(
            passid, self.measures[position].passes[DEFAULT] if DEFAULT in self.measures[position].passes else None
        )

    def get_notes(self, position: Position, passid: int = DEFAULT, none=None):
        # Convenience function for a much-used query.
        # Especially useful for list comprehensions
        if pass_ := self.get_pass_object(position=position, passid=passid):
            return pass_.notes
        return none
	
@dataclass
class Measure:
    @dataclass
    class Pass:
        seq: int
        line: int | None = None  # input line
        notesymbols: list[str] = field(default_factory=list)
        genericnotes: list[GenericNote] | None = None
        notes: list[Note] | None = None
        ruletype: RuleType | None = None
        autogenerated: bool = False  # True: pass does not occur in the source but was generated
        # to emulate the flow of the score. This attribute is used by the PDF generator to skip
        # Autogenerated passes.

    position: Position
    all_positions: list[Position]
    passes: dict[PassSequence, Pass] = field(default_factory=dict)

    @classmethod
    def new(
        cls,
        *,
        position: Position,
        notes: list[Note],
        autogenerated,
        pass_seq: int | None = DEFAULT,
        line: int | None = None,
    ):
        """Shorthand method to create a Measure object"""
        return Measure(
            position=position,
            all_positions=[position],
            passes=(
                {pass_seq: Measure.Pass(seq=pass_seq, line=line, notes=notes, autogenerated=autogenerated)}
                if pass_seq != None
                else {}
            ),
        )

    @computed_field
    @property
    def duration(self) -> float:
        return sum(note.duration for note in self.passes[DEFAULT].notes)
```

#### Note, GenericNote
Equivalent to NoteObject. A Note is assigned to a specific Position, A GenericNote isn't.

```Python
class GenericNote(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)
    symbol: str
    pitch: Pitch
    octave: Octave | None = None
    effect: Effect
    relative_velocity: float = 1.0
    note_value: float = None  # 1 = whole note

    def to_tone(self) -> Tone:
        return Tone(pitch=self.pitch, octave=self.octave)

    def is_melodic(self) -> bool:
        return self.to_tone().is_melodic()


class Note(GenericNote):
    model_config = ConfigDict(extra="ignore", frozen=True)

    class Fields(StrEnum):
        MODEL_CONFIG = "model_config"
        SYMBOL = "symbol"
        PITCH = "pitch"
        OCTAVE = "octave"
        EFFECT = "effect"
        RELATIVE_VELOCITY = "relative_velocity"
        NOTE_VALUE = "note_value"
        POSITION = "position"
        AUTOGENERATED = "autogenerated"
        SUSTAIN_TYPE = "sustaintype"
        UUID = "uuid"

    position: Position
    autogenerated: bool = False
    transformation: RuleValue | None = None
    sustaintype: SustainType = SustainType.OFF_ON_NEXT_NOTE
    uuid: UUID4 = uuid4()

    @property
    def duration(self) -> float:
        return self.note_value

```

#### MetaData. MetaType

```Python
# pylint: disable=missing-class-docstring
from typing import Annotated, Any, ClassVar, Literal, Self, Union, override

from pydantic import BaseModel, Field, TypeAdapter, model_validator

from src.common.constants import (
    GonganType,
    InstrumentType,
    NotationEnum,
    Position,
)
from src.settings.classes import RunSettings
from src.settings.settings import RunSettingsListener
from src.settings.utils import tag_to_position_dict


# MetaData related constants
class MetaDataSwitch(NotationEnum):
    OFF = "off"
    ON = "on"
    DOUBLE = "double"


class ValidationProperty(NotationEnum):
    BEAT_DURATION = "beat-duration"
    MEASURE_LENGTH = "measure-length"
    INSTRUMENT_RANGE = "instrument-range"
    KEMPYUNG = "kempyung"


class Scope(NotationEnum):
    GONGAN = "GONGAN"
    SCORE = "SCORE"


class MetaType(NotationEnum):
    AUTOKEMPYUNG = "AUTOKEMPYUNG"
    DYNAMICS = "DYNAMICS"
    GONGAN = "GONGAN"
    GOTO = "GOTO"
    KEMPLI = "KEMPLI"
    LABEL = "LABEL"
    LOOP = "LOOP"
    OCTAVATE = "OCTAVATE"
    PART = "PART"
    SEQUENCE = "SEQUENCE"
    SUPPRESS = "SUPPRESS"
    TEMPO = "TEMPO"
    COPY = "COPY"
    VALIDATION = "VALIDATION"
    WAIT = "WAIT"


class MetaDataBaseModel(BaseModel, RunSettingsListener):
    metatype: MetaType
    scope: Scope = Scope.GONGAN
    line: int = None
    processingorder: ClassVar[int] = 99

    # name of the paramater whose value may appear in the notation without specifying the parameter
    DEFAULTPARAM: ClassVar[str]
    _TAG_TO_POSITION: dict[str, list[Position]]

    @classmethod
    @override
    def cls_initialize(cls, run_settings: RunSettings):
        """(Re-)initializes the class's _TAG_TO_POSITION lookup dict.
        The method is called when new run settings are loaded."""
        cls._TAG_TO_POSITION = tag_to_position_dict(run_settings)

    def model_dump_notation(self):
        jsonval = self.model_dump(exclude_defaults=True)
        del jsonval["line"]
        if self.DEFAULTPARAM:
            defval = jsonval[self.DEFAULTPARAM]
            del jsonval[self.DEFAULTPARAM]
        else:
            defval = ""
        return f"{{{self.metatype} {defval} {' '.join([f'{key}={val}' for key, val in jsonval.items()])}}}".strip()


class GradualChangeMetadata(MetaDataBaseModel):
    # Generic class that represent a value that can gradually
    # change over a number of beats, such as tempo or dynamics.
    # 'virtual' field last_beat can be passed as an alternative for beat_count.
    explicit_gradual_beat: bool = False  # Explicit gradual change format beat1->beat2 in notation.
    explicit_gradual_value: bool = False  # Explicit gradual change format ->value or value1->value2 in notation.
    from_value: int | None = None
    to_value: int
    first_beat: int = 1
    last_beat: int | None = None
    beat_count: int | None = None
    passes: list[int] = Field(default_factory=list)  # On which pass(es) should change be effective?
    cycle: int = 99
    iterations: list[int] = Field(default_factory=list)  # On which iteration(s) should change be effective?

    @property
    def explicit_gradual(self) -> bool:
        return self.explicit_gradual_beat or self.explicit_gradual_value

    @property
    def first_beat_seq(self) -> int:
        # Returns the pythonic sequence id (numbered from 0)
        return self.first_beat - 1

    @model_validator(mode="after")
    def validate_and_set_beat_count(self) -> Self:
        """Determines the value of beat_count if it is missing.
        Takes into account that last_beat can be passed as an argument instead of beat_count.
        Also takes into account that both beat_count and last_beat are missing: in that
        case, a gradual change over one beat is assumed."""
        if self.explicit_gradual_beat:
            # first_beat and last_beat are given
            if self.last_beat >= self.first_beat:
                self.beat_count = self.last_beat - self.first_beat + 1
            else:
                raise ValueError("Negative beat range for gradual %s change" % self.metatype)

        if self.beat_count is None:
            if self.last_beat is None:
                if self.from_value is None:
                    if self.explicit_gradual:
                        # gradual change over one beat
                        self.beat_count = 1
                    else:
                        # immediate change
                        self.beat_count = 0
                else:
                    # Gradual change with only first_beat value given: assume that the gradual change duration is one beat.
                    self.last_beat = self.first_beat
                    self.beat_count = 1
            else:
                # both first_beat and last_beat have a value. Check for invalid values and set beat_count accordingly.
                if self.beat_count is not None and self.beat_count != self.last_beat - self.first_beat + 1:
                    raise ValueError("%s: 'beat_count' and beat range are contradictory. Remove one." % self.metatype)
                if self.last_beat >= self.first_beat:
                    self.beat_count = self.last_beat - self.first_beat + 1
                else:
                    raise ValueError("Negative range for gradual %s change" % self.metatype)
        else:
            if self.beat_count > 0 and self.last_beat is None:
                self.last_beat = self.first_beat + self.beat_count - (1 if self.beat_count else 0)
        if self.beat_count is None:
            raise ValueError("Unexpected error interpreting %s change." % self.metatype)

        return self


# THE METADATA CLASSES


class AutoKempyungMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.AUTOKEMPYUNG] = MetaType.AUTOKEMPYUNG
    status: MetaDataSwitch
    scope: Scope = Scope.GONGAN
    positions: list[Position] = None  # PositionsFromTag
    DEFAULTPARAM = "status"


class DynamicsMeta(GradualChangeMetadata):
    metatype: Literal[MetaType.DYNAMICS] = MetaType.DYNAMICS
    # Currently, an empty list stands for all positions.
    positions: list[Position]  # PositionsFromTag
    from_abbr: str = ""
    to_abbr: str = ""
    DEFAULTPARAM = "to_abbr"
    DYNAMICS: ClassVar[dict[str, int]] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def set_values(cls, data: Any) -> Any:
        # Set from_value and to_value.
        # TODO: This is not very nice code but GradualChangeMetadata expects `from_value` and `to_value` to be int.
        # Is there a better way to do this?
        if isinstance(data, dict):
            try:
                for abbr_field, value_field in [("from_abbr", "from_value"), ("to_abbr", "to_value")]:
                    if abbr_field in data:
                        # cast dynamics abbreviation to its velocity equivalent.
                        data[value_field] = cls.DYNAMICS[data[abbr_field]]
            except Exception as exc:
                # Should only if cls.DYNAMICS does not contain all possible DynamicLevel values
                raise ValueError("No velocity known for dynamics: %s" % (data[abbr_field]) + str(exc)) from exc
        return data

    @classmethod
    def cls_initialize(cls, run_settings: RunSettings):
        cls.DYNAMICS = run_settings.midi.dynamics


class GonganMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.GONGAN] = MetaType.GONGAN
    type: GonganType
    DEFAULTPARAM = "type"


class GoToMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.GOTO] = MetaType.GOTO
    label: str
    from_beat: int = -1  # Beat number from which to goto. Default is last beat of the gongan.
    passes: list[int] = Field(default_factory=list)  # On which pass(es) should goto be performed?
    cycle: int = 99
    DEFAULTPARAM = "label"

    @property
    def beat_seq(self) -> int:
        # Returns the pythonic sequence id (numbered from 0)
        return self.from_beat - 1 if self.from_beat > 0 else -1


class KempliMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.KEMPLI] = MetaType.KEMPLI
    status: MetaDataSwitch
    beats: list[int] = Field(default_factory=list)
    passes: list[int] = Field(default_factory=list)
    scope: Scope = Scope.GONGAN
    DEFAULTPARAM = "status"


class LabelMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.LABEL] = MetaType.LABEL
    name: str
    beat: int = 1
    # Make sure that labels are processed before gotos in same gongan.
    _processingorder_ = 1
    DEFAULTPARAM = "name"

    @property
    def beat_seq(self) -> int:
        # Returns the pythonic sequence id (numbered from 0)
        return self.beat - 1


class LoopMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.LOOP] = MetaType.LOOP
    count: int = 1
    passes: list[int] = Field(default_factory=list)  # On which pass(es) should goto be performed?
    cycle: int = 99
    DEFAULTPARAM = "count"


class OctavateMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.OCTAVATE] = MetaType.OCTAVATE
    instrument: InstrumentType  # InstrumentFromTag
    octaves: int
    scope: Scope = Scope.GONGAN
    DEFAULTPARAM = "instrument"


class PartMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.PART] = MetaType.PART
    name: str
    DEFAULTPARAM = "name"


class SequenceMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.SEQUENCE] = MetaType.SEQUENCE
    value: list[str] = Field(default_factory=list)
    DEFAULTPARAM = "value"


class SuppressMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.SUPPRESS] = MetaType.SUPPRESS
    positions: list[Position] = Field(default_factory=list)  # PositionsFromTag
    passes: list[int] = Field(default_factory=list)
    beats: list[int] = Field(default_factory=list)
    cycle: int = 99
    DEFAULTPARAM = "positions"


class TempoMeta(GradualChangeMetadata):
    metatype: Literal[MetaType.TEMPO] = MetaType.TEMPO
    DEFAULTPARAM = "to_value"


class CopyMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.COPY] = MetaType.COPY
    template: str
    include: list[MetaType] = Field(default_factory=list)
    DEFAULTPARAM = "template"
    _processingorder_ = 10


class ValidationMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.VALIDATION] = MetaType.VALIDATION
    beats: list[int] = Field(default_factory=list)
    ignore: list[ValidationProperty]
    scope: Scope = Scope.GONGAN
    DEFAULTPARAM = None


class WaitMeta(MetaDataBaseModel):
    metatype: Literal[MetaType.WAIT] = MetaType.WAIT
    seconds: float = None
    passes: list[int] = Field(
        default_factory=lambda: list(range(99, -1))
    )  # On which pass(es) should goto be performed? Default is all passes.
    # TODO: devise a more elegant way to express this, e.g. with "ALL" value.
    DEFAULTPARAM = "seconds"


MetaDataType = Union[
    AutoKempyungMeta,
    CopyMeta,
    DynamicsMeta,
    GonganMeta,
    GoToMeta,
    KempliMeta,
    LabelMeta,
    LoopMeta,
    OctavateMeta,
    PartMeta,
    SequenceMeta,
    SuppressMeta,
    TempoMeta,
    ValidationMeta,
    WaitMeta,
]


# The following two statements generate a MetaData object that can be used for typing, and a MetaDataAdapter class
# that will automatically cast a parsed value to the correct ....Meta class. The class selection for casting is based
# on the value of field 'metatype'. Use MetaDataAdapter.validate_python() to parse a dict value or
# MetaDataAdapter.validate_json() to parse a json string value.
# See the tip at the end of this section: https://docs.pydantic.dev/latest/concepts/unions/#nested-discriminated-unions
# See also documentation about TypeAdapter: https://docs.pydantic.dev/latest/api/type_adapter/#TypeAdapter
MetaData = Annotated[
    MetaDataType,
    Field(discriminator="metatype"),
]

MetaDataAdapter = TypeAdapter(MetaData)

```

#### Agent
This class should not be reproduced. I just added it in case you need it to understand how the PDF generator works.
The Python application works as a pipeline. It executes a list of Agent subclasses in a specific order by calling their `run` method in turn. Each agent uses the output from its predecessor in the pipeline. `PDFGeneratorAgent` is one of the last agents in the pipeline. It expects a `Score` object as input (`(Agent.InputOutputType.COMPLETESCORE`).

```Python
class Agent:
    """Base class for the classes that each perform a step of the conversion
    from notation to MIDI/PDF/TXT output. It provides a uniform logging format.
    IMPORTANT: when subclassing this class, override the _main and _run_condition
               methods and if required also the __init__ method. In the latter case
               call the __init__ method of the Agent main class using super().__init__(...).
    """

    class InputOutputType(StrEnum):
        """Used by the logger to determine the source of a warning or error message."""

        RUNSETTINGS = "run_settings"
        NOTATION = "notation"
        GENERICSCORE = "generic_score"
        BOUNDSCORE = "bound_score"
        PATTERNSCORE = "pattern_score"
        COMPLETESCORE = "complete_score"
        EXECUTION = "execution"
        PART = "part"
        PDFFILE = "pdf_file"

    # Define these constants in each subclass
    LOGGING_MESSAGE: str
    EXPECTED_INPUT_TYPES: tuple[InputOutputType] | None
    RETURN_TYPE: InputOutputType | tuple[InputOutputType] | None

    run_settings = None
    curr_gongan_id: int = None
    curr_beat_id: int = None
    curr_position: Position = None
    curr_line_nr: int = None
    log_msgs: dict[int, str] = {logging.ERROR: [], logging.WARNING: []}
    logger = None
    log_current_pos: bool

    def __init__(self, run_settings: RunSettings):
        self.run_settings = run_settings
        self.logger = Logging.get_logger(self.__class__.__name__)
        self.log_current_pos = True

    # pylint: disable=unused-argument,missing-function-docstring

    # Override this function. It should return True if the _main function
    # should be executed when called.
    @classmethod
    def run_condition_satisfied(cls, run_settings: RunSettings) -> bool: ...

    # Override this function. It should be the main entry point of the agent
    # and should return the agent's output.
    # It should not have any argument except self.
    def _main(self) -> Any: ...

    # pylint: enable=unused-argument,missing-function-docstring

    def run(self) -> Any:
        """Runs the _main method of the subclassed agent."""
        separator = "-" * int(50 - len(self.LOGGING_MESSAGE) // 2)
        title = f"{separator} {self.LOGGING_MESSAGE} {separator}"
        self.logger.info(title)
        result = self._main()  # pylint: disable=assignment-from-no-return
        return result

    def open_logging(self):
        """To be called by the pipeline manager before running the pipeline.
        Adds an empty line followed by a title line"""
        title_text = f"NOTATIONPARSER: {self.run_settings.notation_settings.title}"
        separator = "=" * int(50 - len(title_text) // 2)
        title = f"{separator} {title_text} {separator}"
        self.logger.info("")
        self.logger.info(title)

    def close_logging(self):
        """To be called by the pipeline manager after running the pipeline.
        Draws a double line (===) followed by an empty line"""
        self.logger.info("=" * 102)
        self.logger.info("")

    def _fmt(self, val: int | None, pos: int):
        """Number formatting, used to format logging messages"""
        p = f"{pos:02d}"
        return f"{val:{p}d}" if val and self.log_current_pos else " " * pos

    def log(self, msg: str, *args, level: int = logging.ERROR) -> str:
        """Formats the message. and sends it to the console. Stores a copy in the log_msgs dict.
        Args:
            msg (str): The message
            level (int, optional): Logging level. Defaults to logging.ERROR.
            *args: optional arguments for the logger (required when lazy % formatting is applied).
        Returns:
            str: _description_
        """
        extra_spaces = " " * (7 - len(logging.getLevelName(level)))
        prefix = (
            f"{extra_spaces}{self._fmt(self.curr_gongan_id,2)}-{self._fmt(self.curr_beat_id,2)} "
            f"|{self._fmt(self.curr_line_nr,4)}| "
        )
        msg = prefix + msg
        self.logger.log(level, msg, *args)
        if level > logging.INFO:
            self.log_msgs[level].append(msg)

    def abort_if_errors(self):
        """Displays a 'program aborted' message and stops execution."""
        if self.has_errors:
            tmp = self.log_current_pos
            self.log_current_pos = False
            self.logerror("Program halted.")
            self.log_current_pos = tmp
            sys.exit()

    def logerror(self, msg: str, *args: Any) -> str:
        """Logs an error"""
        self.log(msg, *args, level=logging.ERROR)

    def logwarning(self, msg: str, *args: Any) -> str:
        """Logs a warning"""
        self.log(msg, *args, level=logging.WARNING)

    def loginfo(self, msg: str, *args: Any) -> str:
        """Logs info"""
        self.log(msg, *args, level=logging.INFO)

    # Use the following generators to iterate through gongans and beats if you
    # want to use the logging methods of this class. This will ensure that the
    # logging is prefixed with the correct gongan id, beat id and line number.
    class IteratorLevel(Enum):
        GONGAN = auto()
        BEAT = auto()
        POSITION = auto()
        PASS = auto()

    def reset_counters(self, level: IteratorLevel = IteratorLevel.GONGAN) -> None:
        if level.value <= self.IteratorLevel.PASS.value:
            self.curr_line_nr = None
        if level.value <= self.IteratorLevel.POSITION.value:
            self.curr_position = None
        if level.value <= self.IteratorLevel.BEAT.value:
            self.curr_beat_id = None
        if level.value <= self.IteratorLevel.GONGAN.value:
            self.curr_gongan_id = None

    def gongan_iterator(self, obj: Score) -> Generator[Gongan, None, None]:
        """Iterates through the gongans of a Score object while setting the curr_gongan_id attribute"""
        if not hasattr(obj, "gongans"):
            raise AttributeError("base object has no attribute `gongans`")
        for gongan in obj.gongans:
            self.curr_gongan_id = gongan.id
            self.curr_beat_id = None
            yield gongan

    def beat_iterator(self, obj: Gongan) -> Generator[Beat, None, None]:
        """Iterates through the beats of a Gongan object while setting the curr_beat_id attribute"""
        if not hasattr(obj, "beats"):
            raise AttributeError("base object has no attribute `beats`")
        for beat in obj.beats:
            self.curr_beat_id = beat.id
            yield beat

    def pass_iterator(self, obj: Measure) -> Generator[Measure.Pass, None, None]:
        """Iterates through the passes of a Measure object while setting the curr_line_nr attribute"""
        if not hasattr(obj, "passes"):
            raise AttributeError("base object has no attribute `passes`")
        for _, pass_seq in obj.passes.items():
            self.curr_line_nr = pass_seq.line
            yield pass_seq

    @property
    def has_errors(self):
        """Determines if any errors were encountered during the agent's process"""
        return len(self.log_msgs[logging.ERROR]) > 0

    @property
    def has_warnings(self):
        """Determines if any warnings were encountered during the agent's process"""
        return len(self.log_msgs[logging.WARNING]) > 0


```


### Functions

#### measure_to_str_rml_safe
Removes certain characters that are not RML safe. This is necessary to avoid errors when generating a PDF document with the `reportlab` library.

```Python
def measure_to_str_rml_safe(
    notes: list[Note], omit_octave_diacritics: list[Position], octave_diacritics: list[str]
) -> str:
    """Converts the note objects to notation symbols.
    Replaces characters that are incompatible with RML content to compatible strings.
    RML is an XML-style markup language used by ReportLab.
    See https://docs.reportlab.com/rmlfornewbies/
    Args:
        notes (list[Note]): Content that should be converted.
        omit_octave_diacritics (list[Position]): positions for which to omit octave indicator
         octave_diacritics (list[str]): list of octave diacritics
    Returns:
        str: HTML/XML compatible representation of the notation.
    """

    def format_symbol(note: Note):
        """Returns the formatted note symbol"""
        if note.effect == Stroke.GRACE_NOTE:
            # Remove any stroke modifier character
            return note.symbol[0]
        if note.position in omit_octave_diacritics:
            # Remove octave modifier character for given positions
            return re.sub(f"[{"".join(octave_diacritics)}]", "", note.symbol)
        return note.symbol

    if not notes:
        return ""
    notechars = html.escape("".join(format_symbol(note) for note in notes))
    return notechars
```
#### aggregate_positions, clean_staves, has_kempli_beat
These functions are not needed because of the structure of `Score` objects in Tabuh Studio

**aggregate_positions**
A Score object in the Python application contains the expanded version of the staffs. This function groups similar staffs. In Tabuh Studio grouped staffs are directly available from the Score object.

**clean_staves** 
This function can be ignored. Staves in Tabuh Studio do not need cleaning.

**has_kempli_beat**
Determines whether a Gongan has a kempli beat. In Tabuh Studio this information is directly available from the `Score` object.

---

# Implementation plan (agreed) + Phase 0 result

## Decisions

- **Notation source:** start with the **compact** grouped notation (one row per
  `System.group`, tag = `compactGroupLabel`). The generator is built around an
  intermediate model (below) so **expanded** (per-position) and **single-position**
  exports can be added later without touching the renderer.
- **Excludable execution items:** the model builder takes an `excludeExecutionTypes`
  option (a list of `ExecutionItemType`s to omit from the metadata rows). Wired as an
  option now; a settings UI can drive it later.
- **`omit_octave_diacritics`:** `[REYONG_1, REYONG_2, REYONG_3, REYONG_4]` — octave
  diacritic characters are stripped from those positions' notation text.
- **Skipped:** comments and gongan-type (don't exist in the TS model). PART metadata is
  deferred (parts come later).
- **Header:** reproduce the datestamp (score DB datetime, else now) and the
  `https://swarasanti.nl/music-notation/` hyperlink, as in the Python.
- **Save path:** a new `'pdffile'` destination on the `saveScore` dispatcher +
  `saveScoreToPdfFile`, reusing the `saveToLocalFile` helper, and a `File → Export PDF…`
  menu item — mirroring the MIDI export.
- **Fidelity:** close-and-iterate against `Sinom_Ladrang_GK.pdf`; different page layout /
  line height / systems-per-page are acceptable as long as the page count is in the same
  ballpark. Not pixel-perfect.

## Phase 0 — font spike (DONE)

`baliMusic5.ttf` was analysed and test-rendered:

- The font has **no GSUB**; the combining modifiers (`,` `<` `/` `_` …) have
  **advanceWidth = 0 with negative left-side-bearing** (e.g. `_` lsb = −1260 units). So
  glyph overlap comes from the metrics, **not** OpenType shaping.
- A `pdf-lib` test PDF (which applies **no** GPOS) embedding the TTF rendered every
  combining case correctly (octave dots/bars, grace slashes, overlines). See
  `outputs/pdfspike/balifont_spike.pdf`.

**Conclusion:** the font renders faithfully with a plain advance-width renderer, so
**`pdf-lib`** is the chosen library (exact control over columns / rules / measurement, one
font object for measure + draw, client-side, embeds the TTF). `pdfmake` remains a fallback
but isn't needed.

## Library

`pdf-lib` (+ `@pdf-lib/fontkit` for TTF embedding). Add both to `frontend/package.json`.
The BaliMusic TTF is fetched at runtime from `/fonts/baliMusic5.ttf`; Helvetica /
Helvetica-Bold / Courier / Courier-Bold are the built-in standard fonts.

## Module structure

- `componentlogic/export/pdfModel.ts` — **pure**, pdf-lib-agnostic. Builds a
  `PdfDocumentModel` from a `Score`:
  ```ts
  interface PdfMetaRow { text: string; beatIndex: number; align: 'left'|'right'; style: MetaStyle }
  interface PdfNotationRow { tag: string; beats: string[] }   // beats.length = beat count
  interface PdfSystemBlock {
      gonganId: number
      hasKempli: boolean
      above: PdfMetaRow[]        // PART(later)/TEMPO/DYNAMICS/LABEL
      rows: PdfNotationRow[]     // one per group (compact) / position (later)
      below: PdfMetaRow[]        // LOOP/GOTO/SEQUENCE
  }
  interface PdfDocumentModel { title: string; datestamp: string; systems: PdfSystemBlock[] }

  interface BuildPdfOptions {
      source?: 'compact' | 'expanded' | { position: Position }   // default 'compact'
      excludeExecutionTypes?: ExecutionItemType[]
      omitOctaveDiacritics?: Position[]                          // default REYONG_1..4
  }
  export function buildPdfModel(score: Score, opts?: BuildPdfOptions): PdfDocumentModel
  ```
  - Beat columns come from `System.beatSlices`; a group's per-beat text is
    `group.notation.slice(slice.start, slice.end).join('')`, with the symbol transforms
    (grace-note stroke drop; octave-diacritic strip for `omitOctaveDiacritics` rows —
    reuse `OCTAVE_MODIFIERS` from shared).
  - Metadata rows map from `System.execution` (`tempo`→"faster/slower", `dynamics`,
    `goto`→"go to …", `loop`→"play NX", `sequence`) + `System.label` (LABEL), filtered by
    `excludeExecutionTypes`. `executionItemTooltip` can supply readable text.
- `componentlogic/export/pdfGenerator.ts` — consumes the model + `pdf-lib`. Owns the
  layout constants (A4, margins, tag colwidth 2.3cm, styles/colours mirroring
  `formatting.py`), font embedding, text measurement (`font.widthOfTextAtSize`), the
  flow layout, the per-page header (title/page/date/hyperlink + rule), and pagination that
  keeps each gongan together. `export async function generatePdf(model): Promise<Uint8Array>`.

  **Beat grid (per the requirement change):** the notation is rendered as a single
  continuous line per group in the BaliMusic font, whose column glyphs are effectively
  monospaced (base ttf column advance ≈ 0.654 em, modifiers advance 0), so columns align
  on a fixed cell grid `W = fontSize × 0.654`. Instead of drawing lines *between* beat
  columns, we draw the editor-style background grid: **green** vertical lines (behind the
  notes) at the kempli-beat boundaries, i.e. at `x = tagRight + beatSlices[j].start × W`,
  spanning the system's notation-row block; **no gray per-column lines**. Kempli lines are
  drawn only when `kempli.state !== 'off'` (matching the editor, which shows no kempli
  highlight when off). Green ≈ `gridColorsExpanded.kempli` (`rgb(0,255,0)` with alpha).
- `useScoreReader.ts` — `saveScore` destination `'database' | 'jsonfile' | 'midifile' |
  'pdffile'`; `saveScoreToPdfFile(score)` = `buildPdfModel` → `generatePdf` →
  `saveToLocalFile(bytes, '<title>.pdf', 'application/pdf', '.pdf', 'PDF document')`.
- `components/MainMenu.tsx` — `File → Export PDF…` (`file-export-pdf`) →
  `saveScore(persistCachedChanges(score), 'pdffile')`; widen the prop type.

## Phasing

- **Phase 1 — grid + header + save path.** Model builder (compact), the notation grid
  (tag + measured beat columns + vertical rules, gongan id, keep-together, page header
  with datestamp/hyperlink), `omit_octave_diacritics`, and the `'pdffile'` save + menu
  wiring. Metadata rows placed simply (each directive at its beat column, no spanning).
  Produces a readable, paginated notation PDF.
- **Phase 2 — metadata fidelity.** Port the spanning / adjacent-cell merging / dot-filling
  and exact styles/colours from `_append_single_metadata_type` to approach the sample.
- **Phase 3 — extra sources.** Expanded and single-position exports (the model already
  abstracts this), and the excludable-items settings UI. PART metadata once parts land.

## Caveats to keep in mind

- pdf-lib has no layout engine — Phase 1 implements a small flow/table layout (measure row
  heights, place top-to-bottom, break pages when full, draw vertical beat rules). Modest,
  and full control.
- The exact octave-diacritic character set should be confirmed against
  `shared/config/alphabet.ts` (the TS equivalent of the Python font table); Phase 1 uses
  `OCTAVE_MODIFIERS`.
- `generatePdf` is async (it fetches the TTF); the save path is already async.

---

# Phase 1 — as built

Implemented and verified end-to-end by rendering `Sinom_Ladrang_GK.json` (3 pages, same
as the Python output). Files added / touched:

### `componentlogic/export/pdfModel.ts` (pure)

`buildPdfModel(score, opts?)` → `PdfDocumentModel`. Per system (only those with
`groups`): one `PdfNotationRow` per group (`tag = compactGroupLabel(...).label`, `text =
group.notation.join('')`, octave diacritics stripped when every position of the group is
in `omitOctaveDiacritics`, default `REYONG_1..4`); `columnCount = max notation length`;
`kempliColumns = kempli.state !== 'off' ? beatSlices.map(s => s.start) : null`; metadata
`above` (tempo/dynamics at their `fromBeat` column) + `below` (goto/loop right-aligned,
sequence left) from `execution` (text via `executionItemTooltip`, filtered by
`excludeExecutionTypes`) plus the `label` row. `source` ('compact' only) and
`excludeExecutionTypes` are options for the future expanded/single-position modes and the
settings UI.

### `componentlogic/export/pdfGenerator.ts` (pdf-lib)

`generatePdf(model): Promise<Uint8Array>`. Fetches `/fonts/baliMusic5.ttf` and embeds it;
standard Helvetica/Courier variants for text. Fixed-cell notation (`cellW =
bali.widthOfTextAtSize('u', 9)`), green kempli lines behind the notes, tag column + gongan
id, per-page header, keep-each-gongan-together pagination.

**WinAnsi sanitiser (important):** pdf-lib's standard fonts only encode WinAnsi, but
tooltips contain characters outside it (notably `→`), which makes `drawText` throw. A
`winAnsi()` helper maps the common ones (`→`→`->`, dashes, quotes, `…`, `×`) and replaces
anything else out of range; it is applied to every standard-font string (title, tags,
metadata). Notation text uses the embedded TTF and needs no sanitising.

### Save + menu

`useScoreReader` gained the `'pdffile'` destination → `saveScoreToPdfFile` (build model →
`generatePdf` → shared `saveToLocalFile('<title>.pdf', 'application/pdf')`), using the
un-stripped score. `MainMenu` gained `File → Export PDF…` (`file-export-pdf`). Deps
`pdf-lib` + `@pdf-lib/fontkit` added to `frontend/package.json`.

### Corrections applied after the first render

1. The "notation explained" hyperlink is drawn **above** the header separator line.
2. Kempli lines are **centred on the beat's first symbol** (`x = tagRight + (col+0.5)×W`),
   like the editor grid, not on the symbol's left edge.
3. `play` / `go to` metadata **right-aligns to the system's right edge** (`tagRight +
   columnCount×W`), not the page margin.
4/5/6. Position tags use `compactGroupLabel` (i.e. the `positionGroups` / `positionConfigs`
   names — `Ugal`, `Gangsa`, `Calung`, `Kendang`, …), which fit the tag column; the doubled
   / truncated labels seen earlier were an artefact of a throw-away test tag, not the model.

### Notes / not yet done

- Legacy scores without compact `groups` are **out of scope** (not supported).
- Metadata is Phase-1 simple: full tooltip text, placed at its beat, no spanning / dotted
  gradual lines — that's the Phase 2 fidelity pass.
- Very long systems can run near the right margin (single line, like the Python).
- Build not run in-sandbox; requires `npm install` (for the two new deps) + `npm run build`.
