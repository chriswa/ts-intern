import { logger } from './logger'
import { outputFileManager } from './outputFileManager'
import { setDifference } from './util'

export function cleanupOrphanedOutputFiles(oldOutputFilePaths: Set<string>, newOutputFilePaths: Set<string>) {
  const outputFilePathsToCleanUp = Array.from(setDifference(oldOutputFilePaths, newOutputFilePaths))
  if (outputFilePathsToCleanUp.length > 0) {
    logger.info(`ts-intern unlinking orphaned output files: ${outputFilePathsToCleanUp.join(', ')}`)
    outputFileManager.delete(outputFilePathsToCleanUp)
  }
}
