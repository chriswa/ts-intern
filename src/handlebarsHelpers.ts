import * as fs from 'fs'
import * as path from 'path'
import Handlebars from 'handlebars'

Handlebars.registerHelper('listFiles', (directory: string, skipListCsv: string, options: Handlebars.HelperOptions) => {
  const skipList = skipListCsv.split(/,\s*/)
  const absDirectory = path.resolve(path.dirname(options.data?.root.taskPath), directory)

  const listFilesRecursive = (dir: string): string => {
    const filesAndDirs = fs.readdirSync(dir)
    let result = ''

    filesAndDirs.forEach(fileOrDir => {
      const absPath = path.join(dir, fileOrDir)
      const stat = fs.statSync(absPath)

      if (stat.isDirectory()) {
        result += listFilesRecursive(absPath)
      } else if (fileOrDir.endsWith('.ts') && !fileOrDir.startsWith('.') && !fileOrDir.startsWith('_') && !skipList.includes(fileOrDir)) {
        result += options.fn({
          filePath: path.relative(absDirectory, absPath),
          filePathNoExt: path.relative(absDirectory, absPath).replace(/\.ts$/, ''),
          basename: path.basename(absPath),
          basenameNoExt: path.basename(absPath, path.extname(absPath)),
        })
      }
    })

    return result
  }

  return listFilesRecursive(absDirectory)
})

Handlebars.registerHelper('replace', function (str, pattern, replacement) {
  const regex = new RegExp(pattern, 'g') // Add 'g' flag for global replacement
  return str.replace(regex, replacement)
})
