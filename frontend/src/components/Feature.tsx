import type { PropsWithChildren } from 'react'
import { useEnvironmentManager } from '../stores/useEnvironmentManager'

// Wrap a component with this element if it should not be deployed in production environment.
// <FeatureUnderDevelopment>
//   <NewFeatureComponent>
// <FeatureUnderDevelopment/>
export const FeatureUnderDevelopment: React.FC<PropsWithChildren> = (props: PropsWithChildren) => {
    const { environment } = useEnvironmentManager()
    if (environment == 'production') return null
    return <>{props.children}</>
}
