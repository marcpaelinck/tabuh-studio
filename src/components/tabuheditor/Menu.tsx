import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { ButtonToolbar } from 'rsuite'
import 'rsuite/ButtonToolbar/styles/index.css'
import 'rsuite/Dropdown/styles/index.css'
import type { MenuItemInfo } from '../../models/types'
import { debug } from '../../utils/debugger'
import { createTabuhMenuItems, tabuhDefaultOption } from '../../utils/selectorsUtils/selectorsUtils'
import Selector from '../Selector'

export default function Menu({
    menuDisabled,
    tabuhList,
    scoreUpdater
}: {
    menuDisabled: boolean
    tabuhList: string[]
    scoreUpdater: Function
}): JSX.Element {
    const [tabuhMenuItems, setTabuhMenuItems] = useState<MenuItemInfo[]>([])
    const [selectedSong, setSelectedSong] = useState<MenuItemInfo>(tabuhDefaultOption)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setTabuhMenuItems(createTabuhMenuItems(tabuhList))
        }
        updateFixedMenus()
    }, [tabuhList])

    function debugLog(item: MenuItemInfo, menu: string) {
        const strValue = Array.isArray(item.value)
            ? item.value.reduce((aggr, val) => aggr + (aggr ? ', ' : '') + val, '[') + ']'
            : item.value
        debug(`${menu}: ${item.key} ${item.displayValue} ${strValue}`)
    }

    const onChangeTabuhSelector = async (item: MenuItemInfo) => {
        debugLog(item, 'TABUH')
        setSelectedSong(item)
        scoreUpdater(item.value)
    }

    return (
        <ButtonToolbar>
            <Selector
                id="tabuhselector"
                scrollable
                disabled={menuDisabled}
                title={selectedSong.displayValue || tabuhDefaultOption.displayValue}
                className="tabuhselector"
                width="3/10"
                valueList={tabuhMenuItems}
                onChange={onChangeTabuhSelector}
            />
        </ButtonToolbar>
    )
}
