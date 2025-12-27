import { type Dispatch, type RefObject, type SyntheticEvent } from 'react'
import { IoCloseCircleOutline, IoSaveOutline } from 'react-icons/io5'
import { Menu, useDialog } from 'rsuite'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import type { EditorSystemData } from '../../models/types'
import { v4 as uuidv4 } from 'uuid'
import _ from 'lodash'
import { debug } from '../../utils/debugger'

export function SystemContextMenu({
    data,
    systemData,
    setData,
    templates,
    setTemplates,
    ref,
    ...props
}: {
    data: EditorSystemData[] // complete music notation
    systemData: EditorSystemData // notation of current system
    setData: Dispatch<EditorSystemData[]> // updates music notation
    templates: Record<string, EditorSystemData>
    setTemplates: Dispatch<Record<string, EditorSystemData>> // updates music notation
    ref: RefObject<OverlayTriggerHandle>
}) {
    // const ref = useRef<HTMLDivElement>(null)
    const dialog = useDialog()

    // Executes changes according to the selected action from the menu
    async function updateData(eventKey: string | number | undefined, event: SyntheticEvent<Element, Event>) {
        event.stopPropagation()
        if (typeof eventKey != 'string') return // to appease TypeScript
        const [action, source, where] = eventKey.split(',')

        var newSysData: EditorSystemData | null = _.cloneDeep(systemData)
        var sliceIndex1 = systemData.id
        var sliceIndex2 = systemData.id

        switch (action) {
            case 'new': {
                newSysData.key = uuidv4()
                if (source != 'blank') newSysData.part += ' ( copy)'
                // Reset the edit buffers of the measures.
                // Also clear the values in case action=='new'
                Object.values(newSysData.staffs).forEach((measures) => {
                    measures.forEach((measure) => {
                        measure.notation_ = undefined
                        if (source == 'blank') measure.notation = []
                    })
                })
                if (where == 'below') {
                    sliceIndex1 = systemData.id + 1
                    sliceIndex2 = systemData.id + 1
                }
                break
            }
            case 'mark': {
                event.target.dispatchEvent(new Event('close'))
                const name = await dialog.prompt('Template name:', {
                    title: 'Mark as a template',
                    defaultValue: '',
                    validate: (value) => {
                        const isValid = value.length > 0 && !(value in templates)
                        return [isValid, 'This name is already in use.']
                    }
                })
                if (typeof name === 'string') {
                    setTemplates({ ...templates, ...Object.fromEntries([[name, systemData]]) })
                }
                return
            }
            case 'save': {
                Object.values(newSysData.staffs).forEach((measures) => {
                    measures.forEach((measure) => {
                        if (measure.notation_) {
                            measure.notation = measure.notation_
                            measure.notation_ = undefined
                        }
                    })
                })
                sliceIndex2 = systemData.id + 1
                break
            }
            case 'delete': {
                sliceIndex2 = systemData.id + 1
                newSysData = null
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
            <Menu.Item eventKey={'mark'}>Mark as template</Menu.Item>
            <Menu.Item disabled eventKey={'new,template,above'}>
                Copy template above
            </Menu.Item>
            <Menu.Item disabled eventKey={'new,template,below'}>
                copy template below
            </Menu.Item>
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
