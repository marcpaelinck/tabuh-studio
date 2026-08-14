// Reusable tooltip helpers built on rsuite Whisper + Tooltip.
//   <Tip tip="…"><SomeControl/></Tip>   — wraps any single ref-forwarding element.
//   <NavItemTip tip="…" eventKey="…">…</NavItemTip>  — a Nav.Item with a hover tooltip
//     (rsuite Nav.Item has no built-in tooltip). Reads the Nav/Sidenav context normally.

import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { Nav, Tooltip, Whisper } from 'rsuite'

type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'autoVertical' | 'autoHorizontal'

interface TipProps {
    tip: ReactNode
    placement?: Placement
    children: ReactElement
}

// NOTE: the child must forward a DOM node as its ref. rsuite *Pickers* (SelectPicker, etc.)
// forward an imperative handle whose `overlay` getter throws when closed, which crashes here —
// wrap those in a plain <span> and tip the span instead of the picker.
export function Tip({ tip, placement = 'auto', children }: TipProps) {
    return (
        <Whisper placement={placement} trigger="hover" speaker={<Tooltip>{tip}</Tooltip>}>
            {/* The span element enables to nest another Whisper:
            a Whisper needs an HTML element as a direct child. */}
            <span style={{ display: 'inline-block' }}> {children}</span>
        </Whisper>
    )
}

type NavItemTipProps = ComponentProps<typeof Nav.Item> & { tip: ReactNode; placement?: Placement }

// Keep Nav.Item as the DIRECT child of Nav / Nav.Menu (rsuite inspects children by type to
// build the menu), and put the tooltip on the item's inner content instead of wrapping the item.
export function NavItemTip({ tip, placement = 'left', children, ...navItemProps }: NavItemTipProps) {
    return (
        <Nav.Item {...navItemProps}>
            <Whisper placement={placement} trigger="hover" speaker={<Tooltip>{tip}</Tooltip>}>
                <div className="w-full">{children}</div>
            </Whisper>
        </Nav.Item>
    )
}
