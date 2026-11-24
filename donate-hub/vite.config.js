import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/webdev_project/'
  plugins: [react(), tailwindcss()],
  // Also accept the existing Next.js-style public names during this Vite migration.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
