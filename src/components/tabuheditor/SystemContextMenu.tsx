import { useState, type Dispatch, type RefObject, type SyntheticEvent } from 'react'
import { IoCloseCircleOutline, IoSaveOutline } from 'react-icons/io5'
import { Menu, useDialog } from 'rsuite'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import type { EditorSystemData } from '../../models/types'
import { v4 as uuidv4 } from 'uuid'
import _ from 'lodash'
import { debug } from '../../utils/debugger'
import SelectionModal from '../SelectionModal'

export function SystemContextMenu({
    data,
    systemData,
    setData,
    labels,
    setLabels: setTemplates,
    whisperRef,
    ...props
}: {
    data: EditorSystemData[] // complete music notation
    systemData: EditorSystemData // notation of current system
    setData: Dispatch<EditorSystemData[]> // updates music notation
    labels: Record<string, EditorSystemData>
    setLabels: Dispatch<Record<string, EditorSystemData>> // updates music notation
    whisperRef: RefObject<OverlayTriggerHandle>
}) {
    // const ref = useRef<HTMLDivElement>(null)
    const dialog = useDialog()

    // Lets the user select a labelled system

    function SysLabelSelector(
        {
            onClose
        }: {
            onClose: (selected: string | null) => string
        } /*{ onClose }: { onClose: (result: string | null) => string }*/
    ) {
        const [isOpen, setIsOpen] = useState(true)

        return (
            <>
                <SelectionModal
                    title="Choose an instrument"
                    message="Pick one from the list"
                    options={Object.keys(labels).map((key) => {
                        return { label: key, value: key }
                    })}
                    isOpen={isOpen}
                    onSelect={(value) => {
                        onClose(value)
                        setIsOpen(false)
                    }}
                    onCancel={() => setIsOpen(false)}
                />
            </>
        )
    }

    // Executes changes according to the selected action from the menu
    async function updateData(eventKey: string | number | undefined, event: SyntheticEvent<Element, Event>) {
        event.stopPropagation() // Avoid click to propagate to whatever is underneath the popup menu
        whisperRef.current.close() // close the menu
        if (typeof eventKey != 'string') return // to appease TypeScript
        const [action, source, where] = eventKey.split(',')

        // Used for insertion and update
        var newSysData: EditorSystemData | null = null
        // Used for insertion and deletion
        var sliceIndex1: number | null = null
        var sliceIndex2: number | null = null

        switch (action) {
            case 'new': {
                // Create a copy of the source system.
                // TODO: Currently when source==blank, the current system's structure is copied.

                if (source == 'label') {
                    // Let the user select the label of the system that should be copied.
                    const label: string = await dialog.open(SysLabelSelector)
                    if (!label) return
                    newSysData = _.cloneDeep(labels[label])
                    newSysData.label = label
                } else newSysData = _.cloneDeep(systemData)
                if (!newSysData) return // TODO remove when blanks are created from 'scratch'.

                newSysData.key = uuidv4()
                if (source == 'current') newSysData.part += ' (copy)'

                // Reset the edit buffers of the measures.
                // Also clear the values in case action=='new'
                Object.values(newSysData.staffs).forEach((measures) => {
                    measures.forEach((measure) => {
                        measure.notation_ = undefined
                        if (source == 'blank') measure.notation = []
                    })
                })
                sliceIndex1 = where == 'above' ? systemData.id : systemData.id + 1
                sliceIndex2 = where == 'above' ? systemData.id : systemData.id + 1
                break
            }
            case 'label': {
                event.target.dispatchEvent(new Event('close'))
                const name = await dialog.prompt('Label:', {
                    title: 'Add a label',
                    defaultValue: '',
                    validate: (value) => {
                        const isValid = value.length > 0 && !(value in labels)
                        return [isValid, 'This name is already in use.']
                    }
                })
                if (typeof name === 'string') {
                    systemData.label = name
                    setTemplates({ ...labels, ...Object.fromEntries([[name, systemData]]) })
                }
                sliceIndex1 = systemData.id
                sliceIndex2 = systemData.id
                return
            }
            case 'save': {
                newSysData = _.cloneDeep(systemData)
                Object.values(newSysData.staffs).forEach((measures) => {
                    measures.forEach((measure) => {
                        if (measure.notation_) {
                            measure.notation = measure.notation_
                            measure.notation_ = undefined
                        }
                    })
                })
                sliceIndex1 = systemData.id
                sliceIndex2 = systemData.id + 1
                break
            }
            case 'delete': {
                sliceIndex1 = systemData.id
                sliceIndex2 = systemData.id + 1
                break
            }
            default: {
                console.error(`Unexpected action ${action} ignored.`)
                return
            }
        }
        const newData = newSysData
            ? [...data.slice(0, sliceIndex1), newSysData, ...data.slice(sliceIndex2)]
            : [...data.slice(0, sliceIndex1), ...data.slice(sliceIndex2)]
        // Update all system IDs
        newData.forEach((sysData, sysIdx) => (sysData.id = sysIdx))
        debug(newSysData, SystemContextMenu.name)
        debug(data, SystemContextMenu.name)
        debug(newData, SystemContextMenu.name)
        setData(newData)
    }

    return (
        <Menu onSelect={updateData}>
            <Menu.Item eventKey={'new,blank,above'}>Insert new above</Menu.Item>
            <Menu.Item eventKey={'new,blank,below'}>Insert new below</Menu.Item>
            <Menu.Item eventKey={'new,current,above'}>Insert copy above</Menu.Item>
            <Menu.Item eventKey={'new,current,below'}>Insert copy below</Menu.Item>
            <Menu.Separator />
            <Menu.Item eventKey={'label,new'}>Add label</Menu.Item>
            <Menu.Item eventKey={'label,delete'}>Remove label</Menu.Item>
            <Menu.Item eventKey={'new,label,above'}>Copy labeled above</Menu.Item>
            <Menu.Item eventKey={'new,label,below'}>copy labeled below</Menu.Item>
            <Menu.Separator />
            <Menu.Item eventKey={'delete'} icon={<IoCloseCircleOutline color="red" />}>
                Delete
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item eventKey={'save'} icon={<IoSaveOutline />}>
                Save changes
            </Menu.Item>
        </Menu>
    )
}
