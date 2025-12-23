import { useRef, type RefObject } from 'react'
import { IoSaveOutline } from 'react-icons/io5'
import { Menu, Popover } from 'rsuite'
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

    const handleSelect = (eventKey: string | number | undefined) => {
        console.log(eventKey)
        ref.current.close()
    }

    return (
        <Menu onSelect={handleSelect}>
            <Menu.Item eventKey={1}>Add system above</Menu.Item>
            <Menu.Item eventKey={2}>Add system below</Menu.Item>
            <Menu.Separator />
            <Menu.Item eventKey={3} icon={<IoSaveOutline />}>
                Save changes
            </Menu.Item>
        </Menu>
    )
}
