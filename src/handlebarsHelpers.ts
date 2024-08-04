import * as fs from 'fs'
import * as path from 'path'
import Handlebars, { HelperOptions } from "handlebars"

Handlebars.registerHelper('listFiles', (directory, options: HelperOptions) => {
  const dataRoot = options.data?.root as any
  const taskPath = dataRoot.taskPath
  const absDirectory = path.resolve(path.dirname(taskPath), directory)
  const files = fs.readdirSync(absDirectory)
    .filter(file => file.endsWith('.ts') && !file.startsWith('.') && !file.startsWith('_'))

  let result = ''
  files.forEach(filePath => {
    result += options.fn({
      filePath,
      filePathNoExt: filePath.replace(/\.ts$/, ''),
      basename: path.basename(filePath),
      basenameNoExt: path.basename(filePath, '.' + path.extname(filePath)),
    })
  })

  return result
})

Handlebars.registerHelper('replace', function (str, pattern, replacement) {
  const regex = new RegExp(pattern, 'g'); // Add 'g' flag for global replacement
  return str.replace(regex, replacement);
})
