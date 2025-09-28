import * as fs from 'fs'
import Handlebars from 'handlebars'
import helpers from 'handlebars-helpers'
import * as path from 'path'

// Register all handlebars-helpers
helpers()

// Add array helper if not provided by handlebars-helpers
Handlebars.registerHelper('array', (...items: Array<unknown>) => {
  // Remove the options object (last parameter)
  return items.slice(0, -1)
})

// Add our custom recursive directory reader
Handlebars.registerHelper('readdirRecursive', (directory: string, options: Handlebars.HelperOptions) => {
  const taskPath = (options.data as { root?: { taskPath?: string } }).root?.taskPath
  const absDirectory = path.resolve(path.dirname(taskPath ?? '.'), directory)

  const readRecursive = (dir: string): Array<string> => {
    const results: Array<string> = []
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        results.push(...readRecursive(fullPath))
      }
      else {
        const relativePath = path.relative(absDirectory, fullPath)
        results.push(relativePath)
      }
    }

    return results
  }

  return readRecursive(absDirectory)
})
