import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import * as Tone from 'tone'
import { animationConfig, colorPalette, type ColorName } from '../../config/config'
import type { SVGInfo } from '../../typing/animation'
import type { Position } from '../../typing/basetypes'
import type { AnimationNote, AnimmationFunctionParameters } from '../../typing/playback'
import { debug } from '../../utils/debugger'

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

function animatePanggul(params: AnimmationFunctionParameters, svgInfo: SVGInfo, pbSpeed: number) {
    var keyframes: Keyframe[], options: KeyframeAnimationOptions
    if (!params || !svgInfo.animation || !svgInfo.panggul || !svgInfo.x || svgInfo.y == null || !params.currnotes)
        return

    // Currently only one panggul can be animated
    var currKey = params.currnotes.length ? params.currnotes[0].keyname : Object.keys(svgInfo.x)[0] // E.g. 'DONG1'. This uniquely identifies a key
    var nextKey = params.nextnotes.length ? params.nextnotes[0].keyname : currKey

    if (params.currnotes.length > 0 && params.currnotes[0].isLast /*&& !this.dom.loopCheckbox.checked*/) {
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
        if (!params.nextnotes) {
            console.error('ERROR in panggul animation: next note not defined but current note is not last.')
            return
        }
        // var millisToNextNote = Math.round(Tone.Time(action.timeuntil).toMilliseconds() / selectedSpeed)
        if (!params.timeuntilMs) console.error(`params.timeuntilMs is ${params.timeuntilMs}`)
        if (!pbSpeed) console.error(`pbSpeed is ${pbSpeed}`)
        var millisToNextNote = Math.round(params.timeuntilMs / pbSpeed)
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

// Arguments are mostly state variables and therefore need to be passed as reference object
export const useAnimationEngine = (
    focusRef: RefObject<Position[]>,
    activePanggulRef: RefObject<Position[]>,
    pbSpeedRef: RefObject<number>,
    pbWindowVisibleRef: RefObject<boolean>
) => {
    const [svgInfo, setSvgInfo] = useState<SVGInfo>({ svg: null, panggul: null, x: null, y: null, animation: null })

    const svgInfoRef: RefObject<SVGInfo> = useRef<SVGInfo>(svgInfo)

    useEffect(() => {
        svgInfoRef.current = svgInfo
    }, [svgInfo])

    // Highlight the key(s) if
    // - active panggul is selected and params.position corresponds with a panggul position or
    // - no active panggul is selecte and params.position corresponds with a focus position or
    const shouldHighlight = (position: Position) => {
        return (
            (activePanggulRef.current.length != 0 && activePanggulRef.current.includes(position)) ||
            (activePanggulRef.current.length == 0 && focusRef.current.includes(position))
        )
    }

    // For the use of Draw.schedule, see
    const animateInstrument = useCallback((time: number, params: AnimmationFunctionParameters): void => {
        if (!pbWindowVisibleRef.current) return
        const pbSpeed = pbSpeedRef.current
        const mySvgInfo = svgInfoRef.current

        if (focusRef.current.includes(params.position)) {
            if (mySvgInfo.svg && params.currnotes) {
                // Hightighting animation
                debug(`ANIMATION: ${JSON.stringify(params)}`)
                if (shouldHighlight(params.position)) {
                    params.currnotes.forEach((note) => {
                        var keyElement = mySvgInfo.svg?.querySelector(
                            `#${note.keyname}${note.stroke ? ' .' + note.stroke : ''}`
                        )
                        // positionIndex will be used to select the highlight color combinations.
                        const positionIndex = focusRef.current.indexOf(params.position)
                        if (keyElement) {
                            Tone.getDraw().schedule(() => highlightNote(keyElement!, note, positionIndex), time)
                        }
                    })
                }
                // Panggul animation
                // Currently only active for the first of multiple focus positions.
                // TODO: Set positionIndex according to user selection.
                if (
                    activePanggulRef.current.includes(params.position) &&
                    mySvgInfo.panggul &&
                    mySvgInfo.x &&
                    mySvgInfo.y != null &&
                    mySvgInfo.animation
                ) {
                    Tone.getDraw().schedule(() => animatePanggul(params, mySvgInfo, pbSpeed), time)
                }
            }
        }
    }, [])

    return { animateInstrument, svgInfo, setSvgInfo }
}
