import * as path from 'path'
import { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { cleanupOrphanedOutputFiles } from './cleanupOrphanedOutputFiles'
import { InternTask, isFilePathAnInternTaskFile } from './InternTask'
import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
import { processFilesRecursively } from './processFilesRecursively'
import { watch } from './watch'

export { watch }

export async function build(srcDir: string): Promise<void> {
  const oldOutputFilePaths = new Set(outputFileManager.getAllOutputFilePaths())
  const newOutputFilePaths = new Set<string>()
  await processFilesRecursively(srcDir, async (filePath) => {
    if (isFilePathAnInternTaskFile(filePath)) {
      const internTask = new InternTask(path.join(srcDir, filePath))
      await internTask.run()
      newOutputFilePaths.add(internTask.outputPath)
    }
  })
  cleanupOrphanedOutputFiles(oldOutputFilePaths, newOutputFilePaths)
  logger.info(`ts-intern build complete`)
}

export async function clean(srcDir: string): Promise<void> {
  outputFileManager.clean()
  logger.info(`ts-intern clean complete`)
}


export function vitePluginTsIntern(srcDir: string): Plugin {
  return {
    name: 'ts-intern',
    configResolved(config: ResolvedConfig) {
      logger.setLogger(config.logger)
    },
    buildStart() {
      build(srcDir)
    },
    configureServer(server: ViteDevServer) {
      server.watcher
      watch(srcDir)
    },
  }
}
