import { type Dispatch } from 'react'
import type { CheckPickerProps, FormControlProps, FormGroupProps } from 'rsuite'
import { ArrayType, BooleanType, CheckPicker, Form, InputPicker, NumberType, SchemaModel, StringType } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { ExecutionItemType } from '../../models/types'

const formModel = { type: 'type', targetuuid: 'targetuuid', count: 'count', passes: 'passes', each: 'each' }
const model = SchemaModel({
    type: StringType().isRequired(),
    targetuuid: StringType().isRequired(),
    passes: ArrayType().of(NumberType()).isRequiredOrEmpty(),
    each: BooleanType().isRequiredOrEmpty()
})

// GENERIC FIELD COMPONENTS

interface PickerFieldProps
    extends FormControlProps, FormGroupProps, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    data: any
    label: string
    selectedElement: number | undefined
    setDirty: Dispatch<boolean>
}
// Selection (single or multiple)
const PickerField = ({ label, selectedElement, setDirty, ...props }: PickerFieldProps) => {
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

interface InputFieldProps
    extends FormControlProps, FormGroupProps, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    label: string
    selectedElement: number | undefined
    setDirty: Dispatch<boolean>
}
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

// COMMON PART: CONDITION

interface ConditionFormProps {
    selectedElement: number | undefined
    setDirty: Dispatch<boolean>
    pbInfo: Record<string, any>
}
// Form that captures the details of the selected item
const ConditionForm = ({ selectedElement, pbInfo, setDirty, ...props }: ConditionFormProps) => {
    return (
        <>
            <PickerField
                label="Condition"
                name={formModel.each}
                selectedElement={selectedElement}
                setDirty={setDirty}
                data={[
                    { label: 'none', value: undefined },
                    { label: 'after pass(es) nr ...', value: false },
                    { label: 'after every ...th pass', value: true }
                ]}
            />
            {pbInfo.each != undefined && (
                <PickerField
                    accepter={CheckPicker}
                    label="Passes"
                    name={formModel.passes}
                    selectedElement={selectedElement}
                    countable={false}
                    setDirty={setDirty}
                    data={new Array(20).fill(null).map((_, idx) => {
                        return { label: `${idx + 1}`, value: idx + 1 }
                    })}
                />
            )}
        </>
    )
}

interface GotoFormProps {
    selectedElement: number | undefined
    gotoInfo: Record<string, any>
    sysOptions: InputOption<string>[]
    setDirty: Dispatch<boolean>
}
const GoToForm = ({ selectedElement, gotoInfo, sysOptions, setDirty, ...props }: GotoFormProps) => {
    return (
        <>
            {' '}
            <Form.Group controlId={`goto-subform`}>
                <Form.Label className="w-40">Type</Form.Label>
                <Form.Text className="w-120 font-bold text-base">go to</Form.Text>
            </Form.Group>
            <PickerField
                label="Target system"
                name={formModel.targetuuid}
                selectedElement={selectedElement}
                setDirty={setDirty}
                data={sysOptions || []}
                placeholder={'System to go to'}
            />
        </>
    )
}

interface LoopFormProps {
    selectedElement: number | undefined
    loopInfo: Record<string, any>
    setDirty: Dispatch<boolean>
}
const LoopForm = ({ selectedElement, loopInfo, setDirty, ...props }: LoopFormProps) => {
    return (
        <>
            {' '}
            <Form.Group controlId={`goto-subform`}>
                <Form.Label className="w-40">Type</Form.Label>
                <Form.Text className="w-120 font-bold text-base">loop</Form.Text>
            </Form.Group>
            <InputField
                label="Loop count"
                name={formModel.count}
                itemInfo={loopInfo.count}
                selectedElement={selectedElement}
                setDirty={setDirty}
                placeholder={'Iterations'}
            />
        </>
    )
}

interface ExecutionItemFormProps {
    type: ExecutionItemType | undefined
    selectedElement: number | undefined
    itemInfo: Record<string, any>
    sysOptions: InputOption<string>[]
    setDirty: Dispatch<boolean>
}
// Contains the details of a specific Execution item.
export default function ExecutionItemForm({
    type,
    selectedElement,
    itemInfo,
    sysOptions,
    setDirty,
    ...props
}: ExecutionItemFormProps) {
    const gotoForm = (
        <GoToForm
            selectedElement={selectedElement}
            gotoInfo={itemInfo}
            sysOptions={sysOptions}
            setDirty={setDirty}
            {...props}
        />
    )
    const loopForm = <LoopForm selectedElement={selectedElement} loopInfo={itemInfo} setDirty={setDirty} {...props} />

    return (
        <Form.Stack layout="horizontal">
            {type == 'goto' && gotoForm}
            {type == 'loop' && loopForm}
            {type && (
                <ConditionForm selectedElement={selectedElement} pbInfo={itemInfo} setDirty={setDirty} {...props} />
            )}
        </Form.Stack>
    )
}
