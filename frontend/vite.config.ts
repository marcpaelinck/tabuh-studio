import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const config = {
        plugins: [
            react({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
            tailwindcss({
                // Disable Lightning CSS optimization
                optimize: false
            })
        ],
        assetsInclude: ['**/*.svg'],
        base: '',
        server: { proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } } },
        build: {
            rollupOptions: {
                output: {
                    entryFileNames: `assets/[name].js`,
                    chunkFileNames: `assets/[name].js`,
                    assetFileNames: `assets/[name].[ext]`
                }
            },
            sourcemap: true
        },
        define: {
            // Need to define the entry here, otherwise ES will complain.
        }
    }
    if (mode == 'production') {
        //     // This tells Vite that wpApiSettings is a global variable
        //     // It will be set by the tabuh-studio WordPress plugin
        config['define'] = { wpApiSettings: 'wpApiSettings' }
        config.build.sourcemap = false
    }
    return config
})
