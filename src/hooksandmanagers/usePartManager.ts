// Keeps track of the part definitions and manages the automation of the editor's
// left margin containing the part names.
import _ from 'lodash'
import { useEffect, useState } from 'react'
import { partColorPalette } from '../config/config'
import type { EditorScore } from '../models/types'
import { debug } from '../utils/debugger'

export function usePartManager(score: EditorScore | undefined, updateParts: (parts: Record<string, string[]>) => void) {
    const [selectionOn, setSelectionOn] = useState<boolean>(false) // Left mouse button is down: extends selection
    const [sysToPartLookup, setSysToPartLookup] = useState<Record<string, string>>({})
    const [currSelection, setCurrSelection] = useState<string[]>([]) // List of uuids of currently selected systems
    const [partColors, setPartColors] = useState<Record<string, string>>({}) // Mapping part name -> color

    function same(a: Record<string, string>, b: Record<string, string>) {
        return _.keys(a).length == _.keys(b).length && _.keys(a).every((key) => a[key] == b[key])
    }

    useEffect(() => {
        debug('Temporary statement to avoid build error. Remove when currSelection is being used')
    }, [currSelection])

    useEffect(() => {
        if (!score) return
        // Create system to sys->part and part->color lookups
        const newSysToPart: Record<string, string> = {}
        const newPartColors: Record<string, string> = {}
        _.forIn(score.parts, (systems, part) => {
            systems.forEach((uuid) => (newSysToPart[uuid] = part))
            const color = partColorPalette[Object.keys(newPartColors).length % partColorPalette.length]
            newPartColors[part] = color
        })
        // Avoid circular re-render caused by useEffect
        // debug(
        //     `EQUAL LOOKUP ${same(sysToPartLookup, newSysToPart)} ${JSON.stringify(sysToPartLookup)} AND ${JSON.stringify(newSysToPart)}`
        // )
        // debug(
        //     `EQUAL PARTCOLORS ${same(partColors, newPartColors)} ${JSON.stringify(partColors)} AND ${JSON.stringify(newPartColors)}`
        // )
        if (!same(sysToPartLookup, newSysToPart)) setSysToPartLookup(newSysToPart)
        if (!same(partColors, newPartColors)) setPartColors(newPartColors)
        setCurrSelection([])
    }, [score])

    useEffect(() => {
        const newParts: Record<string, string[]> = _.reduce(
            sysToPartLookup,
            function (result, value, key) {
                ;(result[value] || (result[value] = [])).push(key)
                return result
            },
            {} as Record<string, string[]>
        )
        updateParts(newParts)
    }, [sysToPartLookup])

    function updatePartColors(partName: string) {
        if (!(partName in partColors)) {
            setPartColors(() => {
                const newColor = partColorPalette[Object.keys(partColors).length % partColorPalette.length]
                const newPartColors = { ...partColors }
                newPartColors[partName] = newColor
                return newPartColors
            })
        }
    }

    function updateSys2PartLookup(partName: string, selection: string[]) {
        // Remove the uuids from the current lookup
        debug(`updating part lookup for systems ${JSON.stringify(selection)}`)
        const newLookup = { ...sysToPartLookup, ...Object.fromEntries(selection.map((id) => [id, partName])) }
        debug(newLookup, true)
        setSysToPartLookup(newLookup)
    }

    const getPartName = (sysuuid: string): string => {
        return sysToPartLookup[sysuuid] || ''
    }

    const getPartColor = (partName: string): string | undefined => {
        return partName in partColors ? partColors[partName] : undefined
    }

    // Mouse up/down event handler
    function toggleSelection(on: boolean, partName?: string) {
        setSelectionOn(on)
        if (!on && partName) {
            updatePartColors(partName)
            // This construct is necessary to ensure that the most recent selection is used
            setCurrSelection((currSel) => {
                debug(`Processing new part info for ${JSON.stringify(currSel)}`)
                updateSys2PartLookup(partName, currSel)
                return []
            })
        } else setCurrSelection([])
    }

    // Mouseover handler
    function extendSelection(sysuuid: string) {
        setCurrSelection((prevSelection) => {
            const newCurrSelection = _.clone(prevSelection)
            if (!newCurrSelection.includes(sysuuid)) newCurrSelection.push(sysuuid)
            debug(
                `adding ${sysuuid} to selection ${JSON.stringify(prevSelection)} resulting in ${JSON.stringify(newCurrSelection)}`
            )
            return newCurrSelection
        })
    }

    return { sysToPartLookup, selectionOn, partColors, getPartName, getPartColor, toggleSelection, extendSelection }
}
