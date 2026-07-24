import type { InstrumentGroup, Position, PositionGroup } from '@tabuhstudio/shared'
import { orchestras, positionGroups } from '@tabuhstudio/shared/config/position'
import _ from 'lodash'

/**
 * Returns A COPY OF the positionGroup dictionary containing only instruments belonging to the orchesta.
 * @param orchestra
 * @returns
 */
export function getPositionGroups(orchestra: InstrumentGroup): Record<PositionGroup, Position[]> {
    return _.fromPairs(
        _.entries(positionGroups)
            .map(([name, group]) => [
                name,
                group.positions.filter((pos) => orchestras[orchestra]?.positions.includes(pos))
            ])
            .filter(([group, posList]) => posList.length > 0)
    ) as Record<PositionGroup, Position[]>
}
