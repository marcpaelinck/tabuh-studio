// The dashboard is a row of buttons and icons on top of the TabuhEditor.
// The icons give status information and warnings and can be switched on or off.

import _ from 'lodash'
import type { IconType } from 'react-icons/lib'
import { TbInfinity } from 'react-icons/tb'
import { Tooltip, Whisper } from 'rsuite'
import { tsBlue } from '../../config/config'

export type WarningType = 'cycle'
export type Level = 'info' | 'warning' | 'error'
const defaultColor = tsBlue
const colors = { info: 'green', warning: 'amber', error: 'red' }

interface DashboardValue {
    visible: boolean
    level?: Level
    tooltip: string
}
export type DashboardValues = Record<WarningType, DashboardValue>

interface DashboardElementType {
    icon: IconType
    color?: string
}

// ---------- DASHBOARD DEFINITION --------------
const dashboardElements: Record<string, DashboardElementType> = { cycle: { icon: TbInfinity } }
// ----------------------------------------------

interface WarningProps extends DashboardValue {
    name: string
}
function Warning({ name, visible, level, tooltip }: WarningProps) {
    const Icon: IconType = dashboardElements[name].icon
    const color = dashboardElements[name].color || (level ? colors[level] : defaultColor)
    return (
        <>
            {visible && (
                <Whisper
                    trigger="hover"
                    placement="autoHorizontalStart"
                    controlId={`control-id-Whisper`}
                    speaker={<Tooltip>{tooltip}</Tooltip>}>
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
                <Warning
                    key={name}
                    name={name}
                    visible={values.visible}
                    level={values.level}
                    tooltip={values.tooltip}
                />
            ))}
        </>
    )
}
