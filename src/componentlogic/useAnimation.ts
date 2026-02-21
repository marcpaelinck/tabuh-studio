import { useCallback, type Dispatch, type RefObject } from 'react'
import * as Tone from 'tone'
import { animationConfig, colorPalette, type ColorName } from '../config/config'
import type {
    AnimationNote,
    HighlightRange,
    MenuItemInfo,
    ScheduleAnimationAction,
    SchedulePlayerCursorAction,
    SVGInfo
} from '../typing/types'
import { debug } from '../utils/debugger'

const moveToDuration = 500 // duration of the movement to the next key
const strikeDuration = 600 // duration of the stroke
const bezier = 'cubic-bezier(0,.25,1,.71)' // default timing curve
const bezierStroke = 'cubic-bezier(.99,-0.01,1,.51)' // timing curve for stroke (accelerates toward stroke)

// Retrieves the highlight color values [R, G, B] for the given note (instrument key).
// PositionSeq can be used in case multiple positions are animated on the same instrument. The corresponding color
// will then be selected from the list of colors, reusing the colors if positionSeq is larger than the number of
// available colors.
const getHighlightRGB = (note: AnimationNote, positionSeq: number = 0): number[] => {
    const colors: ColorName[] =
        animationConfig.highlight[note.tone] ||
        animationConfig.highlight[note.muting] ||
        Object.values(animationConfig.highlight)[0]
    if (!colors) return []
    var color_id = positionSeq % colors.length
    var colorName: ColorName = colors[color_id] as ColorName
    return colorPalette[colorName].rgb || []
}

async function highlightNote(keyElement: Element, note: AnimationNote, positionIndex: number) {
    const durationMillis = Math.min(Tone.Time(note.duration).toMilliseconds(), 3000)
    const rgb: number[] = getHighlightRGB(note, positionIndex)
    var highlightKeyframes = new KeyframeEffect(
        keyElement,
        [
            //TODO use colors from config
            { fill: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`, offset: 0, easing: bezier },
            { fill: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`, offset: 1, easing: bezier }
        ],
        { duration: durationMillis }
    )
    const animation = new Animation(highlightKeyframes, document.timeline)
    animation.play()
}

function animatePanggul(action: ScheduleAnimationAction, svgInfo: SVGInfo, pbSpeed: number) {
    var keyframes, options
    if (!action || !svgInfo.animation || !svgInfo.panggul || !svgInfo.x || svgInfo.y == null || !action.currnotes)
        return

    // Currently only one panggul can be animated
    var currKey = action.currnotes.length ? action.currnotes[0].keyname : Object.keys(svgInfo.x)[0] // E.g. 'DONG1'. This uniquely identifies a key
    var nextKey = action.nextnotes.length ? action.nextnotes[0].keyname : currKey

    if (action.currnotes.length > 0 && action.currnotes[0].isLast /*&& !this.dom.loopCheckbox.checked*/) {
        // Final animation: lift the hammer.
        debug('last note')
        keyframes = [
            {
                // Start where the previous animation ended: the moment the key is struck
                transform: `translate(${svgInfo.x[currKey] + svgInfo.animation.stroke_x}px, ${
                    svgInfo.y + svgInfo.animation.stroke_y
                }px) rotate(${svgInfo.animation.stroke_rotation}deg) scale(1, 1)`,
                offset: 0
            },
            // Step 1: move the panggul bck to upward position.
            { transform: `translate(${svgInfo.x[currKey]}px, ${svgInfo.y}px) rotate(0)`, offset: 1 }
        ]
        options = { duration: strikeDuration, fill: 'forwards', easing: bezier, composite: 'replace' }
    } else {
        if (!action.nextnotes) {
            console.error('ERROR in panggul animation: next note not defined but current note is not last.')
            return
        }
        // var millisToNextNote = Math.round(Tone.Time(action.timeuntil).toMilliseconds() / selectedSpeed)
        var millisToNextNote = Math.round(action.timeuntilMs / pbSpeed)
        // Convert time durations to fractions (keyframe time indicators run from 0 to 1)
        var move_to_fraction = moveToDuration / millisToNextNote
        var stroke_fraction = strikeDuration / millisToNextNote
        var total_movement_frac = move_to_fraction + stroke_fraction
        var idle_time_fraction
        // Reduce the animation times if needed and calculate idle time.
        if (total_movement_frac > 1) {
            move_to_fraction /= total_movement_frac
            stroke_fraction /= total_movement_frac
            idle_time_fraction = 0
        } else {
            idle_time_fraction = 1 - move_to_fraction - stroke_fraction
        }

        // Set the hover X direction equal to that of the movement between the keys
        var hover_x = -Math.sign(svgInfo.x[nextKey] - svgInfo.x[currKey]) * svgInfo.animation.hover_x
        if (idle_time_fraction * millisToNextNote < 200) hover_x = 0

        keyframes = [
            // Start where the previous animation ended: the moment the key is struck
            {
                transform: `translate(${svgInfo.x[currKey] + svgInfo.animation.stroke_x}px, ${
                    svgInfo.y + svgInfo.animation.stroke_y
                }px) rotate(${svgInfo.animation.stroke_rotation}deg) scale(1, 1)`,
                offset: 0
            },
            // Step 1: move to (almost) the next note minus x_idle_offset horizontal units. These will be used in step 2.
            {
                transform: `translate(${svgInfo.x[nextKey] + hover_x}px, ${svgInfo.y}px) rotate(0)`,
                offset: move_to_fraction
            },
            // Step 2: wait until strike movement. Hover by moving horizontally over x_idle_offset units.
            {
                transform: `translate(${svgInfo.x[nextKey]}px, ${svgInfo.y}px)`,
                offset: move_to_fraction + idle_time_fraction,
                easing: bezierStroke
            },
            // Step 3: strike down (combination of rotation, movement and scaling)
            {
                transform: `translate(${svgInfo.x[nextKey] + svgInfo.animation.stroke_x}px, ${
                    svgInfo.y + svgInfo.animation.stroke_y
                }px) rotate(${svgInfo.animation.stroke_rotation}deg) scale(${svgInfo.animation.stroke_scale.toString()})`,
                offset: 1
            }
        ]
        options = { duration: millisToNextNote, fill: 'forwards', easing: bezier, composite: 'replace' }
    }

    // @ts-expect-error
    svgInfo.panggul.animate(keyframes, options).finished.then((a) => {
        try {
            a.commitStyles() // Persist the final position of the animation
        } catch (exception) {
            // Happens when user switches intrument during animation: animation's target does not exist any more
            debug('switching instrument during animation')
        }
        a.cancel()
    })
}

export const useAnimationEngine = (
    svgInfoRef: RefObject<SVGInfo>,
    highlightFunctionRef: RefObject<Dispatch<HighlightRange>>,
    panggulOptionRef: RefObject<MenuItemInfo>,
    currentFocusRef: RefObject<string[]>,
    pbSpeedRef: RefObject<number>
) => {
    async function highlightCurrentNote(cAction: SchedulePlayerCursorAction) {
        if (highlightFunctionRef.current) highlightFunctionRef.current({ line: cAction.line, range: cAction.range })
    }

    // For the use of Draw.schedule, see
    const animateInstrument = useCallback(
        (time: number, aAction: ScheduleAnimationAction) => {
            if (currentFocusRef.current.includes(aAction.position)) {
                if (svgInfoRef.current.svg && aAction.currnotes) {
                    // Hightighting animation
                    aAction.currnotes.forEach((note) => {
                        var keyElement = svgInfoRef.current.svg?.querySelector(
                            `#${note.keyname}${note.stroke ? ' .' + note.stroke : ''}`
                        )
                        // positionIndex will be used to select the highlight color combinations.
                        const positionIndex = currentFocusRef.current.indexOf(aAction.position)
                        if (keyElement) {
                            //@ts-expect-error: schedule() wrapper causes ts to 'forget' that keyElement and aAction.currnote are not null
                            Tone.getDraw().schedule(() => highlightNote(keyElement, note, positionIndex), time)
                        }
                    })
                    // Panggul animation
                    // Currently only active for the first of multiple focus positions.
                    // TODO: Set positionIndex according to user selection.
                    if (
                        aAction.position == panggulOptionRef.current?.value &&
                        svgInfoRef.current.panggul &&
                        svgInfoRef.current.x &&
                        svgInfoRef.current.y != null &&
                        svgInfoRef.current.animation
                    ) {
                        Tone.getDraw().schedule(
                            () => animatePanggul(aAction, svgInfoRef.current, pbSpeedRef.current),
                            time
                        )
                    }
                }
            }
        },
        [svgInfoRef.current, panggulOptionRef.current, currentFocusRef.current, pbSpeedRef.current]
    )

    const animateNotation = useCallback((time: number, cAction: SchedulePlayerCursorAction) => {
        // if (currentFocus.includes(cAction.position)) {
        if (currentFocusRef.current.length > 0 && currentFocusRef.current[0] === cAction.position) {
            Tone.getDraw().schedule(() => highlightCurrentNote(cAction), time)
        }
    }, [])

    return { animateInstrument, animateNotation }
}
