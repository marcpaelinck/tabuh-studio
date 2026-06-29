import type { PropsWithChildren } from 'react'
import { useEnvironmentStore } from '../stores/useEnvironmentStore'

// Wrap a component with this element if it should not be deployed in production environment.
// <FeatureUnderDevelopment>
//   <NewFeatureComponent>
// <FeatureUnderDevelopment/>
export const FeatureUnderDevelopment: React.FC<PropsWithChildren> = (props: PropsWithChildren) => {
    const { environment } = useEnvironmentStore()
    if (environment == 'production') return null
    return <>{props.children}</>
}
