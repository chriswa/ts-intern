import './handlebarsHelpers'
import { assembleEmbeddedTemplateFile, parseEmbeddedTemplateFile } from './embeddedTemplateParser'
import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
import { asError } from 'catch-unknown'
import * as fs from 'fs'
import Handlebars from 'handlebars'
import * as path from 'path'

export function isFilePathACodegenTaskFile(filePath: string) {
  const basename = path.basename(filePath)
  return (basename.startsWith('_') && basename.endsWith('.hbs')) || basename.endsWith('.hbs.ts')
}

function convertTaskFilePathToOutputFilePath(taskFilePath: string) {
  if (taskFilePath.endsWith('.hbs.ts')) {
    // For .hbs.ts files, output is the same file (in-place generation)
    return taskFilePath
  }
  // For .hbs files, remove .hbs extension
  const basename = path.basename(taskFilePath).replace(/\.hbs/, '')
  return path.join(path.dirname(taskFilePath), basename)
}

export class CodegenTask {
  private template: HandlebarsTemplateDelegate | null = null
  private templateError: Error | null = null
  private templateSource = ''
  private isHbsTsFile: boolean
  public readonly outputPath: string

  constructor(
    private taskPath: string,
  ) {
    this.outputPath = convertTaskFilePathToOutputFilePath(taskPath)
    this.isHbsTsFile = taskPath.endsWith('.hbs.ts')

    try {
      const fileContent = fs.readFileSync(taskPath, 'utf-8')

      if (this.isHbsTsFile) {
        const parseResult = parseEmbeddedTemplateFile(fileContent)
        this.templateSource = parseResult.template
      }
      else {
        this.templateSource = fileContent
      }

      this.template = Handlebars.compile(this.templateSource)
    }
    catch (error) {
      this.templateError = asError(error)
      logger.error(`ts-codegen template compilation error in '${this.taskPath}': ${this.templateError.message}`)
    }
  }

  run(): void {
    let generatedContent: string

    // Handle template compilation errors
    if (this.templateError !== null) {
      generatedContent = this.generateErrorContent(this.templateError, 'Template compilation error')
    }
    // Handle template execution errors
    else if (this.template !== null) {
      try {
        const props = {
          taskPath: this.taskPath,
          taskPathBasename: path.basename(this.taskPath),
        }
        generatedContent = this.template(props)
      }
      catch (error) {
        const executionError = asError(error)
        logger.error(`ts-codegen template execution error in '${this.taskPath}': ${executionError.message}`)
        generatedContent = this.generateErrorContent(executionError, 'Template execution error')
      }
    }
    else {
      // This shouldn't happen, but handle it gracefully
      generatedContent = this.generateErrorContent(new Error('Unknown template error'), 'Unknown error')
    }

    let finalContent: string
    if (this.isHbsTsFile) {
      // For .hbs.ts files, reconstruct prelude from templateSource and assemble
      const prelude = this.templateSource.split('\n').map((line) =>
        line.trim() === '' ? '//' : `// ${line}`,
      ).join('\n')
      finalContent = assembleEmbeddedTemplateFile(prelude, generatedContent)
    }
    else {
      // For .hbs files, the generated content is the final content
      finalContent = generatedContent
    }

    const wasContentChanged = this.isHbsTsFile
      ? outputFileManager.writeInPlace(this.outputPath, finalContent)
      : outputFileManager.write(this.outputPath, finalContent)
    if (wasContentChanged) {
      logger.info(`ts-codegen task '${this.taskPath}' wrote '${this.outputPath}'`)
    }
  }

  private generateErrorContent(error: Error, errorType: string): string {
    const stackTrace = error.stack ?? 'No stack trace available'

    return `⚠️  TEMPLATE ERROR ⚠️

Template: ${this.taskPath}
${errorType}: ${error.message}

This file contains an error instead of generated code.
Fix the template to resolve this issue.

Full error details:
${stackTrace}`
  }

  clean(): void {
    outputFileManager.delete([this.outputPath])
  }

  onFileAdd(_filePath: string): void { this.run() }
  onFileUnlink(_filePath: string): void { this.run() }
  onFileChange(filePath: string): void {
    if (filePath === this.taskPath || filePath === this.outputPath) {
      this.run()
    }
  }
}
