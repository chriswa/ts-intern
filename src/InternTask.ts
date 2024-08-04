import * as fs from 'fs'
import Handlebars from "handlebars"
import * as path from 'path'
import './handlebarsHelpers'
import { outputFileManager } from './outputFileManager'
import { logger } from './logger'

export function isFilePathAnInternTaskFile(filePath: string) {
  const basename = path.basename(filePath)
  return basename.startsWith('_') && basename.endsWith('.codegen.hbs')
}

function convertTaskFilePathToOutputFilePath(taskFilePath: string) {
  const basename = path.basename(taskFilePath).replace(/^_/, '_').replace(/\.codegen\.hbs/, '.ts')
  return path.join(path.dirname(taskFilePath), basename)
}

export class InternTask {
  private template: HandlebarsTemplateDelegate
  public readonly outputPath: string
  constructor(
    private taskPath: string,
  ) {
    this.outputPath = convertTaskFilePathToOutputFilePath(taskPath)
    const templateSource = fs.readFileSync(taskPath, 'utf-8')
    this.template = Handlebars.compile(templateSource)
  }
  async run(): Promise<void> {
    const content = this.template({ taskPath: this.taskPath })
    const wasContentChanged = outputFileManager.write(this.outputPath, content)
    if (wasContentChanged) {
      logger.info(`ts-intern task '${this.taskPath}' wrote '${this.outputPath}'`)
    }
  }
  async clean(): Promise<void> {
    outputFileManager.delete([this.outputPath])
  }
  async onFileAdd(filePath: string): Promise<void> { await this.run() }
  async onFileUnlink(filePath: string): Promise<void> { await this.run() }
  async onFileChange(filePath: string): Promise<void> {
    if (filePath === this.taskPath || filePath === this.outputPath) {
      await this.run()
    }
  }
}
