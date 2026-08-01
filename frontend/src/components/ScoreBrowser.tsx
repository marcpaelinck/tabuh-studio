import { useEffect, useMemo, useState, type JSX } from 'react'
import { Button, ButtonGroup } from 'rsuite'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'
import { OptionList } from './OptionList'

interface ScoreBrowserProps {
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    /** Orchestra to pre-select (e.g. the current score's) when it has scores available. */
    defaultInstrumentGroup?: string
    /** Value of the currently selected score (highlighted in the list). */
    selectedValue?: string
    onSelect: (option: ExtendedOption<ScoreInfo>) => void
}

/**
 * Orchestra (InstrumentGroup) segmented control + a scrollable, filtered score list. Shared
 * by the desktop "Open" drawer and the mobile "Scores" view. Fills its container's height;
 * the score list scrolls. Orchestra options are the distinct orchestra types present among
 * the available scores, so new orchestra types appear automatically.
 */
export function ScoreBrowser({
    scoreMenuOptions,
    defaultInstrumentGroup,
    selectedValue,
    onSelect
}: ScoreBrowserProps): JSX.Element {
    const [orchestra, setOrchestra] = useState<string | null>(null)
    const orchestraOptions = useMemo(
        () =>
            [...new Set(scoreMenuOptions.map((o) => o.objValue.instrumentgroup))]
                .sort()
                .map((g) => ({ label: g.replace(/_/g, ' '), value: g })),
        [scoreMenuOptions]
    )

    // Initialise the orchestra once options are available: the given default when it has
    // scores, otherwise the first available orchestra.
    useEffect(() => {
        if (orchestra !== null) return
        const groups = orchestraOptions.map((o) => o.value)
        if (!groups.length) return
        setOrchestra(
            defaultInstrumentGroup && groups.includes(defaultInstrumentGroup) ? defaultInstrumentGroup : groups[0]
        )
    }, [orchestraOptions, defaultInstrumentGroup, orchestra])

    const filtered = orchestra
        ? scoreMenuOptions.filter((o) => o.objValue.instrumentgroup === orchestra)
        : scoreMenuOptions

    return (
        <div className="flex flex-col gap-3 h-full">
            <div>
                <div className="text-xs mb-1">orchestra:</div>
                <ButtonGroup vertical className="w-full">
                    {orchestraOptions.map((o) => (
                        <Button
                            key={o.value}
                            appearance={orchestra === o.value ? 'primary' : 'default'}
                            onClick={() => setOrchestra(o.value)}>
                            {o.label}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>
            <div className="flex flex-1 min-h-0 flex-col">
                <div className="text-xs mb-1">score:</div>
                <OptionList
                    data={filtered}
                    selectedValue={selectedValue}
                    onSelect={onSelect}
                    className="flex-1 min-h-0"
                />
            </div>
        </div>
    )
}
