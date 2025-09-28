import { cleanupOrphanedOutputFiles } from './cleanupOrphanedOutputFiles'
import { CodegenTask, isFilePathACodegenTaskFile } from './CodegenTask'
import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
import { processFilesRecursively } from './processFilesRecursively'
import { watch } from './watch'
import * as path from 'path'
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

export { watch }

export async function build(srcDir: string): Promise<void> {
  const oldOutputFilePaths = new Set(outputFileManager.getAllOutputFilePaths())
  const newOutputFilePaths = new Set<string>()
  await processFilesRecursively(srcDir, async (filePath) => {
    if (isFilePathACodegenTaskFile(filePath)) {
      const codegenTask = new CodegenTask(path.join(srcDir, filePath))
      codegenTask.run()
      newOutputFilePaths.add(codegenTask.outputPath)
    }
    return Promise.resolve()
  })
  cleanupOrphanedOutputFiles(oldOutputFilePaths, newOutputFilePaths)
  logger.info('ts-codegen build complete')
}

export function clean(_srcDir: string): void {
  outputFileManager.clean()
  logger.info('ts-codegen clean complete')
}

export function tsCodegenVitePlugin(srcDir: string): Plugin {
  return {
    name: 'ts-codegen',
    configResolved(config: ResolvedConfig) {
      logger.setLogger(config.logger)
    },
    buildStart() {
      void build(srcDir)
    },
    configureServer(_server: ViteDevServer) {
      watch(srcDir)
    },
  }
}
