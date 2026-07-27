import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false
  }
})
