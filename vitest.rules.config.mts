import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['tests/rules/**/*.rules.ts'], environment: 'node', testTimeout: 15000, hookTimeout: 20000, fileParallelism: false } })
