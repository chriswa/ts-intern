import './handlebarsHelpers'
import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
import { asError } from 'catch-unknown'
import * as fs from 'fs'
import Handlebars from 'handlebars'
import * as path from 'path'

export function isFilePathACodegenTaskFile(filePath: string) {
  const basename = path.basename(filePath)
  return basename.startsWith('_') && basename.endsWith('.hbs')
}

function convertTaskFilePathToOutputFilePath(taskFilePath: string) {
  const basename = path.basename(taskFilePath).replace(/\.hbs/, '')
  return path.join(path.dirname(taskFilePath), basename)
}

export class CodegenTask {
  private template: HandlebarsTemplateDelegate | null = null
  private templateError: Error | null = null
  public readonly outputPath: string
  constructor(
    private taskPath: string,
  ) {
    this.outputPath = convertTaskFilePathToOutputFilePath(taskPath)
    try {
      const templateSource = fs.readFileSync(taskPath, 'utf-8')
      this.template = Handlebars.compile(templateSource)
    }
    catch (error) {
      this.templateError = asError(error)
      logger.error(`ts-codegen template compilation error in '${this.taskPath}': ${this.templateError.message}`)
    }
  }

  run(): void {
    let content: string

    // Handle template compilation errors
    if (this.templateError !== null) {
      content = this.generateErrorContent(this.templateError, 'Template compilation error')
    }
    // Handle template execution errors
    else if (this.template !== null) {
      try {
        const props = {
          taskPath: this.taskPath,
          taskPathBasename: path.basename(this.taskPath),
        }
        content = this.template(props)
      }
      catch (error) {
        const executionError = asError(error)
        logger.error(`ts-codegen template execution error in '${this.taskPath}': ${executionError.message}`)
        content = this.generateErrorContent(executionError, 'Template execution error')
      }
    }
    else {
      // This shouldn't happen, but handle it gracefully
      content = this.generateErrorContent(new Error('Unknown template error'), 'Unknown error')
    }

    const wasContentChanged = outputFileManager.write(this.outputPath, content)
    if (wasContentChanged) {
      logger.info(`ts-codegen task '${this.taskPath}' wrote '${this.outputPath}'`)
    }
  }

  private generateErrorContent(error: Error, errorType: string): string {
    const errorMessage = `${errorType}: ${error.message}`
    const stackTrace = error.stack ?? 'No stack trace available'

    return `⚠️  TEMPLATE ERROR ⚠️

Template: ${this.taskPath}
${errorType}: ${error.message}

This file contains an error instead of generated code.
Fix the template to resolve this issue.

Full error details:
${stackTrace}

throw new Error(${JSON.stringify(errorMessage)});
`
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
