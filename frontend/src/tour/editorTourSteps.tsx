// Introductory "Editor" tour. Runs the shared setup prologue (close/open/orchestra/selectScore —
// see tourShared.ts), switches to the Editor, then walks through the editor screen. Most steps are
// informational (Next button). A few ask the user to act and auto-advance on real app state:
// switching to the Editor (mainView), clicking in the first system's notation (a published click
// counter), and toggling Expand off (showExpansion). Two steps are inherently Next-driven because
// their state isn't globally observable: hovering the staff label, and the Modify… dialog. The
// "click the execution button" step is also Next-driven, since opening its Drawer would cover the
// tour overlay.
//
// Assumptions (data-dependent): the loaded score (Cendrawasih / GONG KEBYAR) has at least two
// systems, the first system's first line spans 5 positions, and it contains sangsih instruments
// (for the kempyung note). See CLAUDE.user-onboarding.md — dedicated read-only tour scores are
// planned so these always hold.

import { Tooltip, Whisper } from 'rsuite'
import type { MainView } from '../stores/useUserSettingsStore'
import { actionStep, setupSteps, type SetupSnapshot, type TourStepDef } from './tourShared'

/** Live snapshot passed to the Editor tour's per-step advance predicates. */
export interface EditorSnapshot extends SetupSnapshot {
    /** Player vs Editor top-level view. */
    mainView: MainView
    /** Expanded-preview toggle (editor state). */
    showExpansion: boolean
    /** Monotonic count of clicks in the first system's notation. */
    editorNotationClicks: number
    /** editorNotationClicks captured when the current "click in notation" step was entered. */
    editorNotationBaseline: number
}

// A hover/click glossary chip for the word "position", shown inline in a step's content.
function PositionTerm() {
    return (
        <Whisper
            trigger={['hover', 'click']}
            placement="top"
            speaker={
                <Tooltip>
                    A <b>position</b> is a player's part in the orchestra
                    <br />
                    (e.g. pemade polos, kantilan sangsih, reyong position 1, ugal).
                    <br />
                    Several positions can share a single notation line in the compact view.
                </Tooltip>
            }>
            <span className="underline decoration-dotted cursor-help text-blue-600">position</span>
        </Whisper>
    )
}

const editorSteps: TourStepDef<EditorSnapshot>[] = [
    {
        // Switch to the Editor (auto-skips if already there).
        id: 'switchToEditor',
        step: actionStep({
            target: '[data-tour="view-toggle"]',
            title: 'Open the Editor',
            content: 'Switch the view selector to the Editor.',
            placement: 'left'
        }),
        advanceWhen: (s) => s.mainView.toLowerCase() === 'editor'
    },
    {
        id: 'toolbar',
        step: {
            target: '[data-tour="editor-toolbar"]',
            title: 'Editor toolbar',
            content:
                'These selectors control the editor view: Compact vs Expanded, the Expand preview, and the Typing mode. We’ll come back to Expand and Typing.',
            placement: 'bottom'
        }
    },
    {
        id: 'systems',
        step: {
            target: '[data-tour="editor-system-4"]',
            title: 'Systems',
            content: 'The score is a stack of systems (gongan). This is system #4, shown as an example.',
            placement: 'top',
            scrollOffset: 200
        }
    },
    {
        id: 'systemControls',
        step: {
            target: '[data-tour="editor-system-4-controls"]',
            title: 'System controls',
            content:
                'Each system has a control bar (the buttons and fields here) above its notation. More on these shortly.',
            placement: 'bottom',
            scrollOffset: 200
        }
    },
    {
        id: 'positionLabels',
        step: {
            target: '[data-tour="editor-system-4-staff-label"]',
            title: 'Position labels',
            content: 'On the left of each notation line is its label — the position(s) that line belongs to.',
            placement: 'right',
            scrollOffset: 200
        }
    },
    {
        id: 'notationArea',
        step: {
            target: '[data-tour="editor-system-4-notation"]',
            title: 'Notation area',
            content: 'To the right of the labels is the notation itself — the editable notes of the system.',
            placement: 'top',
            scrollOffset: 200
        }
    },
    {
        id: 'compactView',
        step: {
            target: '[data-tour="editor-view"]',
            title: 'The Compact view',
            content: (
                <div>
                    <p>
                        This is the <b>Compact</b> view — the editing view. It’s “compact” because one line can combine
                        the notation of several <PositionTerm />
                        s, even of different instruments, into a single line.
                    </p>
                </div>
            ),
            placement: 'bottom'
        }
    },
    {
        id: 'hoverLabel',
        step: {
            target: '[data-tour="editor-system-4-staff-label"]',
            title: 'One line, many positions',
            content:
                'Hover over this staff label. Its tooltip shows that this single notation line applies to 5 positions.',
            placement: 'right',
            scrollOffset: 200
        }
    },
    {
        id: 'clickNotation',
        step: actionStep({
            target: '[data-tour="editor-system-4-notation"]',
            title: 'Expand a line',
            content:
                'Click anywhere in this system’s notation. A read-only expanded preview appears under the cursor line: each position now gets its own staff. ' +
                "Notice that in the 'Gangsa+Ugal\` line the sangsih instruments show different notes — their notation is automatically converted to the kempyung " +
                '(ngempat) notation. Explore as long as you like; the Next button appears once you’ve clicked.',
            placement: 'top',
            scrollOffset: 200,
            // No Next until the user has clicked (see gateNextWhen); Back/Skip stay available.
            buttons: ['back', 'skip']
        }),
        gateNextWhen: (s) => s.editorNotationClicks !== s.editorNotationBaseline
    },
    {
        id: 'modifyStaff',
        step: {
            target: '[data-tour="editor-system-4-staff-label"]',
            title: 'Modify a staff',
            content:
                'Click this position label and choose “Modify…”. You can add or remove positions from the line there. Have a look, then click Done to close it and continue. ' +
                "Don't worry, any change you make won't be saved.",
            placement: 'bottom',
            scrollOffset: 200
        }
    },
    {
        id: 'hamburger',
        step: {
            target: '[data-tour="editor-system-4-menu"]',
            title: 'System menu',
            content: 'The system menu: create a new system, or copy, move, or delete this one.',
            placement: 'right',
            scrollOffset: 200
        }
    },
    {
        id: 'playback',
        step: {
            target: '[data-tour="editor-system-4-playback"]',
            title: 'System playback',
            content: 'Two playback buttons: play just this system, or play from this system to the end of the score.',
            placement: 'bottom',
            scrollOffset: 200
        }
    },
    {
        id: 'systemId',
        step: {
            target: '[data-tour="editor-system-4-id"]',
            title: 'System number',
            content: 'The system’s sequence number in the score.',
            placement: 'bottom'
        }
    },
    {
        id: 'systemLabel',
        step: {
            target: '[data-tour="editor-system-4-label"]',
            title: 'System label',
            content: 'An optional label. Labelled systems can be referenced when copying, or as targets of a “goto”.',
            placement: 'bottom'
        }
    },
    {
        id: 'execution',
        step: {
            target: '[data-tour="editor-system-4-execution"]',
            title: 'Execution items',
            content:
                'Execution items set the playing sequence, tempo, and dynamics for the system. Click the button to open the form and take a look, then close it and click Next.',
            placement: 'bottom'
        }
    },
    {
        id: 'kempli',
        step: {
            target: '[data-tour="editor-system-4-kempli"]',
            title: 'Kempli',
            content:
                'The kempli state for the system: on (with a beat frequency), off, or written out in the notation.',
            placement: 'bottom'
        }
    },
    {
        id: 'expandDemo',
        step: actionStep({
            target: '[data-tour="editor-system-4-notation"]',
            title: 'The Expand preview',
            content:
                'The Expand toggle (top toolbar) is ON. Click in the first system’s notation — the expanded preview appears under the cursor line.',
            placement: 'top'
        }),
        gateNextWhen: (s) => s.editorNotationClicks !== s.editorNotationBaseline
    },
    {
        id: 'expandOff',
        step: actionStep({
            target: '[data-tour="editor-expand"]',
            title: 'Turn Expand off',
            content:
                'Now switch the Expand toggle OFF and click in the notation again — the preview is gone. Expand only changes what you see, never the score.',
            placement: 'bottom'
        }),
        advanceWhen: (s) => s.showExpansion === false
    },
    {
        id: 'noExpandDemo',
        step: {
            target: '[data-tour="editor-system-4-notation"]',
            title: 'Expand view locked',
            content: 'Click again in the first system’s notation — the expand view is now locked.',
            placement: 'top'
        }
    },
    {
        id: 'typing',
        step: {
            target: '[data-tour="editor-typing"]',
            title: 'Typing mode',
            content:
                'The Typing toggle switches between insert (INS) and overwrite (OVR) while you type notation — insert pushes notes right, overwrite replaces them.',
            placement: 'bottom'
        }
    },
    {
        id: 'deeperTour',
        step: {
            target: '[data-tour="editor-toolbar"]',
            title: 'That’s the tour',
            content:
                'That’s the editor at a glance. There’s a more in-depth editor tour that walks through every feature in detail.',
            placement: 'bottom'
        }
    }
]
// console.log(editorSteps.map((s) => `${s.id} | ${s.step.target} | ${s.step.title}`))

export const editorTourSteps: TourStepDef<EditorSnapshot>[] = [...setupSteps, ...editorSteps]
