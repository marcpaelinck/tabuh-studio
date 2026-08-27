import type { Position } from '@tabuhstudio/shared'
import { getPositionName } from '@tabuhstudio/shared/config/configAccess'
import _ from 'lodash'
import { createContext, useContext, useMemo, type Dispatch, type ReactNode, type Ref, type SyntheticEvent } from 'react'
import {
    ArrayType,
    BooleanType,
    CheckPicker,
    Form,
    InputPicker,
    NumberType,
    SchemaModel,
    StringType,
    Toggle
} from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { dynamicValues, dynamicsToNumber } from '../../config/config'
import type {
    DynamicsItem,
    DynamicsValue,
    ExecutionItem,
    ExecutionItemType,
    GotoItem,
    KempliItem,
    KempliValue,
    LoopItem,
    SequenceItem,
    SuppressItem,
    TempoItem,
    WaitItem
} from '../../typing/execution'
import SequenceEditor from './SequenceEditor'

// ===========================================================================
// The execution-item form is driven by a per-type DESCRIPTOR REGISTRY.
//
// Everything type-specific lives in one descriptor object per item type:
//   - label         the option shown in the "add item" type picker
//   - createDefault a fresh draft item of that type
//   - toForm        item  -> flat form values (deserialize)
//   - fromForm      form  -> item            (serialize)
//   - Fields        the subform JSX for that type
//   - hasIterations whether the item supports the per-iteration condition
//
// Adding a new execution-item type = add one descriptor here (+ a tooltip case
// in utils/executionItems.ts). The validation schema (`formModel`) is the only
// other place that lists fields; add any new type-specific fields there.
// ===========================================================================

export type FlowConditionType = 'pass' | 'nthpass' | 'iteration'

// Flat form value: a superset of every type's editable fields. Each descriptor
// reads/writes only the fields relevant to its type, so the rest of the form
// machinery never needs to know which fields belong to which type.
export interface FormValueType {
    type: ExecutionItemType | ''
    // goto
    targetuuid?: string
    // loop
    count?: number
    // wait
    seconds?: number
    // tempo
    fromBPM?: number
    toBPM?: number
    // dynamics
    fromDynamics?: DynamicsValue
    toDynamics?: DynamicsValue
    dynamicsPositions?: Position[]
    // tempo + dynamics
    isGradual?: boolean
    fromBeat?: number
    toBeat?: number
    // sequence
    sequenceUuids?: string[]
    // suppress
    suppressPositions?: Position[]
    suppressBeats?: number[]
    // kempli
    kempliValue?: KempliValue
    kempliBeats?: number[]
    // conditions (shared)
    conditions: FlowConditionType[]
    passes?: number[]
    iterations?: number[]
}

// A draft is a list item that may still be incomplete while the user fills the
// form (and, for a freshly added item, has no `type` yet). The index signature
// keeps it decoupled from the discriminated `ExecutionItem` union, so adding any
// type's fields here does not run into cross-type property conflicts.
export interface ExecutionItemDraft {
    type?: ExecutionItemType
    seqId: number
    tooltip: string
    tooltipshort: string
    [field: string]: any
}

interface FromFormContext {
    uuidToName: Record<string, string>
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

// Builds a `when` validator whose requirement only applies if other fields hold
// the given value(s). E.g. `seconds` is required only when `type === 'wait'`.
const If = (
    ifAll: { [field: string]: any | any[] },
    requirement: 'isRequired' | 'notEmpty',
    RequiredType: CallableFunction,
    message?: string
) => {
    function compare(a: any, b: any) {
        if (Array.isArray(b)) return b.some((bval) => (Array.isArray(a) ? a.includes(bval) : a == bval))
        return Array.isArray(a) ? a.includes(b) : a == b
    }
    function doCheck(schema: any, ifAll: Record<string, any>, RequiredType: CallableFunction) {
        const cond = Object.entries(ifAll).reduce((aggr, [field, val]) => {
            const { value } = schema[field]
            return aggr && compare(value, val)
        }, true)
        switch (requirement) {
            case 'isRequired':
                return cond ? RequiredType().isRequired(message || '${name} is required') : RequiredType()
            case 'notEmpty':
                return cond ? RequiredType().minLength(1, message || 'Select at least one value') : RequiredType()
            default:
                return false
        }
    }
    return (schema: any) => doCheck(schema, ifAll, RequiredType)
}

export const EXECUTION_TYPES: ExecutionItemType[] = [
    'goto',
    'loop',
    'wait',
    'tempo',
    'dynamics',
    'sequence',
    'suppress',
    'kempli'
]

export const formModel = SchemaModel({
    type: StringType().isOneOf(EXECUTION_TYPES).isRequired(),
    // goto
    targetuuid: StringType().when(If({ type: 'goto' }, 'isRequired', StringType)),
    // loop
    count: NumberType()
        .when(If({ type: 'loop' }, 'isRequired', NumberType))
        .isInteger(),
    // wait
    seconds: NumberType().when(If({ type: 'wait' }, 'isRequired', NumberType)),
    // tempo
    fromBPM: NumberType().isInteger(),
    toBPM: NumberType()
        .isInteger()
        .when(If({ type: 'tempo' }, 'isRequired', NumberType)),
    // dynamics
    fromDynamics: StringType(),
    toDynamics: StringType().when(If({ type: 'dynamics' }, 'isRequired', StringType)),
    dynamicsPositions: ArrayType().of(StringType()),
    // tempo + dynamics
    fromBeat: NumberType()
        .isInteger()
        .when(If({ type: ['tempo', 'dynamics'] }, 'isRequired', NumberType)),
    toBeat: NumberType()
        .isInteger()
        .when(If({ isGradual: true }, 'isRequired', NumberType)),
    isGradual: BooleanType().when(If({ type: ['tempo', 'dynamics'] }, 'isRequired', BooleanType)),
    // sequence
    sequenceUuids: ArrayType()
        .of(StringType())
        .when(If({ type: 'sequence' }, 'notEmpty', ArrayType, 'Select at least one system')),
    // suppress (positions/beats optional: empty means "all")
    suppressPositions: ArrayType().of(StringType()),
    suppressBeats: ArrayType().of(NumberType()),
    // kempli
    kempliValue: StringType()
        .isOneOf(['double', 'off'])
        .when(If({ type: 'kempli' }, 'isRequired', StringType)),
    kempliBeats: ArrayType().of(NumberType()),
    // conditions (shared)
    passes: ArrayType()
        .of(NumberType())
        .when(If({ conditions: ['pass', 'nthpass'] }, 'notEmpty', ArrayType)),
    iterations: ArrayType()
        .of(NumberType())
        .when(If({ conditions: ['iteration'] }, 'notEmpty', ArrayType)),
    conditions: ArrayType().of(StringType().isOneOf(['pass', 'nthpass', 'iteration']))
})

// True when `value` passes the schema (no field reports an error). `check` expects
// every schema key present, so merge onto a complete blank form first.
export function isFormValid(value: FormValueType): boolean {
    const checkResult = formModel.check(Object.assign({ ...emptyForm }, value) as any)
    return !_.values(checkResult).some((val: any) => val.hasError)
}

// Empty form used to fill in missing keys before a validity check.
const emptyForm = {
    type: '',
    targetuuid: undefined,
    count: undefined,
    seconds: undefined,
    fromBPM: undefined,
    toBPM: undefined,
    fromDynamics: undefined,
    toDynamics: undefined,
    dynamicsPositions: undefined,
    fromBeat: undefined,
    toBeat: undefined,
    isGradual: undefined,
    sequenceUuids: undefined,
    suppressPositions: undefined,
    suppressBeats: undefined,
    kempliValue: undefined,
    kempliBeats: undefined,
    conditions: undefined,
    passes: undefined,
    iterations: undefined
}

// ---------------------------------------------------------------------------
// Required-field marking
//
// Requirements are conditional (`.when()`), so there is no static "required" flag:
// a field is required *right now* iff blanking it makes the schema report an error.
// `checkForField` evaluates one field against the full form value, so the `.when()`
// conditions resolve correctly. The set is provided through context so each field
// label can render a red asterisk without prop-drilling.
// ---------------------------------------------------------------------------

const EDITABLE_FIELD_NAMES = Object.keys(emptyForm).filter((name) => name !== 'type')

function requiredFieldNames(value: FormValueType): Set<string> {
    const base = { ...emptyForm, ...value }
    const required = new Set<string>()
    for (const name of EDITABLE_FIELD_NAMES) {
        const probe = { ...base, [name]: undefined }
        // Don't add isGradual: this value is set with a toggle which will always yield a value.
        if (name != 'isGradual' && formModel.checkForField(name as any, probe as any).hasError) required.add(name)
    }
    return required
}

const RequiredFieldsContext = createContext<Set<string>>(new Set())

// A Form.Label that appends a red asterisk when the field is currently required.
function FieldLabel({ name, label, className }: { name: string; label?: string; className?: string }) {
    const required = useContext(RequiredFieldsContext).has(name)
    return (
        <Form.Label className={className}>
            {label}
            {required && <span className="text-red-500"> *</span>}
        </Form.Label>
    )
}

// ---------------------------------------------------------------------------
// Generic field components (reused by the per-type Fields)
// ---------------------------------------------------------------------------

interface FieldsProps {
    formValue: FormValueType
    selectedElement: number | undefined
    sysOptions: InputOption<string>[]
    positionOptions: InputOption<string>[]
    loop: number | undefined
    // Update form fields for custom widgets that aren't rsuite Form.Controls.
    onPatch: (patch: Partial<FormValueType>) => void
}

interface PickerFieldProps {
    label?: string
    name: string
    data: any
    placeholder?: string
    disabled: boolean
    accepter?: any
    countable?: boolean
    cleanable?: boolean
    searchable?: boolean
}
const PickerField = ({
    label,
    name,
    data,
    placeholder,
    disabled,
    accepter,
    countable,
    cleanable,
    searchable
}: PickerFieldProps) => (
    <Form.Group className="items-start h-8" controlId={name}>
        <FieldLabel name={name} label={label} className="w-40 h-2 pt-[0.5rem]" />
        <Form.Control
            name={name}
            accepter={accepter || InputPicker}
            data={data}
            placeholder={placeholder}
            disabled={disabled}
            block
            cleanable={cleanable ?? false}
            searchable={searchable ?? false}
            countable={countable}
            className="w-60"
        />
    </Form.Group>
)

interface InputFieldProps {
    label?: string
    name: string
    placeholder?: string
    disabled: boolean
}
const InputField = ({ label, name, placeholder, disabled }: InputFieldProps) => (
    <Form.Group className="items-start h-8" controlId={name}>
        <FieldLabel name={name} label={label} className="w-40 h-2 pt-[0.5rem]" />
        <Form.Control name={name} placeholder={placeholder} disabled={disabled} className="w-60" />
    </Form.Group>
)

const ToggleField = ({ label, name, disabled }: { label?: string; name: string; disabled: boolean }) => (
    <Form.Group className="items-start h-8" controlId={name}>
        <FieldLabel name={name} label={label} className="w-40 h-2 pt-[0.5rem]" />
        <Form.Control accepter={Toggle} name={name} disabled={disabled} className="w-60" />
    </Form.Group>
)

interface RangeFieldProps {
    labels: string[]
    names: string[]
    placeholders: string[]
    disabled: boolean
    data?: any
    accepter?: any
    block?: boolean
    cleanable?: boolean
    searchable?: boolean
}
const RangeField = ({
    labels,
    names,
    placeholders,
    disabled,
    data,
    accepter,
    block,
    cleanable,
    searchable
}: RangeFieldProps) => (
    <Form.Stack layout="inline">
        <Form.Group className="items-start h-8" controlId={names[0]}>
            <FieldLabel name={names[0]} label={labels[0]} className="w-40 h-2 pt-[0.5rem]" />
            <Form.Control
                name={names[0]}
                disabled={disabled}
                className="w-24"
                placeholder={placeholders[0]}
                data={data}
                accepter={accepter}
                block={block}
                cleanable={cleanable}
                searchable={searchable}
            />
        </Form.Group>
        <Form.Group className="items-start h-8" controlId={names[1]}>
            <FieldLabel name={names[1]} label={labels[1]} className="w-5 h-2 pt-[0.5rem]" />
            <Form.Control
                name={names[1]}
                disabled={disabled}
                className="w-24"
                placeholder={placeholders[1]}
                data={data}
                accepter={accepter}
                block={block}
                cleanable={cleanable}
                searchable={searchable}
            />
        </Form.Group>
    </Form.Stack>
)

// A 1..n multi-select used for beat / pass / iteration numbers.
const numberOptions = (max: number) =>
    new Array(max).fill(null).map((_v, idx) => ({ label: `${idx + 1}`, value: idx + 1 }))

// ---------------------------------------------------------------------------
// Descriptor registry
// ---------------------------------------------------------------------------

export interface ItemDescriptor {
    type: ExecutionItemType
    label: string
    hasIterations: boolean
    createDefault: () => ExecutionItemDraft
    toForm: (item: ExecutionItem) => Partial<FormValueType>
    fromForm: (form: FormValueType, base: ExecutionItem, ctx: FromFormContext) => ExecutionItem
    Fields: (props: FieldsProps) => ReactNode
}

const draftBase = (type: ExecutionItemType): ExecutionItemDraft => ({ type, seqId: 0, tooltip: type, tooltipshort: '' })

// Recomputes the iterations field from the condition selection (types that
// support iterations only).
function iterationsFromForm(form: FormValueType): number[] | undefined {
    return form.conditions?.includes('iteration') ? form.iterations || [] : undefined
}

export const executionItemRegistry: Record<ExecutionItemType, ItemDescriptor> = {
    goto: {
        type: 'goto',
        label: 'go to',
        hasIterations: false,
        createDefault: () => ({ ...draftBase('goto'), targetuuid: '', targetname: '' }),
        toForm: (item) => ({ targetuuid: (item as GotoItem).targetuuid || '' }),
        fromForm: (form, base, ctx): GotoItem => ({
            ...(base as GotoItem),
            type: 'goto',
            targetuuid: form.targetuuid || '',
            targetname: form.targetuuid ? ctx.uuidToName[form.targetuuid] : ''
        }),
        Fields: ({ sysOptions, selectedElement }) => (
            <PickerField
                name="targetuuid"
                data={sysOptions}
                placeholder="System to go to"
                disabled={selectedElement == undefined}
            />
        )
    },

    loop: {
        type: 'loop',
        label: 'loop',
        hasIterations: false,
        createDefault: () => ({ ...draftBase('loop'), count: undefined }),
        toForm: (item) => ({ count: (item as LoopItem).count }),
        fromForm: (form, base): LoopItem => ({
            ...(base as LoopItem),
            type: 'loop',
            count: form.count != undefined ? Number(form.count) : (base as LoopItem).count
        }),
        Fields: ({ selectedElement }) => (
            <InputField
                label="Loop count"
                name="count"
                placeholder="Iterations"
                disabled={selectedElement == undefined}
            />
        )
    },

    wait: {
        type: 'wait',
        label: 'wait',
        hasIterations: false,
        createDefault: () => ({ ...draftBase('wait'), seconds: 0 }),
        toForm: (item) => ({ seconds: (item as WaitItem).seconds }),
        fromForm: (form, base): WaitItem => ({
            ...(base as WaitItem),
            type: 'wait',
            seconds: form.seconds != undefined ? Number(form.seconds) : 0
        }),
        Fields: ({ selectedElement }) => (
            <InputField label="Seconds" name="seconds" placeholder="Seconds" disabled={selectedElement == undefined} />
        )
    },

    tempo: {
        type: 'tempo',
        label: 'tempo',
        hasIterations: true,
        createDefault: () => ({ ...draftBase('tempo'), isGradual: false, fromBeat: 1 }),
        toForm: (item) => {
            const t = item as TempoItem
            return {
                fromBPM: t.fromValue,
                toBPM: t.value,
                isGradual: t.isGradual,
                fromBeat: t.fromBeat,
                toBeat: t.toBeat
            }
        },
        fromForm: (form, base): TempoItem => ({
            ...(base as TempoItem),
            type: 'tempo',
            isGradual: form.isGradual || false,
            fromBeat: form.fromBeat || 1,
            toBeat: form.toBeat,
            fromValue: form.fromBPM != undefined ? Number(form.fromBPM) : undefined,
            value: Number(form.toBPM),
            iterations: iterationsFromForm(form)
        }),
        Fields: ({ formValue, selectedElement }) => {
            const disabled = selectedElement == undefined
            return (
                <>
                    <ToggleField label="Gradual" name="isGradual" disabled={disabled} />
                    {!formValue.isGradual ? (
                        <>
                            <InputField label="BPM" name="toBPM" placeholder="BPM value" disabled={disabled} />
                            <InputField
                                label="Starting from beat"
                                name="fromBeat"
                                placeholder="Beat number"
                                disabled={disabled}
                            />
                        </>
                    ) : (
                        <>
                            <RangeField
                                labels={['BPM: from', 'to']}
                                names={['fromBPM', 'toBPM']}
                                placeholders={['Current', '']}
                                disabled={disabled}
                            />
                            <RangeField
                                labels={['From beat', 'to']}
                                names={['fromBeat', 'toBeat']}
                                placeholders={['', '']}
                                disabled={disabled}
                            />
                        </>
                    )}
                </>
            )
        }
    },

    dynamics: {
        type: 'dynamics',
        label: 'dynamics',
        hasIterations: true,
        createDefault: () => ({ ...draftBase('dynamics'), isGradual: false, fromBeat: 1, positions: [] }),
        toForm: (item) => {
            const d = item as DynamicsItem
            return {
                fromDynamics: d.fromDynamics,
                toDynamics: d.dynamics,
                isGradual: d.isGradual,
                fromBeat: d.fromBeat,
                toBeat: d.toBeat,
                dynamicsPositions: d.positions
            }
        },
        fromForm: (form, base): DynamicsItem => {
            const prev = base as DynamicsItem
            const dynamics = (form.toDynamics ?? prev.dynamics) as DynamicsValue
            return {
                ...prev,
                type: 'dynamics',
                isGradual: form.isGradual || false,
                fromBeat: form.fromBeat || 1,
                toBeat: form.toBeat,
                fromDynamics: form.fromDynamics,
                fromValue: form.fromDynamics ? dynamicsToNumber[form.fromDynamics] : undefined,
                dynamics,
                value: dynamicsToNumber[dynamics],
                positions: form.dynamicsPositions ?? prev.positions ?? [],
                iterations: iterationsFromForm(form)
            }
        },
        Fields: ({ formValue, selectedElement, positionOptions }) => {
            const disabled = selectedElement == undefined
            const dynData = dynamicValues.map((dyn) => ({ label: dyn, value: dyn }))
            return (
                <>
                    <PickerField
                        label="Positions"
                        name="dynamicsPositions"
                        accepter={CheckPicker}
                        data={positionOptions}
                        placeholder="All positions"
                        countable={false}
                        cleanable
                        disabled={disabled}
                    />
                    <ToggleField label="Gradual" name="isGradual" disabled={disabled} />
                    {!formValue.isGradual ? (
                        <>
                            <PickerField
                                label="Dynamics"
                                name="toDynamics"
                                data={dynData}
                                placeholder="Select..."
                                disabled={disabled}
                            />
                            <InputField
                                label="Starting from beat"
                                name="fromBeat"
                                placeholder="Beat number"
                                disabled={disabled}
                            />
                        </>
                    ) : (
                        <>
                            <RangeField
                                labels={['Dynamics: from', 'to']}
                                names={['fromDynamics', 'toDynamics']}
                                placeholders={['Current', '']}
                                data={dynData}
                                accepter={InputPicker}
                                block
                                cleanable
                                searchable={false}
                                disabled={disabled}
                            />
                            <RangeField
                                labels={['From beat', 'to']}
                                names={['fromBeat', 'toBeat']}
                                placeholders={['1', '']}
                                disabled={disabled}
                            />
                        </>
                    )}
                </>
            )
        }
    },

    sequence: {
        type: 'sequence',
        label: 'sequence',
        hasIterations: false,
        createDefault: () => ({ ...draftBase('sequence'), labels: [], uuids: [] }),
        toForm: (item) => ({ sequenceUuids: (item as SequenceItem).uuids }),
        fromForm: (form, base, ctx): SequenceItem => {
            const uuids = form.sequenceUuids || []
            return {
                ...(base as SequenceItem),
                type: 'sequence',
                uuids,
                labels: uuids.map((u) => ctx.uuidToName[u] ?? u)
            }
        },
        Fields: ({ sysOptions, selectedElement, formValue, onPatch }) => (
            <SequenceEditor
                options={sysOptions}
                value={formValue.sequenceUuids || []}
                onChange={(uuids) => onPatch({ sequenceUuids: uuids })}
                disabled={selectedElement == undefined}
            />
        )
    },

    suppress: {
        type: 'suppress',
        label: 'suppress',
        hasIterations: true,
        createDefault: () => ({ ...draftBase('suppress') }),
        toForm: (item) => ({
            suppressPositions: (item as SuppressItem).positions,
            suppressBeats: (item as SuppressItem).beats
        }),
        fromForm: (form, base): SuppressItem => ({
            ...(base as SuppressItem),
            type: 'suppress',
            positions: form.suppressPositions && form.suppressPositions.length > 0 ? form.suppressPositions : undefined,
            beats: form.suppressBeats && form.suppressBeats.length > 0 ? form.suppressBeats : undefined,
            iterations: iterationsFromForm(form)
        }),
        Fields: ({ positionOptions, selectedElement }) => {
            const disabled = selectedElement == undefined
            return (
                <>
                    <PickerField
                        label="Positions"
                        name="suppressPositions"
                        accepter={CheckPicker}
                        data={positionOptions}
                        placeholder="All positions"
                        countable={false}
                        cleanable
                        disabled={disabled}
                    />
                    <PickerField
                        label="On beats"
                        name="suppressBeats"
                        accepter={CheckPicker}
                        data={numberOptions(16)}
                        placeholder="All beats"
                        countable={false}
                        cleanable
                        disabled={disabled}
                    />
                </>
            )
        }
    },

    kempli: {
        type: 'kempli',
        label: 'kempli',
        hasIterations: true,
        createDefault: () => ({ ...draftBase('kempli'), value: 'off' }),
        toForm: (item) => ({ kempliValue: (item as KempliItem).value, kempliBeats: (item as KempliItem).beats }),
        fromForm: (form, base): KempliItem => ({
            ...(base as KempliItem),
            type: 'kempli',
            value: (form.kempliValue ?? (base as KempliItem).value ?? 'off') as KempliValue,
            beats: form.kempliBeats && form.kempliBeats.length > 0 ? form.kempliBeats : undefined,
            iterations: iterationsFromForm(form)
        }),
        Fields: ({ selectedElement }) => {
            const disabled = selectedElement == undefined
            return (
                <>
                    <PickerField
                        label="Kempli"
                        name="kempliValue"
                        data={[
                            { label: 'double', value: 'double' },
                            { label: 'off', value: 'off' }
                        ]}
                        placeholder="Select..."
                        disabled={disabled}
                    />
                    <PickerField
                        label="On beats"
                        name="kempliBeats"
                        accepter={CheckPicker}
                        data={numberOptions(16)}
                        placeholder="All beats"
                        countable={false}
                        cleanable
                        disabled={disabled}
                    />
                </>
            )
        }
    }
}

export const executionTypeOptions: { label: string; value: ExecutionItemType }[] = EXECUTION_TYPES.map((type) => ({
    label: executionItemRegistry[type].label,
    value: type
}))

/** Position options for a system, derived from the staffs it contains. */
export function positionOptionsForSystem(
    staffs: Partial<Record<Position, unknown>>,
    orchestraPosititions: Position[],
    beatPosition: Position
): InputOption<string>[] {
    return orchestraPosititions
        .filter((p) => p in staffs && p !== beatPosition)
        .map((p) => ({ label: getPositionName(p as Position), value: p }))
}

// ---------------------------------------------------------------------------
// Shared condition subform (passes / nth-pass / iterations)
// ---------------------------------------------------------------------------

interface ConditionFormProps extends FieldsProps {
    type: ExecutionItemType
    hasIterations: boolean
}
const ConditionForm = ({ type, hasIterations, formValue, loop, selectedElement }: ConditionFormProps) => {
    const disabled = selectedElement == undefined
    const afterOn = ['goto', 'wait', 'sequence'].includes(type) ? 'after' : 'on'
    const options = [
        { group: 'passes', label: `${afterOn} pass(es) nr ... `, value: 'pass' },
        { group: 'passes', label: `${afterOn} every ...th pass`, value: 'nthpass' }
    ]
    if (hasIterations && loop)
        options.push({ group: 'loop', label: `${afterOn} iteration(s) nr ... `, value: 'iteration' })

    return (
        <>
            <PickerField
                label="Condition"
                name="conditions"
                accepter={CheckPicker}
                data={options}
                placeholder="None"
                countable={false}
                disabled={disabled}
            />
            {formValue?.conditions?.some((value) => ['pass', 'nthpass'].includes(value)) && (
                <PickerField
                    label="Passes"
                    name="passes"
                    accepter={CheckPicker}
                    data={numberOptions(20)}
                    countable={false}
                    disabled={disabled}
                />
            )}
            {formValue?.conditions?.includes('iteration') && (
                <PickerField
                    label="Iterations"
                    name="iterations"
                    accepter={CheckPicker}
                    data={numberOptions(loop || 0)}
                    countable={false}
                    disabled={disabled}
                />
            )}
        </>
    )
}

// ---------------------------------------------------------------------------
// The generic execution-item form
// ---------------------------------------------------------------------------

interface ExecutionItemFormProps extends Omit<FieldsProps, 'onPatch'> {
    type: ExecutionItemType | undefined
    setDirty: Dispatch<boolean>
    setFormValue: Dispatch<FormValueType>
    model: typeof formModel
    // Ref to the underlying rsuite <Form>; lets the parent call `check()` to paint
    // the per-field error labels when the user tries to leave an invalid form.
    formRef?: Ref<any>
}

export default function ExecutionItemForm({
    type,
    selectedElement,
    formValue,
    sysOptions,
    positionOptions,
    setDirty,
    setFormValue,
    loop,
    model,
    formRef
}: ExecutionItemFormProps) {
    function setValueChanged(value: Record<string, any>, _event: SyntheticEvent<Element, Event> | undefined) {
        const newValue = value as FormValueType
        setFormValue(newValue)
        if (isFormValid(newValue)) setDirty(true)
    }

    // Lets custom widgets (e.g. the sequence editor) update the form value the
    // same way an rsuite Form.Control change would.
    const onPatch = (patch: Partial<FormValueType>) => setValueChanged({ ...formValue, ...patch }, undefined)

    // Which fields are currently required (given the rest of the form).
    const requiredFields = useMemo(() => requiredFieldNames(formValue), [formValue])

    if (!type) return null
    const descriptor = executionItemRegistry[type]
    const fieldsProps: FieldsProps = { formValue, selectedElement, sysOptions, positionOptions, loop, onPatch }

    return (
        <RequiredFieldsContext.Provider value={requiredFields}>
            <Form ref={formRef} model={model} onChange={setValueChanged} formValue={formValue}>
                <Form.Stack layout="horizontal">
                    <Form.Group controlId="item-type">
                        <Form.Label className="w-40">Type</Form.Label>
                        <Form.Text className="w-120 font-bold text-base">{descriptor.label}</Form.Text>
                    </Form.Group>
                    {descriptor.Fields(fieldsProps)}
                    <ConditionForm type={type} hasIterations={descriptor.hasIterations} {...fieldsProps} />
                </Form.Stack>
            </Form>
        </RequiredFieldsContext.Provider>
    )
}
