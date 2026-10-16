import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The map library is about a megabyte on its own and is already loaded
    // separately from the rest (see App.jsx), so a big chunk is expected
    chunkSizeWarningLimit: 1200,
  },
})