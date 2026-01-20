import { type Dispatch } from 'react'
import type { CheckPickerProps, FormControlProps, FormGroupProps, InputProps } from 'rsuite'
import {
    ArrayType,
    BooleanType,
    Checkbox,
    CheckPicker,
    Form,
    InputPicker,
    NumberType,
    SchemaModel,
    StringType
} from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { ExecutionItemType } from '../../models/types'

const formModel = {
    type: 'type',
    targetuuid: 'targetuuid',
    count: 'count',
    fromValue: 'fromValue',
    toValue: 'toValue',
    fromSection: 'fromSection',
    toSection: 'toSection',
    isGradual: 'isGradual',
    passes: 'passes',
    each: 'each'
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
    formValue: Record<string, any>
    setDirty: Dispatch<boolean>
    selectedElement: number | undefined
}

interface PickerFieldProps extends ExecutionBaseFieldProps, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    data: any
}
// Selection (single or multiple)
const PickerField = ({ label, ...props }: PickerFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={props.accepter || InputPicker}
                cleanable={false}
                onChange={() => props.setDirty(true)}
                disabled={props.selectedElement == undefined}
                block
                searchable={false}
                className="w-60"
                {...props}
            />
        </Form.Group>
    )
}

interface InputFieldProps extends ExecutionBaseFieldProps, Pick<InputProps, 'placeholder'> {}
const InputField = ({ label, selectedElement, setDirty, ...props }: InputFieldProps) => {
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

interface RangeFieldProps extends Omit<ExecutionBaseFieldProps, 'name'>, Omit<InputProps, 'name'> {
    labels: string[]
    names: string[]
}
const RangeField = ({ labels, names, selectedElement, setDirty, ...props }: RangeFieldProps) => {
    return (
        <Form.Stack layout="horizontal">
            <Form.Group className="items-start h-8" controlId={props.controlId}>
                <Form.Label className="w-40 h-2 pt-[0.5rem]">{labels[0]}</Form.Label>
                <Form.Control
                    onChange={() => setDirty(true)}
                    name={names[0]}
                    disabled={selectedElement == undefined}
                    className="w-30"
                />
            </Form.Group>
            <Form.Group className="items-start h-8" controlId={props.controlId}>
                <Form.Label className="w-20 h-2 pt-[0.5rem]">{labels[1]}</Form.Label>
                <Form.Control
                    onChange={() => setDirty(true)}
                    name={names[1]}
                    disabled={selectedElement == undefined}
                    className="w-30"
                />
            </Form.Group>
        </Form.Stack>
    )
}

interface CheckBoxProps extends ExecutionBaseFieldProps {}
const CheckBox = ({ label, ...props }: CheckBoxProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                onChange={() => props.setDirty(true)}
                accepter={Checkbox}
                disabled={props.selectedElement == undefined}
                className="w-60"
                {...props}
            />
        </Form.Group>
    )
}

// COMMON PART: CONDITION

interface ConditionFormProps extends Omit<ExecutionBaseFieldProps, 'label'> {
    type: ExecutionItemType
}
// Form that captures the details of the selected item
const ConditionForm = ({ type, ...props }: ConditionFormProps) => {
    const condition = type == 'goto' ? 'after' : 'on'
    return (
        <>
            <PickerField
                label="Condition"
                name={formModel.each}
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
                    name={formModel.passes}
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

interface GotoFormProps extends ExecutionBaseFieldProps {
    sysOptions: InputOption<string>[]
}
const GoToForm = ({ sysOptions, ...props }: GotoFormProps) => {
    return (
        <>
            <PickerField
                name={formModel.targetuuid}
                data={sysOptions || []}
                placeholder={'System to go to'}
                {...props}
            />
        </>
    )
}

interface LoopFormProps extends ExecutionBaseFieldProps {}
const LoopForm = ({ ...props }: LoopFormProps) => {
    return (
        <>
            <InputField label="Loop count" name={formModel.count} placeholder={'Iterations'} {...props} />
        </>
    )
}

interface ExpressionFormProps extends ExecutionBaseFieldProps {
    selectedElement: number | undefined
    setDirty: Dispatch<boolean>
}
const ExpressionForm = ({ ...props }: ExecutionBaseFieldProps) => {
    return (
        <>
            <CheckBox label="Gradual" name={formModel.isGradual} {...props} />
            {props.formValue.isGradual ? (
                <InputField label="BPM" name={formModel.toValue} placeholder={'BPM value'} {...props} />
            ) : (
                <RangeField
                    labels={['BPM from', 'to']}
                    names={[formModel.fromValue, formModel.toValue]}
                    placeholder={'BPM value'}
                    {...props}
                />
            )}
        </>
    )
}

interface ExecutionItemFormProps {
    type: ExecutionItemType | undefined
    selectedElement: number | undefined
    formValue: Record<string, any>
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
    const gradualForm = <ExpressionForm {...baseProps} />
    if (!type) return
    return (
        <Form.Stack layout="horizontal">
            <Form.Group controlId={`goto-subform`}>
                <Form.Label className="w-40">Type</Form.Label>
                <Form.Text className="w-120 font-bold text-base">{type}</Form.Text>
            </Form.Group>
            {type == 'goto' && gotoForm}
            {type == 'loop' && loopForm}
            {type == 'tempo' && gradualForm}
            <ConditionForm type={type} {...baseProps} />
        </Form.Stack>
    )
}
