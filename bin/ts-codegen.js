#!/usr/bin/env node

import { spawn } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Run tsx with the TypeScript CLI file
const cliPath = join(__dirname, '..', 'src', 'cli.ts')
const child = spawn('npx', ['tsx', cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
})

child.on('exit', (code) => {
  process.exit(code || 0)
})