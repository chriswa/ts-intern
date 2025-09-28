import { asError } from 'catch-unknown'
import * as fs from 'fs'
import Handlebars from 'handlebars'
import helpers from 'handlebars-helpers'
import * as path from 'path'
import { createMatchPath, loadConfig } from 'tsconfig-paths'

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

// Override handlebars-helpers readdir to be template-location-aware
Handlebars.registerHelper('readdir', (directory: string, filter: unknown, options: Handlebars.HelperOptions) => {
  // Handle case where filter is not provided (options becomes second parameter)
  if (typeof filter === 'object' && filter && 'data' in filter) {
    options = filter as Handlebars.HelperOptions
    filter = undefined
  }

  const taskPath = (options.data as { root?: { taskPath?: string } }).root?.taskPath
  const absDirectory = path.resolve(path.dirname(taskPath ?? '.'), directory)

  // Read directory contents
  const files = fs.readdirSync(absDirectory)
  const fullPaths = files.map((fp) => path.join(absDirectory, fp))

  // Apply filter if provided
  if (filter === undefined) {
    return files // Return just filenames for compatibility
  }

  if (typeof filter === 'function') {
    return (filter as (files: Array<string>) => Array<string>)(fullPaths)
  }

  if (filter instanceof RegExp) {
    return fullPaths.filter((fp) => filter.test(fp)).map((fp) => path.basename(fp))
  }

  // Handle glob patterns (like "*.ts")
  if (typeof filter === 'string') {
    // Simple glob matching for common patterns
    if (filter.startsWith('*.')) {
      const extension = filter.slice(1) // Remove the *
      return files.filter((fp) => fp.endsWith(extension))
    }
    // Handle other filter types like 'isFile', 'isDirectory'
    if (['isFile', 'isDirectory'].includes(filter)) {
      return fullPaths.filter((fp) => {
        const stat = fs.statSync(fp)
        return stat[filter as 'isFile' | 'isDirectory']()
      }).map((fp) => path.basename(fp))
    }
  }

  return files
})

// Override pascalcase helper to preserve case of existing words
Handlebars.registerHelper('pascalcase', (str: string) => {
  if (typeof str !== 'string') return ''

  // Split on word boundaries (spaces, dashes, underscores, and camelCase boundaries)
  const words = str
    .split(/[\s\-_]+|(?=[A-Z])/)
    .filter((word) => word.length > 0)

  // Capitalize first letter of each word, preserve rest
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
})

// Override camelcase helper to preserve case of existing words
Handlebars.registerHelper('camelcase', (str: string) => {
  if (typeof str !== 'string') return ''

  // Split on word boundaries (spaces, dashes, underscores, and camelCase boundaries)
  const words = str
    .split(/[\s\-_]+|(?=[A-Z])/)
    .filter((word) => word.length > 0)

  if (words.length === 0) return ''

  // First word stays as-is (or lowercase first letter), rest get capitalized first letter
  const firstWord = words[0]!.charAt(0).toLowerCase() + words[0]!.slice(1)
  const restWords = words
    .slice(1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))

  return [firstWord, ...restWords].join('')
})

// Cache for tsconfig path resolution to avoid repeated file reads
interface TsconfigCacheEntry {
  matchPath: ReturnType<typeof createMatchPath> | null
  mtime: number
}

const tsconfigCache = new Map<string, TsconfigCacheEntry>()

function resolveTsconfigPaths(projectRoot: string) {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json')

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    return null
  }

  // Get file modification time
  const stats = fs.statSync(tsconfigPath)
  const currentMtime = stats.mtimeMs

  // Check cache and validate modification time
  const cached = tsconfigCache.get(projectRoot)
  if (cached && cached.mtime === currentMtime) {
    return cached.matchPath
  }

  try {
    const configLoaderResult = loadConfig(projectRoot)
    if (configLoaderResult.resultType === 'success') {
      const matchPath = createMatchPath(
        configLoaderResult.absoluteBaseUrl,
        configLoaderResult.paths,
      )
      tsconfigCache.set(projectRoot, { matchPath, mtime: currentMtime })
      return matchPath
    }
  }
  catch {
    // If tsconfig loading fails, we'll fall back to relative path resolution
  }

  tsconfigCache.set(projectRoot, { matchPath: null, mtime: currentMtime })
  return null
}

function resolveTemplatePath(templatePath: string, currentTemplateDir: string): string {
  // Handle absolute paths
  if (path.isAbsolute(templatePath)) {
    return templatePath
  }

  // Handle relative paths
  if (templatePath.startsWith('./') || templatePath.startsWith('../')) {
    return path.resolve(currentTemplateDir, templatePath)
  }

  // Handle TypeScript path mapping (e.g., @/shared/template.hbs)
  let searchDir = currentTemplateDir

  // Find project root by walking up directories looking for tsconfig.json
  while (searchDir !== path.dirname(searchDir)) {
    if (fs.existsSync(path.join(searchDir, 'tsconfig.json'))) {
      const matchPath = resolveTsconfigPaths(searchDir)
      if (matchPath) {
        const resolved = matchPath(templatePath, undefined, undefined, ['.hbs', '.ts'])
        if (resolved) {
          return resolved
        }
      }
      break
    }
    searchDir = path.dirname(searchDir)
  }

  // Fallback to relative resolution from current directory
  return path.resolve(currentTemplateDir, templatePath)
}

// Add custom include helper for template composition
Handlebars.registerHelper('include', function (this: unknown, templatePath: string, options: Handlebars.HelperOptions) {
  try {
    const currentTaskPath = (options.data as { root?: { taskPath?: string } }).root?.taskPath
    const currentTemplateDir = currentTaskPath ? path.dirname(path.resolve(currentTaskPath)) : process.cwd()

    // Resolve the template path using TypeScript path mapping or relative paths
    const resolvedTemplatePath = resolveTemplatePath(templatePath, currentTemplateDir)

    // Read the template file
    if (!fs.existsSync(resolvedTemplatePath)) {
      throw new Error(`Template file not found: ${templatePath} (resolved to: ${resolvedTemplatePath})`)
    }

    const templateSource = fs.readFileSync(resolvedTemplatePath, 'utf-8')
    const template = Handlebars.compile(templateSource)

    // Create context by merging current context with passed parameters
    // options.hash contains named parameters passed to the helper
    const thisContext = this as Record<string, unknown> | undefined
    const baseContext = thisContext ?? {}
    const context: Record<string, unknown> = { ...baseContext, ...(options.hash as Record<string, unknown>) }

    // Set the taskPath in the context so nested includes work correctly
    const nestedContext: Record<string, unknown> = {
      ...context,
      taskPath: resolvedTemplatePath,
      taskPathBasename: path.basename(resolvedTemplatePath),
    }

    // Process the template with the merged context
    const dataContext = options.data as Record<string, unknown> | undefined
    const rootContext = dataContext?.['root'] as Record<string, unknown> | undefined
    const result = template(nestedContext, {
      data: {
        ...(dataContext ?? {}),
        root: {
          ...(rootContext ?? {}),
          taskPath: resolvedTemplatePath,
        },
      },
    })

    return new Handlebars.SafeString(result)
  }
  catch (error) {
    const errorMessage = asError(error).message
    return new Handlebars.SafeString(`⚠️  INCLUDE ERROR ⚠️

Template: ${templatePath}
Error: ${errorMessage}

Fix the template path or the included template to resolve this issue.

throw new Error(${JSON.stringify(`Include error: ${errorMessage}`)});
`)
  }
})
