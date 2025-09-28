import './handlebarsHelpers'
import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
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
  private template: HandlebarsTemplateDelegate
  public readonly outputPath: string
  constructor(
    private taskPath: string,
  ) {
    this.outputPath = convertTaskFilePathToOutputFilePath(taskPath)
    const templateSource = fs.readFileSync(taskPath, 'utf-8')
    this.template = Handlebars.compile(templateSource)
  }

  run(): void {
    const props = {
      taskPath: this.taskPath,
      taskPathBasename: path.basename(this.taskPath),
    }
    const content = this.template(props)
    const wasContentChanged = outputFileManager.write(this.outputPath, content)
    if (wasContentChanged) {
      logger.info(`ts-codegen task '${this.taskPath}' wrote '${this.outputPath}'`)
    }
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
