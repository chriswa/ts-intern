import * as fs from 'fs'
import * as path from 'path'

export async function processFilesRecursively(
  baseDir: string,
  callback: (relativePath: string) => Promise<void>,
): Promise<void> {
  await _processFilesRecursively(baseDir, '', callback)
}

async function _processFilesRecursively(
  currentDir: string,
  relativeDir: string,
  callback: (relativePath: string) => Promise<void>,
): Promise<void> {
  const files = await fs.promises.readdir(currentDir, { withFileTypes: true })
  
  for (const file of files) {
    const fullPath = path.join(currentDir, file.name)
    const newRelativePath = path.join(relativeDir, file.name)
    if (file.isDirectory()) {
      await _processFilesRecursively(fullPath, newRelativePath, callback)
    }
    else {
      await callback(newRelativePath)
    }
  }
}
