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
    setLabels,
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
                    title="Insert copy from labeled system"
                    message="Select a label"
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
                    newSysData.label = undefined
                    newSysData.copyfromkey = labels[label].key
                    newSysData.copyfrom = label
                } else newSysData = _.cloneDeep(systemData)
                if (!newSysData) return // TODO remove when blanks are created from 'scratch'.

                newSysData.key = uuidv4()
                if (source == 'current') {
                    newSysData.copyfromkey = systemData.key
                    newSysData.copyfrom = systemData.label || `#${systemData.id}`
                }

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
                // newSysData = _.cloneDeep(systemData)
                if (source == 'create') {
                    const name = await dialog.prompt('Label:', {
                        title: 'Add a label',
                        defaultValue: '',
                        validate: (value) => {
                            const isValid = value.length > 0 && !(value in labels)
                            return [isValid, 'This name is already in use.']
                        }
                    })
                    if (typeof name === 'string') {
                        // Remove any existing label for this system from the labels list (should not be necessary)
                        const cleanedLabels = Object.fromEntries(
                            Object.entries(labels).filter(
                                ([label, value]) => label !== systemData.label && value != systemData
                            )
                        )
                        // Assign label and update labels list
                        systemData.label = name
                        setLabels({ ...cleanedLabels, ...Object.fromEntries([[name, systemData]]) })
                    }
                } else {
                    if (systemData.label) {
                        if (systemData.label in labels) {
                            // Update labels list
                            const newLabels = Object.fromEntries(
                                Object.entries(labels).filter(
                                    ([label, value]) => label !== systemData.label && value != systemData
                                )
                            )
                            setLabels(newLabels)
                            // Remove label
                            systemData.label = undefined
                        } else console.error(`System's label does not occur in the 'labels' list.`)
                    } else console.error(`Current system doesn't have any label`)
                }
                // sliceIndex1 = systemData.id
                // sliceIndex2 = systemData.id + 1
                debug(systemData.label, SystemContextMenu.name)
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
        setData(newData)
    }

    const hasLabel = typeof systemData.label == 'string'

    return (
        <Menu
            onSelect={updateData}
            onClick={(e) => {
                debug(systemData.label, SystemContextMenu.name)
                e.stopPropagation()
                whisperRef.current.close()
            }}>
            <Menu.Item eventKey={'new,blank,above'} children="Insert new above" />
            <Menu.Item eventKey={'new,blank,below'} children="Insert new below" />
            <Menu.Item eventKey={'new,current,above'} children="Insert copy above" />
            <Menu.Item eventKey={'new,current,below'} children="Insert copy below" />
            <Menu.Separator />
            {!hasLabel && (
                <Menu.Item
                    disabled={typeof systemData.label == 'string'}
                    eventKey={'label,create'}
                    children="Add label"
                />
            )}
            {hasLabel && (
                <Menu.Item
                    disabled={systemData.label == undefined || systemData.label == null}
                    eventKey={'label,remove'}
                    children="Remove label"
                />
            )}
            <Menu.Item eventKey={'new,label,above'} children="Copy labeled above" />
            <Menu.Item eventKey={'new,label,below'} children="copy labeled below" />
            <Menu.Separator />
            <Menu.Item eventKey={'delete'} icon={<IoCloseCircleOutline color="red" />} children="Delete" />
            <Menu.Separator />
            <Menu.Item eventKey={'save'} icon={<IoSaveOutline />} children="Save changes" />
        </Menu>
    )
}
