import { cleanupOrphanedOutputFiles } from './cleanupOrphanedOutputFiles'
import { InternTask, isFilePathAnInternTaskFile } from './InternTask'
import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
import { asError } from 'catch-unknown'
import * as chokidar from 'chokidar'

export function watch(srcDir: string): void {
  const oldOutputFilePaths = new Set(outputFileManager.getAllOutputFilePaths())
  const newOutputFilePaths = new Set<string>()

  const tasksByPath = new Map<string, InternTask>()
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
    if (isFilePathAnInternTaskFile(filePath)) {
      const internTask = new InternTask(filePath)
      tasksByPath.set(filePath, internTask)
      newOutputFilePaths.add(internTask.outputPath)
      if (isReady) {
        internTask.run()
      }
    }
    else {
      if (isReady) {
        for (const task of Array.from(tasksByPath.values())) task.onFileAdd(filePath)
      }
    }
  })
  watcher.on('unlink', (filePath) => {
    const internTask = tasksByPath.get(filePath)
    if (internTask !== undefined) {
      internTask.clean()
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
      // assume it will output a file with the same name, so no need to delete the old InternTask's output file
      const internTask = new InternTask(filePath)
      tasksByPath.set(filePath, internTask)
      if (isReady) {
        internTask.run()
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
  const handleShutdown = () => {
    logger.info('Stopping ts-codegen...')
    watcher.close().then(() => {
      logger.info('ts-codegen stopped')
      process.exit(0)
    }).catch((err: unknown) => {
      logger.error('Error while stopping ts-codegen: ' + asError(err).message)
      process.exit(1)
    })
  }
  process.on('SIGINT', handleShutdown)
  process.on('SIGTERM', handleShutdown)
}
