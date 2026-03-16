import { useState, type Dispatch, type ElementType } from 'react'
import type { CheckPickerProps, FormControlProps, FormGroupProps, InputPickerProps, InputProps, Option } from 'rsuite'
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
import { dynamicValues } from '../../config/config'
import type { DynamicsValue, ExecutionItemType } from '../../typing/types'

export type FlowConditionType = 'pass' | 'nthpass' | 'iteration'

export interface FormValueType {
    type?: ExecutionItemType | ''
    targetuuid?: string
    count?: number
    fromBPM?: number
    toBPM?: number
    fromDynamics?: DynamicsValue
    toDynamics?: DynamicsValue
    fromSection?: number
    toSection?: number
    isGradual?: boolean
    passes?: number[]
    iterations?: number[]
    conditions: FlowConditionType[]
    checkbox?: any
}

const ifGradual = (value: any, data: FormValueType) => data.isGradual == true && value != undefined

export const formModel = SchemaModel({
    targetuuid: StringType().isRequired('This field is required.'),
    count: NumberType().isInteger().isRequired(),
    fromBPM: NumberType().isInteger().addRule(ifGradual, 'from value must be given.'),
    toBPM: NumberType().isInteger().isRequired('value must be given'),
    fromDynamics: StringType().addRule(ifGradual, 'from value must be given.'),
    toDynamics: StringType().isRequired('value must be given'),
    fromSection: NumberType().isInteger().addRule(ifGradual, 'from value must be given.'),
    toSection: NumberType().isInteger().isRequired('section must be given'),
    isGradual: BooleanType().isRequired(),
    passes: ArrayType().of(NumberType()),
    iterations: ArrayType().of(NumberType()),
    conditions: ArrayType().of(StringType().isOneOf(['pass', 'nthpass', 'iteration'])),
    checkbox: BooleanType()
})

const formFieldNames = {
    type: 'type',
    targetuuid: 'targetuuid',
    count: 'count',
    fromBPM: 'fromBPM',
    toBPM: 'toBPM',
    fromDynamics: 'fromDynamics',
    toDynamics: 'toDynamics',
    fromSection: 'fromSection',
    toSection: 'toSection',
    isGradual: 'isGradual',
    conditions: 'conditions',
    passes: 'passes',
    iterations: 'iterations',
    checkbox: 'checkbox'
}
// const model = SchemaModel({
//     type: StringType().isRequired(),
//     targetuuid: StringType().isRequired(),
//     passes: ArrayType().of(NumberType()).isRequiredOrEmpty(),
//     each: BooleanType().isRequiredOrEmpty()
// })

// GENERIC FIELD COMPONENTS

interface ExecutionBaseFieldProps extends Pick<FormGroupProps, 'controlId'>, Pick<FormControlProps, 'accepter'> {
    label?: string
    name?: string
    formValue: FormValueType
    setDirty: Dispatch<boolean>
    loop: number | undefined
    selectedElement: number | undefined
}

interface PickerFieldProps
    extends Omit<ExecutionBaseFieldProps, 'loop'>, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    data: any
    onChange?: (event: Event) => void
}
// Selection (single or multiple)
const PickerField = ({ label, selectedElement, setDirty, formValue, onChange, ...props }: PickerFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={props.accepter || InputPicker}
                cleanable={false}
                onChange={(event: Event) => {
                    if (onChange) onChange(event)
                    setDirty(true)
                }}
                disabled={selectedElement == undefined}
                block
                searchable={false}
                className="w-60"
                {...props}
            />
        </Form.Group>
    )
}

interface InputFieldProps extends ExecutionBaseFieldProps, Pick<InputProps, 'placeholder'> {}
const InputField = ({ label, selectedElement, setDirty, formValue, ...props }: InputFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                onChange={() => setDirty(true)}
                disabled={selectedElement == undefined}
                className="w-60"
                {...props}
            />
        </Form.Group>
    )
}

interface RangeFieldProps
    extends
        ExecutionBaseFieldProps,
        Pick<InputPickerProps, 'block' | 'cleanable' | 'searchable'>,
        Omit<InputProps, 'name' | 'placeholder'> {
    labels: string[]
    names: string[]
    placeholders: string[]
    data?: InputOption
    accepter?: ElementType
}
const RangeField = ({
    labels,
    names,
    placeholders,
    selectedElement,
    setDirty,
    formValue,
    ...props
}: RangeFieldProps) => {
    return (
        <Form.Stack layout="inline">
            <Form.Group className="items-start h-8" controlId={props.controlId}>
                <Form.Label className="w-40 h-2 pt-[0.5rem]">{labels[0]}</Form.Label>
                <Form.Control
                    onChange={() => setDirty(true)}
                    name={names[0]}
                    disabled={selectedElement == undefined}
                    className="w-24"
                    placeholder={placeholders[0]}
                    {...props}
                />
            </Form.Group>
            <Form.Group className="items-start h-8" controlId={props.controlId}>
                <Form.Label className="w-5 h-2 pt-[0.5rem]">{labels[1]}</Form.Label>
                <Form.Control
                    onChange={() => setDirty(true)}
                    name={names[1]}
                    disabled={selectedElement == undefined}
                    className="w-24"
                    placeholder={placeholders[1]}
                    {...props}
                />
            </Form.Group>
        </Form.Stack>
    )
}

interface CheckBoxProps extends ExecutionBaseFieldProps {}
const ToggleField = ({ label, selectedElement, setDirty, formValue, ...props }: CheckBoxProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={Toggle}
                onChange={() => {
                    setDirty(true)
                }}
                disabled={selectedElement == undefined}
                className="w-60"
                {...props}
            />
        </Form.Group>
    )
}

// COMMON PART: CONDITION

// CheckPicker with specific logic
const ConditionPicker = ({ ...props }: CheckPickerProps<string>) => {
    const [value, setValue] = useState<string[]>(props.value || [])

    // useEffect(() => debug(`SET VALUE TO ${JSON.stringify(value)}`), value)

    // Ensures that at most one the options `pass` or `nthpass` can be selected.
    function doLogic(currValue: string[], option: Option<string>) {
        if (option.value == 'pass') {
            const idx = currValue.indexOf('nthpass')
            // if (idx >= 0) setValue(currValue.toSpliced(idx, 1))
            if (idx >= 0) currValue.splice(idx, 1)
        }
        if (option.value == 'nthpass') {
            const idx = currValue.indexOf('pass')
            // if (idx >= 0) setValue(currValue.toSpliced(idx, 1))
            if (idx >= 0) currValue.splice(idx, 1)
        }
    }

    return (
        <CheckPicker
            countable={false}
            groupBy="group"
            onSelect={(value, option) => doLogic(value, option)}
            value={value}
            onChange={setValue}
            {...props}
        />
    )
}

interface ConditionFormProps extends ExecutionBaseFieldProps {
    type: ExecutionItemType
    loop: number | undefined
}
// Form that captures the details of the selected item
const ConditionForm = ({ type, loop, ...props }: ConditionFormProps) => {
    const afterOn = type == 'goto' ? 'after' : 'on'
    const options = [
        { group: 'passes', label: `${afterOn} pass(es) nr ... `, value: 'pass' },
        { group: 'passes', label: `${afterOn} every ...th pass`, value: 'nthpass' }
    ]
    if (['tempo', 'dynamics'].includes(type) && loop)
        options.push({ group: 'loop', label: `${afterOn} iteration(s) nr ... `, value: 'iteration' })

    return (
        <>
            <PickerField
                label="Condition"
                name={formFieldNames.conditions}
                accepter={ConditionPicker}
                data={options}
                placeholder={'None'}
                {...props}
            />
            {props.formValue?.conditions?.some((value) => ['pass', 'nthpass'].includes(value)) && (
                <PickerField
                    accepter={CheckPicker}
                    label="Passes"
                    name={formFieldNames.passes}
                    onChange={(event: Event) => console.log(event)}
                    countable={false}
                    data={new Array(20).fill(null).map((_, idx) => {
                        return { label: `${idx + 1}`, value: idx + 1 }
                    })}
                    {...props}
                />
            )}
            {props.formValue?.conditions?.includes('iteration') && (
                <PickerField
                    accepter={CheckPicker}
                    label="Iterations"
                    name={formFieldNames.iterations}
                    onChange={(event: Event) => console.log(event)}
                    countable={false}
                    data={new Array(loop).fill(null).map((_, idx) => {
                        return { label: `${idx + 1}`, value: idx + 1 }
                    })}
                    {...props}
                />
            )}
        </>
    )
}

// SPECIFIC PART: EXECUTION TYPES

interface GotoFormProps extends ExecutionBaseFieldProps {
    sysOptions: InputOption<string>[]
}
const GoToForm = ({ sysOptions, ...props }: GotoFormProps) => {
    return (
        <>
            <PickerField
                name={formFieldNames.targetuuid}
                data={sysOptions || []}
                placeholder={'System to go to'}
                {...props}
            />
        </>
    )
}

const LoopForm = ({ ...props }: ExecutionBaseFieldProps) => {
    return (
        <>
            <InputField label="Loop count" name={formFieldNames.count} placeholder={'Iterations'} {...props} />
        </>
    )
}

const TempoForm = ({ formValue, ...props }: ExecutionBaseFieldProps) => {
    return (
        <>
            <ToggleField label="Gradual" name={formFieldNames.isGradual} formValue={formValue} {...props} />
            {!formValue.isGradual ? (
                <>
                    <InputField
                        label="BPM"
                        name={formFieldNames.toBPM}
                        formValue={formValue}
                        placeholder={'BPM value'}
                        {...props}
                    />
                    <InputField
                        label="Starting from beat"
                        name={formFieldNames.toSection}
                        formValue={formValue}
                        placeholder={'Beat number'}
                        {...props}
                    />
                </>
            ) : (
                <>
                    <RangeField
                        labels={['BPM: from', 'to']}
                        formValue={formValue}
                        names={[formFieldNames.fromBPM, formFieldNames.toBPM]}
                        placeholders={['Current', '']}
                        {...props}
                    />
                    <RangeField
                        labels={['From beat', 'to']}
                        formValue={formValue}
                        names={[formFieldNames.fromSection, formFieldNames.toSection]}
                        placeholders={['1', '']}
                        {...props}
                    />
                </>
            )}
        </>
    )
}

const DynamicsForm = ({ formValue, ...props }: ExecutionBaseFieldProps) => {
    return (
        <>
            <ToggleField label="Gradual" name={formFieldNames.isGradual} formValue={formValue} {...props} />
            {!formValue.isGradual ? (
                <>
                    <PickerField
                        label="Dynamics"
                        formValue={formValue}
                        name={formFieldNames.toDynamics}
                        data={dynamicValues.map((dyn) => {
                            return { label: dyn, value: dyn }
                        })}
                        placeholder={'Select...'}
                        {...props}
                    />
                    <InputField
                        label="Starting from beat"
                        name={formFieldNames.toSection}
                        formValue={formValue}
                        placeholder={'Beat number'}
                        {...props}
                    />
                </>
            ) : (
                <>
                    <RangeField
                        labels={['Dynamics: from', 'to']}
                        formValue={formValue}
                        names={[formFieldNames.fromDynamics, formFieldNames.toDynamics]}
                        data={dynamicValues.map((dyn) => {
                            return { label: dyn, value: dyn }
                        })}
                        accepter={InputPicker}
                        placeholders={['Current', '']}
                        block
                        cleanable={true}
                        searchable={false}
                        {...props}
                    />
                    <RangeField
                        labels={['From beat', 'to']}
                        formValue={formValue}
                        names={[formFieldNames.fromSection, formFieldNames.toSection]}
                        placeholders={['1', '']}
                        {...props}
                    />
                </>
            )}
        </>
    )
}

interface ExecutionItemFormProps {
    type: ExecutionItemType | undefined
    selectedElement: number | undefined
    formValue: FormValueType
    sysOptions: InputOption<string>[]
    setDirty: Dispatch<boolean>
    loop: number | undefined
}
// Contains the details of a specific Execution item.
export default function ExecutionItemForm({
    type,
    selectedElement,
    formValue,
    sysOptions,
    setDirty,
    loop
}: ExecutionItemFormProps) {
    // Properties that will be passed down to each form type
    const baseProps: ExecutionBaseFieldProps = { selectedElement, formValue, setDirty, loop }
    const gotoForm = <GoToForm sysOptions={sysOptions} {...baseProps} />
    const loopForm = <LoopForm {...baseProps} />
    const tempoForm = <TempoForm {...baseProps} />
    const dynamicsForm = <DynamicsForm {...baseProps} />
    if (!type) return
    return (
        <Form.Stack layout="horizontal">
            <Form.Group controlId={`goto-subform`}>
                <Form.Label className="w-40">Type</Form.Label>
                <Form.Text className="w-120 font-bold text-base">{type}</Form.Text>
            </Form.Group>
            {type == 'goto' && gotoForm}
            {type == 'loop' && loopForm}
            {type == 'tempo' && tempoForm}
            {type == 'dynamics' && dynamicsForm}
            <ConditionForm type={type} {...baseProps} />
        </Form.Stack>
    )
}
