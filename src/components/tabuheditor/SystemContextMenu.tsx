import { type RefObject, type SyntheticEvent } from 'react'
import { IoSaveOutline } from 'react-icons/io5'
import { Menu } from 'rsuite'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import type { EditorSystemData } from '../../models/types'

export function SystemContextMenu({
    data,
    ref,
    ...props
}: {
    data: EditorSystemData
    ref: RefObject<OverlayTriggerHandle>
}) {
    // const ref = useRef<HTMLDivElement>(null)

    const handleSelect = (eventKey: string | number | undefined, event: SyntheticEvent<Element, Event>) => {
        event.stopPropagation()
        console.log(eventKey)
        ref.current.close()
    }

    return (
        <Menu onSelect={handleSelect}>
            <Menu.Item eventKey={1}>Add system above</Menu.Item>
            <Menu.Item eventKey={2}>Add system below</Menu.Item>
            <Menu.Item eventKey={3}>Add copy above</Menu.Item>
            <Menu.Item eventKey={4}>Add copy below</Menu.Item>
            <Menu.Separator />
            <Menu.Item eventKey={5}>Mark as template</Menu.Item>
            <Menu.Separator />
            <Menu.Item eventKey={6} icon={<IoSaveOutline />}>
                Save changes
            </Menu.Item>
        </Menu>
    )
}
