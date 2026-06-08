import { createRoot } from 'react-dom/client'
import { CustomProvider } from 'rsuite'
import App from './App.tsx'
// The next statements should occur last in order to take effect.
import { StrictMode } from 'react'
import './index.css'
import './reactsuite-theme.css'

createRoot(document.getElementById('tabuh-studio')!).render(
    <>
        <StrictMode>
            <CustomProvider theme="light">
                <App />
            </CustomProvider>
        </StrictMode>
    </>
)
