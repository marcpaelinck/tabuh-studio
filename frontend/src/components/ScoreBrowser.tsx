import { useEffect, useMemo, useState, type JSX } from 'react'
import { Button, ButtonGroup } from 'rsuite'
import { useGroupsStore } from '../stores/useGroupsStore'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'
import type { ScoreFilterPref } from '../typing/preferences'
import { OptionList } from './OptionList'

interface ScoreBrowserProps {
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    /** Filter to pre-select (current score's orchestra, or the user's preference). */
    defaultFilter?: ScoreFilterPref
    /** Value of the currently selected score (highlighted in the list). */
    selectedValue?: string
    onSelect: (option: ExtendedOption<ScoreInfo>) => void
}

/**
 * A single-dimension filter (one orchestra OR one subscribed music group — never both) plus a
 * scrollable, filtered score list. Shared by the desktop "Open" drawer and the mobile "Scores"
 * view. Orchestras are the distinct types among the available scores; groups are the user's
 * subscriptions (empty when logged out, so only orchestras show).
 */
export function ScoreBrowser({
    scoreMenuOptions,
    defaultFilter,
    selectedValue,
    onSelect
}: ScoreBrowserProps): JSX.Element {
    const { groups, subscriptions } = useGroupsStore()
    const subscribedGroups = useMemo(
        () => groups.filter((g) => subscriptions.includes(g.id)).sort((a, b) => a.name.localeCompare(b.name)),
        [groups, subscriptions]
    )

    const orchestraOptions = useMemo(
        () =>
            [...new Set(scoreMenuOptions.map((o) => o.objValue.instrumentgroup))]
                .sort()
                .map((g) => ({ label: g.replace(/_/g, ' '), value: g })),
        [scoreMenuOptions]
    )

    const [filter, setFilter] = useState<ScoreFilterPref | null>(null)

    // Initialise the filter once options are available: the given default when it is valid,
    // otherwise the first available orchestra.
    useEffect(() => {
        if (filter !== null) return
        const orchestras = orchestraOptions.map((o) => o.value)
        const validDefault =
            defaultFilter &&
            ((defaultFilter.type === 'orchestra' && orchestras.includes(defaultFilter.value)) ||
                (defaultFilter.type === 'group' && subscribedGroups.some((g) => g.id === defaultFilter.value)))
        if (validDefault) setFilter(defaultFilter)
        else if (orchestras.length) setFilter({ type: 'orchestra', value: orchestras[0] })
    }, [orchestraOptions, subscribedGroups, defaultFilter, filter])

    const filtered = !filter
        ? scoreMenuOptions
        : filter.type === 'orchestra'
          ? scoreMenuOptions.filter((o) => o.objValue.instrumentgroup === filter.value)
          : scoreMenuOptions.filter((o) => (o.objValue.groups ?? []).includes(filter.value))

    const isActive = (f: ScoreFilterPref) => filter?.type === f.type && filter?.value === f.value

    return (
        <div className="flex flex-col gap-3 h-full">
            <div>
                <div className="text-xs mb-1">orchestra:</div>
                <ButtonGroup vertical className="w-full">
                    {orchestraOptions.map((o) => (
                        <Button
                            key={o.value}
                            appearance={isActive({ type: 'orchestra', value: o.value }) ? 'primary' : 'default'}
                            onClick={() => setFilter({ type: 'orchestra', value: o.value })}>
                            {o.label}
                        </Button>
                    ))}
                </ButtonGroup>
                {subscribedGroups.length > 0 && (
                    <>
                        <div className="text-xs mb-1 mt-2">my groups:</div>
                        <ButtonGroup vertical className="w-full">
                            {subscribedGroups.map((g) => (
                                <Button
                                    key={g.id}
                                    appearance={isActive({ type: 'group', value: g.id }) ? 'primary' : 'default'}
                                    onClick={() => setFilter({ type: 'group', value: g.id })}>
                                    {g.name}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </>
                )}
            </div>
            <div className="flex flex-1 min-h-0 flex-col">
                <div className="text-xs mb-1">score:</div>
                <OptionList data={filtered} selectedValue={selectedValue} onSelect={onSelect} className="flex-1 min-h-0" />
            </div>
        </div>
    )
}
