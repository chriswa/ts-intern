#!/usr/bin/env node

const { spawn } = require('child_process')
const { join } = require('path')

// Run tsx with the TypeScript CLI file
const cliPath = join(__dirname, '..', 'src', 'cli.ts')
const child = spawn('npx', ['tsx', cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
})

child.on('exit', (code) => {
  process.exit(code || 0)
})