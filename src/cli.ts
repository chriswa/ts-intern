#!/usr/bin/env node

import { build, clean, watch } from './api'
import { logger } from './logger'

const args = process.argv.slice(2)

const mode = args.shift()
if (mode === undefined) {
  logger.error("CLI argument `mode` is required")
  process.exit(1)
}

let srcDir = args.shift()
if (srcDir === undefined) {
  srcDir = '.'
}

if (mode === 'build') {
  void build(srcDir)
}
else if (mode === 'clean') {
  void clean(srcDir)
}
else if (mode === 'watch') {
  void watch(srcDir)
}
else {
  logger.error("CLI argument `mode` must be either `build`, `clean`, or `watch`")
  process.exit(1)
}

