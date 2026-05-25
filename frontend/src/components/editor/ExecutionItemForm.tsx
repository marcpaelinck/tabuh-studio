import _ from 'lodash'
import { useRef, useState, type Dispatch, type ElementType, type SyntheticEvent } from 'react'
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
import type { DynamicsValue, ExecutionItemType } from '../../typing/execution'
import { debug } from '../../utils/debugger'

export type FlowConditionType = 'pass' | 'nthpass' | 'iteration'

export interface FormValueType {
    type: ExecutionItemType | ''
    targetuuid?: string
    count?: number
    seconds?: number
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
}

// Auxiliary function for the form schema model.
// Enables to set a field requirement that depend on the value of other fields in the form.
// E.g. field 'seconds' is required if field 'type' has the value 'wait'.
// Returns a validation function that can be passed to a when clause.
// conditions: field->value pairs.
//             - The requirement is active if each field has the given value (AND).
//             - If the value is an array, the field can have any of the listed values (OR).
//             - If the field itself is an array, it should contain the value, or one of its
//               elements if value is an array.
// requirement: requirement for the field being checked: currently 'isRequired' or 'notEmpty' (array).
// RequiredType: the current field's required type.
const If = (
    ifAll: { [field: string]: any | any[] },
    requirement: 'isRequired' | 'notEmpty',
    RequiredType: CallableFunction,
    message?: string
) => {
    function compare(a: any, b: any) {
        if (Array.isArray(b)) {
            return b.some((bval) => (Array.isArray(a) ? a.includes(bval) : a == b))
        } else return Array.isArray(a) ? a.includes(b) : a == b
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

export const formModel = SchemaModel({
    type: StringType().isOneOf(['goto', 'loop', 'wait', 'tempo', 'dynamics']).isRequired(),
    targetuuid: StringType().when(If({ type: 'goto' }, 'isRequired', StringType)),
    count: NumberType()
        .when(If({ type: 'loop' }, 'isRequired', NumberType))
        .isInteger(),
    seconds: NumberType().when(If({ type: 'wait' }, 'isRequired', NumberType)),
    fromBPM: NumberType().isInteger(),
    toBPM: NumberType()
        .isInteger()
        .when(If({ type: 'tempo' }, 'isRequired', NumberType)),
    fromDynamics: StringType(),
    toDynamics: StringType().when(If({ type: 'dynamics' }, 'isRequired', StringType)),
    fromSection: NumberType()
        .isInteger()
        .when(If({ isGradual: true }, 'isRequired', NumberType)),
    toSection: NumberType()
        .isInteger()
        .when(If({ type: ['tempo', 'dynamics'] }, 'isRequired', NumberType)),
    isGradual: BooleanType().when(If({ type: ['tempo', 'dynamics'] }, 'isRequired', BooleanType)),
    passes: ArrayType()
        .of(NumberType())
        .when(If({ conditions: ['pass', 'nthpass'] }, 'notEmpty', ArrayType)),
    iterations: ArrayType()
        .of(NumberType())
        .when(If({ conditions: ['iteration'] }, 'notEmpty', ArrayType)),
    conditions: ArrayType().of(StringType().isOneOf(['pass', 'nthpass', 'iteration']))
})

const formFieldNames = {
    type: 'type',
    targetuuid: 'targetuuid',
    count: 'count',
    seconds: 'seconds',
    fromBPM: 'fromBPM',
    toBPM: 'toBPM',
    fromDynamics: 'fromDynamics',
    toDynamics: 'toDynamics',
    fromSection: 'fromSection',
    toSection: 'toSection',
    isGradual: 'isGradual',
    conditions: 'conditions',
    passes: 'passes',
    iterations: 'iterations'
}

const emptyForm = {
    type: '',
    targetuuid: undefined,
    count: undefined,
    seconds: undefined,
    fromBPM: undefined,
    toBPM: undefined,
    fromDynamics: undefined,
    toDynamics: undefined,
    fromSection: undefined,
    toSection: undefined,
    isGradual: undefined,
    conditions: undefined,
    passes: undefined,
    iterations: undefined
}

// GENERIC FIELD COMPONENTS

interface ExecutionBaseFieldProps extends Pick<FormGroupProps, 'controlId'>, Pick<FormControlProps, 'accepter'> {
    label?: string
    name?: string
    formValue: FormValueType
    setValueChanged: (formValue: FormValueType, event: SyntheticEvent<Element, Event> | undefined) => void
    loop: number | undefined
    selectedElement: number | undefined
}

interface PickerFieldProps
    extends Omit<ExecutionBaseFieldProps, 'loop'>, Pick<CheckPickerProps, 'placeholder' | 'countable'> {
    data: any
    onChange?: (event: Event) => void
}
// Selection (single or multiple)
const PickerField = ({ label, selectedElement, setValueChanged, formValue, onChange, ...props }: PickerFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={props.accepter || InputPicker}
                cleanable={false}
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
const InputField = ({ label, selectedElement, setValueChanged, formValue, ...props }: InputFieldProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                // onChange={setValueChanged}
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
    setValueChanged,
    formValue,
    ...props
}: RangeFieldProps) => {
    return (
        <Form.Stack layout="inline">
            <Form.Group className="items-start h-8" controlId={props.controlId}>
                <Form.Label className="w-40 h-2 pt-[0.5rem]">{labels[0]}</Form.Label>
                <Form.Control
                    // onChange={setValueChanged}
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
                    // onChange={setValueChanged}
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
const ToggleField = ({ label, selectedElement, setValueChanged, formValue, ...props }: CheckBoxProps) => {
    return (
        <Form.Group className="items-start h-8" controlId={props.controlId}>
            <Form.Label className="w-40 h-2 pt-[0.5rem]">{label}</Form.Label>
            <Form.Control
                accepter={Toggle}
                // onChange={setValueChanged}
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
    const afterOn = ['goto', 'wait'].includes(type) ? 'after' : 'on'
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
                    onChange={(event: Event) => debug(event)}
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
                    onChange={(event: Event) => debug(event)}
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

const LoopForm = ({ formValue, ...props }: ExecutionBaseFieldProps) => {
    return (
        <>
            <InputField
                label="Loop count"
                name={formFieldNames.count}
                formValue={formValue}
                placeholder={'Iterations'}
                {...props}
            />
        </>
    )
}

const WaitForm = ({ formValue, ...props }: ExecutionBaseFieldProps) => {
    return (
        <>
            <InputField
                label="Seconds"
                name={formFieldNames.seconds}
                formValue={formValue}
                placeholder={'Seconds'}
                {...props}
            />
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
    setFormValue: Dispatch<FormValueType>
    loop: number | undefined
    model: any
    // onChange: (value: Record<string, any>, event?: SyntheticEvent) => void
}
// Contains the details of a specific Execution item.
export default function ExecutionItemForm({
    type,
    selectedElement,
    formValue,
    sysOptions,
    setDirty,
    setFormValue,
    loop,
    model
    // onChange
}: ExecutionItemFormProps) {
    // Properties that will be passed down to each form type
    const formRef = useRef<any>(null)

    function isValid(formValue: FormValueType) {
        const checkResult = formModel.check(Object.assign(emptyForm, formValue))
        const returnValue = !_.values(checkResult).some((val) => val.hasError)
        return returnValue
    }

    function setValueChanged(value: Record<string, any>, event: SyntheticEvent<Element, Event> | undefined) {
        const newValue = value as FormValueType
        setFormValue(newValue)
        if (isValid(newValue)) {
            setDirty(true)
        }
    }

    const baseProps: ExecutionBaseFieldProps = { selectedElement, formValue, setValueChanged, loop }
    const gotoForm = <GoToForm sysOptions={sysOptions} {...baseProps} />
    const loopForm = <LoopForm {...baseProps} />
    const waitForm = <WaitForm {...baseProps} />
    const tempoForm = <TempoForm {...baseProps} />
    const dynamicsForm = <DynamicsForm {...baseProps} />
    if (!type) return

    return (
        <Form ref={formRef} model={model} onChange={setValueChanged} formValue={formValue}>
            <Form.Stack layout="horizontal">
                <Form.Group controlId={`goto-subform`}>
                    <Form.Label className="w-40">Type</Form.Label>
                    <Form.Text className="w-120 font-bold text-base">{type}</Form.Text>
                </Form.Group>
                {type == 'goto' && gotoForm}
                {type == 'loop' && loopForm}
                {type == 'wait' && waitForm}
                {type == 'tempo' && tempoForm}
                {type == 'dynamics' && dynamicsForm}
                <ConditionForm type={type} {...baseProps} />
            </Form.Stack>
        </Form>
    )
}
