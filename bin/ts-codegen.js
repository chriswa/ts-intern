#!/usr/bin/env node

const { spawn } = require('child_process')
const { join } = require('path')

// Run the compiled JavaScript CLI file
const cliPath = join(__dirname, '..', 'dist', 'cli.js')
const child = spawn('node', [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
})

child.on('exit', (code) => {
  process.exit(code || 0)
})