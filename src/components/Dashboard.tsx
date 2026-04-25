// The dashboard is a row of buttons and warning icons on top of the TabuhEditor.
// The icons give status information and warnings and can be switched on or off.

import _ from 'lodash'
import { BsDatabase, BsFileEarmarkMusic } from 'react-icons/bs'
import { IoReload } from 'react-icons/io5'
import type { IconType } from 'react-icons/lib'
import { HStack, Tooltip, Whisper } from 'rsuite'
import { debug } from '../utils/debugger'

export type ComponentName = 'cycle' | 'score' | 'localCache'

export type ComponentType = 'icon' | 'text'
export type Level = 'info' | 'warning' | 'error'
const defaultColor = 'black'
const colors = { default: 'black', info: 'green', warning: 'amber', error: 'red' }

export interface DashboardComponentValues {
    visible: boolean
    text?: string
    level?: Level
    tooltip?: string
}
export type DashboardValues = Record<ComponentName, DashboardComponentValues>

interface DashboardElementType {
    type: ComponentType
    icon: IconType
    tooltips: Partial<Record<Level, string>>
    color?: string
}

// ---------- DASHBOARD DEFINITION AND DEFAULTS --------------
const dashboardElements: Record<ComponentName, DashboardElementType> = {
    score: { type: 'text', icon: BsFileEarmarkMusic, tooltips: { info: 'Score info' } },
    cycle: { type: 'icon', icon: IoReload, tooltips: { info: 'There is a cycle, check the goto instructions.' } },
    localCache: {
        type: 'icon',
        icon: BsDatabase,
        tooltips: {
            info:
                'Local storage is enabled.\n' +
                'You will be able to retrieve your work if you inadvertently\n' +
                'close the application without saving your changes.',
            warning:
                'Tabuh Studio can not access local storage.\n' +
                'You will not be able to retrieve your work if you\n' +
                'close the application without saving your changes.',
            error: 'Could not save data to the local storage.'
        }
    }
}
export const dashboardDefaults: DashboardValues = {
    score: { visible: false },
    cycle: { visible: false },
    localCache: { visible: false }
}
// -----------------------------------------------------------

const erroranimation = { animation: 'ts-blink 2s linear infinite' }

interface ComponentProps extends DashboardComponentValues {
    name: ComponentName
}
function Component({ name, visible = true, level = 'info', text, tooltip }: ComponentProps) {
    const Icon = dashboardElements[name].icon
    const color = dashboardElements[name].color || (level ? colors[level] : defaultColor)
    const defaultTooltip = dashboardElements[name].tooltips[level] || ''
    debug(`${JSON.stringify({ name, visible, level, text, tooltip })}`)
    return (
        <>
            {visible && (
                <Whisper
                    trigger="hover"
                    placement="autoVerticalStart"
                    controlId={`control-id-Whisper`}
                    className="mytooltip"
                    // whitespace-pre-line interprets \n as new line
                    speaker={<Tooltip className="whitespace-pre-line">{tooltip || defaultTooltip}</Tooltip>}>
                    <HStack className="bg-gray-200 rounded-md p-1">
                        <Icon color={color} className={`text-[1rem]`} style={level == 'error' ? erroranimation : {}} />
                        {text && <div>{text}</div>}
                    </HStack>
                </Whisper>
            )}
        </>
    )
}

export interface DashboardProps {
    values: DashboardValues
}
export function Dashboard({ values: dashboardValues }: DashboardProps) {
    debug(dashboardValues)
    return (
        <HStack spacing={8}>
            {_.toPairs(dashboardValues).map(([name, values]) => (
                <Component
                    key={name}
                    name={name as ComponentName}
                    visible={values.visible}
                    text={values.text}
                    level={values.level}
                    tooltip={values.tooltip}
                />
            ))}
        </HStack>
    )
}
