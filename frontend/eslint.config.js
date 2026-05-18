import js from '@eslint/js'
import globals, { es2024, es2025 } from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{ts,tsx,js}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite
        ],
        languageOptions: { ecmaVersion: 5, globals: globals.browser }
    }
])
