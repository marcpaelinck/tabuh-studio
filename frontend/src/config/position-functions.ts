import type { Position, PositionGroup } from '@tabuhstudio/shared'
import { positionGroups } from '@tabuhstudio/shared/config/position'
import type { Orchestra } from '@tabuhstudio/shared/types/position'
import { orchestraPositions } from '@tabuhstudio/shared/utils/position'
import _ from 'lodash'

/**
 * Returns A COPY OF the positionGroup dictionary containing only instruments belonging to the orchesta.
 * @param orchestra
 * @returns
 */
export function getPositionGroups(orchestra: Orchestra): Record<PositionGroup, Position[]> {
    const orchestraPos = orchestraPositions(orchestra)
    return _.fromPairs(
        _.entries(positionGroups)
            .map(([name, group]) => [name, group.positions.filter((pos) => orchestraPos.includes(pos))])
            .filter(([group, posList]) => posList.length > 0)
    ) as Record<PositionGroup, Position[]>
}
