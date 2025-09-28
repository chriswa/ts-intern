import { cleanupOrphanedOutputFiles } from './cleanupOrphanedOutputFiles'
import { CodegenTask, isFilePathACodegenTaskFile } from './CodegenTask'
import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
import { asError } from 'catch-unknown'
import * as chokidar from 'chokidar'

export function watch(srcDir: string): void {
  const oldOutputFilePaths = new Set(outputFileManager.getAllOutputFilePaths())
  const newOutputFilePaths = new Set<string>()

  const tasksByPath = new Map<string, CodegenTask>()
  const watcher = chokidar.watch(srcDir, {
    persistent: true,
  })
  let isReady = false
  watcher.on('ready', () => {
    cleanupOrphanedOutputFiles(oldOutputFilePaths, newOutputFilePaths)
    for (const task of Array.from(tasksByPath.values())) task.run()
    isReady = true
  })
  watcher.on('add', (filePath, _stats) => {
    if (isFilePathACodegenTaskFile(filePath)) {
      const codegenTask = new CodegenTask(filePath)
      tasksByPath.set(filePath, codegenTask)
      newOutputFilePaths.add(codegenTask.outputPath)
      if (isReady) {
        codegenTask.run()
      }
    }
    else {
      if (isReady) {
        for (const task of Array.from(tasksByPath.values())) task.onFileAdd(filePath)
      }
    }
  })
  watcher.on('unlink', (filePath) => {
    const codegenTask = tasksByPath.get(filePath)
    if (codegenTask !== undefined) {
      codegenTask.clean()
      tasksByPath.delete(filePath)
    }
    else {
      if (isReady) {
        for (const task of Array.from(tasksByPath.values())) task.onFileUnlink(filePath)
      }
    }
  })
  watcher.on('change', (filePath, _stats) => {
    if (tasksByPath.has(filePath)) {
      // assume it will output a file with the same name, so no need to delete the old CodegenTask's output file
      const codegenTask = new CodegenTask(filePath)
      tasksByPath.set(filePath, codegenTask)
      if (isReady) {
        codegenTask.run()
      }
    }
    else {
      if (isReady) {
        for (const task of Array.from(tasksByPath.values())) task.onFileChange(filePath)
      }
    }
  })
  registerSignalsToShutdownWatcher(watcher)

  logger.info(`ts-codegen watching ${srcDir}. Press Ctrl+C to exit.`)
}

function registerSignalsToShutdownWatcher(watcher: chokidar.FSWatcher) {
  const handleShutdown = async () => {
    logger.info('Stopping ts-codegen...')
    try {
      await watcher.close()
      logger.info('ts-codegen stopped')
      process.exit(0)
    }
    catch (err: unknown) {
      logger.error('Error while stopping ts-codegen: ' + asError(err).message)
      process.exit(1)
    }
  }
  process.on('SIGINT', () => { void handleShutdown() })
  process.on('SIGTERM', () => { void handleShutdown() })
}
