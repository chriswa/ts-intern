import { assertExists } from './assertExists'

export interface EmbeddedTemplateParseResult {
  /** The extracted handlebars template */
  template: string
  /** The part of the file before the generated code banner */
  prelude: string
  /** Whether the file already has generated content */
  hasGeneratedContent: boolean
}

const GENERATED_BANNER = '// ============= GENERATED CODE ============='

/**
 * Parses an embedded template file to extract the template and prelude
 */
export function parseEmbeddedTemplateFile(content: string): EmbeddedTemplateParseResult {
  const lines = content.split('\n')
  const templateLines: Array<string> = []
  let templateStart = -1
  let templateEnd = -1
  let bannerIndex = -1

  // Find the template and banner in two passes
  // First pass: find banner
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === GENERATED_BANNER) {
      bannerIndex = i
      break
    }
  }

  // Second pass: find template (consecutive lines starting with "// ")
  for (let i = 0; i < lines.length; i++) {
    const line = assertExists(lines[i], `Line ${i} should exist in array of length ${lines.length}`)

    // Stop if we hit the banner
    if (i === bannerIndex) {
      break
    }

    if (line.startsWith('// ')) {
      if (templateStart === -1) {
        templateStart = i
      }
      templateLines.push(line.substring(3)) // Remove "// " prefix
    }
    else if (line === '//' && templateStart !== -1) {
      // Handle commented blank lines like "//" within template (for IDE trailing space handling)
      templateLines.push('') // Empty line
    }
    else if (templateStart !== -1 && line.trim() === '') {
      // Blank line ends the template
      templateEnd = i
      break
    }
    else if (templateStart !== -1) {
      // Non-comment, non-blank line ends the template
      templateEnd = i
      break
    }
  }

  // If we reached end of file while in template, template ends at EOF
  if (templateStart !== -1 && templateEnd === -1) {
    templateEnd = lines.length
  }

  if (templateStart === -1) {
    throw new Error('No template found in .hbs.ts file. Expected lines starting with "// " (comment space)')
  }

  const template = templateLines.join('\n')

  let prelude: string
  let hasGeneratedContent: boolean

  if (bannerIndex === -1) {
    // No generated content yet, prelude is everything up to template end
    prelude = lines.slice(0, templateEnd).join('\n').trimEnd()
    hasGeneratedContent = false
  }
  else {
    // Has generated content, prelude is everything before the banner
    prelude = lines.slice(0, bannerIndex).join('\n').trimEnd()
    hasGeneratedContent = true
  }

  return {
    template,
    prelude,
    hasGeneratedContent,
  }
}

/**
 * Assembles an embedded template file with generated content
 */
export function assembleEmbeddedTemplateFile(prelude: string, generatedContent: string): string {
  return `${prelude}

${GENERATED_BANNER}
${generatedContent}`
}
