import type { Position, PositionGroup } from '@tabuhstudio/shared'
import { positionConfigs, positionGroups } from '@tabuhstudio/shared/config/position'
import type { Orchestra } from '@tabuhstudio/shared/types/position'
import { orchestraPositions } from '@tabuhstudio/shared/utils/position'
import _ from 'lodash'

/**
 * Returns A COPY OF the positionGroup dictionary containing only instruments belonging to the orchesta.
 * @param orchestra
 * @returns
 */
export function getPositionGroups(orchestra?: Orchestra): Record<PositionGroup, Position[]> {
    const orchestraPos = orchestraPositions(orchestra)
    return _.fromPairs(
        _.entries(positionGroups)
            .map(([name, group]) => [name, group.positions.filter((pos) => orchestraPos.includes(pos))])
            .filter(([group, posList]) => posList.length > 0)
    ) as Record<PositionGroup, Position[]>
}

/**
 * Returns A COPY OF the positionGroup dictionary containing only instruments belonging to the orchesta.
 * @param positions
 * @returns A list of readable names for the given position list.
 */
export function getPositionNames(positions: Position[]): string[] {
    return _.entries(positionConfigs)
        .filter(([pos, val]) => positions.includes(pos as Position))
        .map(([pos, val]) => val.name)
}
