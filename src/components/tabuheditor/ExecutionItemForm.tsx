import { type Dispatch, type ElementType } from 'react'
import type { CheckPickerProps, FormControlProps, FormGroupProps, InputPickerProps, InputProps } from 'rsuite'
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
import type { ExecutionItemType } from '../../models/types'

export interface FormValueType {
    type: any
    targetuuid?: any
    count?: any
    fromBPM?: any
    toBPM?: any
    fromDynamics?: any
    toDynamics?: any
    fromSection?: any
    toSection?: any
    isGradual?: any
    passes?: any
    each?: any
    checkbox?: any
}

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
    passes: 'passes',
    each: 'each',
    checkbox: 'checkbox'
}
const model = SchemaModel({
    type: StringType().isRequired(),
    targetuuid: StringType().isRequired(),
    passes: ArrayType().of(NumberType()).isRequiredOrEmpty(),
    each: BooleanType().isRequiredOrEmpty()
})

// GENERIC FIELD COMPONENTS

interface ExecutionBaseFieldProps extends Pick<FormGroupProps, 'controlId'>, Pick<FormControlProps, 'accepter'> {
    label?: string
    name?: string
    formValue: FormValueType
    setDirty: Dispatch<boolean>
    selectedElement: number | undefined
}

interface PickerFieldProps extends ExecutionBaseFieldProps, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    data: any
}
// Selection (single or multiple)
const PickerField = ({ label, selectedElement, setDirty, formValue, ...props }: PickerFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={props.accepter || InputPicker}
                cleanable={false}
                onChange={() => setDirty(true)}
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
                // checked={checkedRef.current}
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

interface ConditionFormProps extends ExecutionBaseFieldProps {
    type: ExecutionItemType
}
// Form that captures the details of the selected item
const ConditionForm = ({ type, ...props }: ConditionFormProps) => {
    const condition = type == 'goto' ? 'after' : 'on'
    return (
        <>
            <PickerField
                label="Condition"
                name={formFieldNames.each}
                data={[
                    { label: 'none', value: undefined },
                    { label: `${condition} pass(es) nr ... `, value: false },
                    { label: `${condition} every ...th pass`, value: true }
                ]}
                {...props}
            />
            {props.formValue.each != undefined && (
                <PickerField
                    accepter={CheckPicker}
                    label="Passes"
                    name={formFieldNames.passes}
                    countable={false}
                    data={new Array(20).fill(null).map((_, idx) => {
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
}
// Contains the details of a specific Execution item.
export default function ExecutionItemForm({
    type,
    selectedElement,
    formValue,
    sysOptions,
    setDirty
}: ExecutionItemFormProps) {
    // Properties that are passed down as {...props}
    const baseProps: ExecutionBaseFieldProps = {
        selectedElement: selectedElement,
        formValue: formValue,
        setDirty: setDirty
    }
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
