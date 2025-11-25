import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { CustomProvider } from 'rsuite';
// The next statements should occur last in order to take effect.
import './reactsuite-theme.css'
import './index.css'


createRoot(document.getElementById('tabuh-studio')!).render(
  <StrictMode>
    <div id="--test--"/>
      <CustomProvider theme="light">
        <App />
      </CustomProvider>
  </StrictMode>
)
