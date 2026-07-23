import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vite defaults to binding 127.0.0.1 only. Inside the Docker dev container that's
  // unreachable from the host browser even with the port published in
  // docker-compose.yml (Docker's port-forward lands on the container's external
  // interface, not its loopback) — "npm run dev" without --host shows as a reset
  // connection on the host. Bind all interfaces so it works regardless of how the
  // dev server is invoked.
  server: { host: true },
  preview: { host: true },
  test: { environment: 'jsdom', globals: true },
})
