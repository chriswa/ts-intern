#!/usr/bin/env node

import { build, clean, watch } from './api'
import { logger } from './logger'

const args = process.argv.slice(2)

const mode = args.shift()
if (mode === undefined) {
  logger.error('CLI argument `mode` is required')
  process.exit(1)
}

let srcDir = args.shift()
srcDir ??= '.'

if (mode === 'build') {
  build(srcDir).catch((error: unknown) => {
    console.error('Build failed:', error)
    process.exit(1)
  })
}
else if (mode === 'clean') {
  clean(srcDir)
}
else if (mode === 'watch') {
  watch(srcDir)
}
else {
  logger.error('CLI argument `mode` must be either `build`, `clean`, or `watch`')
  process.exit(1)
}
