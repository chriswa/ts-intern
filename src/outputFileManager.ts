import * as fs from 'fs'
import { logger } from './logger'

const cacheFilePath = './.ts-intern.cache'

function loadCacheFile() {
  try {
    if (fs.existsSync(cacheFilePath)) {
      return JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'))
    }
  }
  catch (error) {
    logger.warn(`${cacheFilePath} could not be read, ignoring file: ` + (error as any).toString())
  }
  return {}
}
function writeCache() {
  fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData))
}

const cacheData = loadCacheFile()

export const outputFileManager = {
  write(outputFilePath: string, content: string): boolean {
    cacheData[outputFilePath] = true
    writeCache()
    if (fs.existsSync(outputFilePath)) {
      const oldContent = fs.readFileSync(outputFilePath, 'utf-8')
      if (oldContent === content) {
        return false // optimization to prevent filesystem writes when the file wouldn't actually change
      }
    }
    fs.writeFileSync(outputFilePath, content)
    return true
  },
  delete(outputFilePaths: Array<string>): void {
    for (const outputFilePath of outputFilePaths) {
      try {
        fs.unlinkSync(outputFilePath)
      }
      catch (error) {
        logger.error(`error unlinking ${outputFilePath}: ` + (error as any).toString())
      }
      delete cacheData[outputFilePath]
    }
    writeCache()
  },
  getAllOutputFilePaths() {
    return Object.keys(cacheData)
  },
  clean() {
    this.delete(outputFileManager.getAllOutputFilePaths())
    fs.unlinkSync(cacheFilePath)
  },
}
