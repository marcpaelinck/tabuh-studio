import type { AnimationAction } from "../utils/score";
import * as Tone from 'tone'
import type { SvgInfo } from "../components/Animation";

const moveToDuration = 500; // duration of the movement to the next key
const strikeDuration = 600; // duration of the stroke
const bezier = "cubic-bezier(0,.25,1,.71)"; // default timing curve
const bezierStroke = "cubic-bezier(.99,-0.01,1,.51)"; // timing curve for stroke (accelerates toward stroke)
const selectedSpeed = 1 //TODO replace with value of speed selector
// See the last remark in https://github.com/tonejs/tone.js/wiki/TransportTime
const lookAheadMillis = Tone.Context.getDefaults().lookAhead * 1000
console.log(`lookAhead=${lookAheadMillis}`)

function highlightNote(keyElement: Element, duration: Tone.Unit.Time): void {
    const durationMillis = Tone.Time(duration).toMilliseconds()
    var highlightKeyframes = new KeyframeEffect(
        keyElement,
        [
            //TODO use colors from config
            { fill: "rgba(0,255,255,1)", offset: 0, easing: bezier },
            { fill: "rgba(0,255,255,0)", offset: 1, easing: bezier },
        ],
        { duration: durationMillis }
    );
    const animation = new Animation(highlightKeyframes, document.timeline);
    animation.play()
}

//TODO implement
const logConsole = (msg: string, caller: string) => { }

function animatePanggul(action: AnimationAction, svgInfo: SvgInfo): void {
    var keyframes, options;
    if (!action || !svgInfo.animation || !svgInfo.panggul || !svgInfo.x || svgInfo.y == null) return

    var currKey = action.currnote ? action.currnote.keyname : Object.keys(svgInfo.x)[0] // E.g. 'DONG1'. This uniquely identifies a key
    var nextKey = action.nextnote ? action.nextnote.keyname : currKey

    if (action.currnote?.islast /*&& !this.dom.loopCheckbox.checked*/) {
        // Final animation: lift the hammer.
        logConsole("last note", "helpinghand");
        keyframes = [
            {
                transform: `translate(${svgInfo.x[currKey] + svgInfo.animation.stroke_x}px, ${svgInfo.y + svgInfo.animation.stroke_y
                    }px) rotate(${svgInfo.animation.stroke_rotation}deg) scale(1, 1)`,
                offset: 0,
            },
            // Step 1: move to (almost) the next note minus x_idle_offset horizontal units. These will be used in step 2.
            {
                transform: `translate(${svgInfo.x[currKey]}px, ${svgInfo.y}px) rotate(0)`,
                offset: 1,
            },
        ];
        options = {
            duration: strikeDuration,
            fill: "forwards",
            easing: bezier,
            composite: "replace",
        };
    } else {
        if (!action.nextnote) {
            console.log("ERROR in panggul animation: next note not defined but current note is not last.")
            return
        }
        var millisToNextNote = Math.round(Tone.Time(action.timeuntil).toMilliseconds() / selectedSpeed)
        // Convert time durations to fractions (keyframe time indicators run from 0 to 1)
        var move_to_fraction = moveToDuration / millisToNextNote
        var stroke_fraction = strikeDuration / millisToNextNote
        var total_movement_frac = move_to_fraction + stroke_fraction
        var idle_time_fraction;
        // Reduce the animation times if needed and calculate idle time.
        if (total_movement_frac > 1) {
            move_to_fraction /= total_movement_frac;
            stroke_fraction /= total_movement_frac;
            idle_time_fraction = 0;
        } else {
            idle_time_fraction = 1 - move_to_fraction - stroke_fraction;
        }

        // Set the hover X direction equal to that of the movement between the keys
        var hover_x = -Math.sign(svgInfo.x[nextKey] - svgInfo.x[currKey]) * svgInfo.animation.hover_x;
        if (idle_time_fraction * millisToNextNote < 200) hover_x = 0;

        keyframes = [
            // Start where the previous animation ended: the moment the key is struck
            {
                transform: `translate(${svgInfo.x[currKey] + svgInfo.animation.stroke_x}px, ${svgInfo.y + svgInfo.animation.stroke_y
                    }px) rotate(${svgInfo.animation.stroke_rotation}deg) scale(1, 1)`,
                offset: 0,
            },
            // Step 1: move to (almost) the next note minus x_idle_offset horizontal units. These will be used in step 2.
            {
                transform: `translate(${svgInfo.x[nextKey] + hover_x}px, ${svgInfo.y}px) rotate(0)`,
                offset: move_to_fraction,
            },
            // Step 2: wait until strike movement. Hover by moving horizontally over x_idle_offset units.
            {
                transform: `translate(${svgInfo.x[nextKey]}px, ${svgInfo.y}px)`,
                offset: move_to_fraction + idle_time_fraction,
                easing: bezierStroke,
            },
            // Step 3: strike down (combination of rotation, movement and scaling)
            {
                transform: `translate(${svgInfo.x[nextKey] + svgInfo.animation.stroke_x}px, ${svgInfo.y + svgInfo.animation.stroke_y
                    }px) rotate(${svgInfo.animation.stroke_rotation
                    }deg) scale(${svgInfo.animation.stroke_scale.toString()})`,
                offset: 1,
            },
        ];
        options = { duration: millisToNextNote, fill: "forwards", easing: bezier, composite: "replace" };
    }

    // @ts-expect-error
    svgInfo.panggul.animate(keyframes, options).finished.then((a) => {
        try {
            a.commitStyles(); // Persist the final position of the animation
        } catch (exception) {
            // Happens when user switches intrument during animation: animation's target does not exist any more
            logConsole("switching instrument during animation", "helpinghand");
        }
        a.cancel();
    });
}

export const useAnimationEngine = (svgInfoRef: React.RefObject<SvgInfo>, focusRef: React.RefObject<string>) => {


    async function executeAnimation(time: number, action: AnimationAction) {
        setTimeout(function () {
            if (action.position === focusRef.current) {
                const svgInfo = svgInfoRef.current
                if (svgInfo.svg && action.currnote) {


                    // Hightighting animation
                    var keyElement = (svgInfo.svg.querySelector(`#${action.currnote.keyname} .${action.currnote.stroke}`) ||
                        svgInfo.svg.querySelector(`#${action.currnote.keyname}`))
                    if (keyElement) highlightNote(keyElement, action.currnote.duration)

                    // Panggul animation
                    if (svgInfo.panggul && svgInfo.x && svgInfo.y != null && svgInfo.animation) {
                        animatePanggul(action, svgInfo)
                    }
                }

            }
        }, lookAheadMillis);
    }/*, [svgInfo, focus])*/

    return { executeAnimation }
}
