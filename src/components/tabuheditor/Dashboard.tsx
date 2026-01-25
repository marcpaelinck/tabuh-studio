// The dashboard is a row of buttons and warning icons on top of the TabuhEditor.
// The icons give status information and warnings and can be switched on or off.

import _ from 'lodash'
import type { IconType } from 'react-icons/lib'
import { TbInfinity } from 'react-icons/tb'
import { Tooltip, Whisper } from 'rsuite'
import { tsBlue } from '../../config/config'

export type ComponentType = 'cycle'
export type Level = 'info' | 'warning' | 'error'
const defaultColor = tsBlue
const colors = { info: 'green', warning: 'amber', error: 'red' }

interface DashboardValue {
    visible: boolean
    level?: Level
    tooltip?: string
}
export type DashboardValues = Record<ComponentType, DashboardValue>

interface DashboardElementType {
    icon: IconType
    defaultTooltip: string
    color?: string
}

// ---------- DASHBOARD DEFINITION --------------
const dashboardElements: Record<ComponentType, DashboardElementType> = {
    cycle: { icon: TbInfinity, defaultTooltip: 'There is a cycle, check the goto instructions.' }
}
// ----------------------------------------------

interface ComponentProps extends DashboardValue {
    name: ComponentType
}
function Component({ name, visible, level, tooltip }: ComponentProps) {
    const Icon: IconType = dashboardElements[name].icon
    const color = dashboardElements[name].color || (level ? colors[level] : defaultColor)
    const defaultTooltip = dashboardElements[name].defaultTooltip
    return (
        <>
            {visible && (
                <Whisper
                    trigger="hover"
                    placement="autoHorizontalStart"
                    controlId={`control-id-Whisper`}
                    speaker={<Tooltip>{tooltip || defaultTooltip}</Tooltip>}>
                    <Icon color={color} className="text-[2rem]" />
                </Whisper>
            )}
        </>
    )
}

export interface DashboardProps {
    values: DashboardValues
}
export function Dashboard({ values: dashboardValues }: DashboardProps) {
    return (
        <>
            {_.toPairs(dashboardValues).map(([name, values]) => (
                <Component
                    key={name}
                    name={name as ComponentType}
                    visible={values.visible}
                    level={values.level}
                    tooltip={values.tooltip}
                />
            ))}
        </>
    )
}
