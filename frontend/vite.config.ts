import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const config = {
        plugins: [
            react({ babel: { plugins: ['babel-plugin-react-compiler'] } } as any),
            tailwindcss({
                // Disable Lightning CSS optimization
                optimize: false
            })
        ],
        assetsInclude: ['**/*.svg'],
        base: '',
        server: { proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } } },
        build: {
            // The bundle is dominated by rsuite/tone/react; the >500 kB chunk-size
            // warning is expected here and not a problem. Raise the threshold to silence it.
            chunkSizeWarningLimit: 1500,
            rollupOptions: {
                output: {
                    // Content hash in the filename so a new deploy busts browser/CDN caches (and so the
                    // lazy-loaded export chunks cache independently). Vite rewrites index.html to the
                    // hashed names automatically.
                    entryFileNames: `assets/[name]-[hash].js`,
                    chunkFileNames: `assets/[name]-[hash].js`,
                    assetFileNames: `assets/[name]-[hash].[ext]`
                }
            },
            sourcemap: true
        },
        define: {
            // Need to define the entry here, otherwise ES will complain.
        }
    }
    if (mode == 'production') {
        config.build.sourcemap = false
    }
    return config
})
