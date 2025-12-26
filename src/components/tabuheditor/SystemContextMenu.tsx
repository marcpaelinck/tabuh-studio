import { type RefObject, type SyntheticEvent } from 'react'
import { IoSaveOutline } from 'react-icons/io5'
import { Menu } from 'rsuite'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import type { EditorSystemData } from '../../models/types'

export function SystemContextMenu({
    data,
    systemData,
    update,
    ref,
    ...props
}: {
    data: EditorSystemData[]
    systemData: EditorSystemData
    update: (sysData: EditorSystemData, sysIdx?: number) => void
    ref: RefObject<OverlayTriggerHandle>
}) {
    // const ref = useRef<HTMLDivElement>(null)

    const handleSelect = (eventKey: string | number | undefined, event: SyntheticEvent<Element, Event>) => {
        event.stopPropagation()
        ref.current.close()
        switch (eventKey) {
            case 1: {
                return
            }
            case 2: {
                return
            }
            case 3:
            case 4: {
                const index = data.findIndex((sysData) => sysData.id == systemData.id)
                if (!index) console.error(`system id ${systemData.id} not found.`)
                else update(systemData, index)
                return
            }
            case 4: {
                return
            }
            case 5: {
                return
            }
            case 6: {
                return
            }
        }
    }

    return (
        <Menu onSelect={handleSelect}>
            <Menu.Item disabled eventKey={1}>
                Add empty above
            </Menu.Item>
            <Menu.Item disabled eventKey={2}>
                Add empty below
            </Menu.Item>
            <Menu.Item eventKey={3}>Add copy above</Menu.Item>
            <Menu.Item eventKey={4}>Add copy below</Menu.Item>
            <Menu.Separator />
            <Menu.Item disabled eventKey={5}>
                Mark as template
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item disabled eventKey={6} icon={<IoSaveOutline />}>
                Save changes
            </Menu.Item>
        </Menu>
    )
}
