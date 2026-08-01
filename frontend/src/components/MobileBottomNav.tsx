import type { JSX } from 'react'
import { BsBullseye, BsMusicNoteList, BsPlayCircle, BsSpeedometer2 } from 'react-icons/bs'
import type { MobileTab } from '../stores/useUserSettingsStore'

interface MobileBottomNavProps {
    active: MobileTab
    onChange: (tab: MobileTab) => void
    /** Current speed label (e.g. "70%"), shown in an accent colour next to "Speed". */
    speedValue: string
}

const ACTIVE = '#2196f3' // matches the app's accent blue
const INACTIVE = '#8e8e93'
const SPEED_ACCENT = '#e8590c'

const ITEMS: { tab: MobileTab; label: string; icon: JSX.Element }[] = [
    { tab: 'player', label: 'Player', icon: <BsPlayCircle /> },
    { tab: 'scores', label: 'Scores', icon: <BsMusicNoteList /> },
    { tab: 'focus', label: 'Focus', icon: <BsBullseye /> },
    { tab: 'speed', label: 'Speed', icon: <BsSpeedometer2 /> }
]

/**
 * VLC-style bottom navigation for the mobile layout: an icon + label per tab, the active
 * tab highlighted. The Speed tab appends the current speed in an accent colour. Bottom
 * padding respects the iOS home-indicator safe area.
 */
export function MobileBottomNav({ active, onChange, speedValue }: MobileBottomNavProps): JSX.Element {
    return (
        <nav role="tablist" className="flex border-t bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {ITEMS.map(({ tab, label, icon }) => {
                const isActive = active === tab
                return (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab)}
                        className="flex flex-1 flex-col items-center gap-0.5 py-2"
                        style={{ color: isActive ? ACTIVE : INACTIVE, background: 'none', border: 'none' }}>
                        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{icon}</span>
                        <span style={{ fontSize: '0.7rem' }}>
                            {label}
                            {tab === 'speed' && <span style={{ color: SPEED_ACCENT }}> {speedValue}</span>}
                        </span>
                    </button>
                )
            })}
        </nav>
    )
}
