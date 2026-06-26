import type { PropsWithChildren } from 'react'
import { useEnvironmentManager } from '../stores/useEnvironmentManager'

export const FeatureUnderDevelopment: React.FC<PropsWithChildren> = (props: PropsWithChildren) => {
    const { environment } = useEnvironmentManager()
    if (environment == 'production') return null
    return <>{props.children}</>
}
