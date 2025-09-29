import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true })
  const entries = await fs.promises.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    }
    else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

async function getAllFiles(dir: string, basePath = ''): Promise<Array<string>> {
  const files: Array<string> = []
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name)
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, relativePath)
      files.push(...subFiles)
    }
    else {
      files.push(relativePath)
    }
  }

  return files
}

async function runCodegen(workingDir: string): Promise<void> {
  const cliPath = path.join(__dirname, '..', 'bin', 'ts-codegen.js')

  return new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, 'build', '.'], {
      cwd: workingDir,
      stdio: 'inherit',
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      }
      else {
        reject(new Error(`ts-codegen exited with code ${code ?? 'unknown'}`))
      }
    })

    child.on('error', reject)
  })
}

describe('Example-based Tests', () => {
  const examplesDir = path.join(__dirname, '..', 'examples')

  it('should find and test all examples', async () => {
    const exampleDirs = await fs.promises.readdir(examplesDir, { withFileTypes: true })
    const examples = exampleDirs.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

    expect(examples.length).toBeGreaterThan(0)

    for (const exampleName of examples) {
      // Testing example: ${exampleName}
      await testExample(exampleName)
    }
  }, 15000)
})

async function testExample(exampleName: string): Promise<void> {
  const exampleDir = path.join(__dirname, '..', 'examples', exampleName)
  const inputDir = path.join(exampleDir, 'input')
  const expectedDir = path.join(exampleDir, 'expected')
  const metaDir = path.join(exampleDir, 'meta')

  // Verify directories exist
  const inputExists = await fs.promises.stat(inputDir).then(() => true).catch(() => false)
  const expectedExists = await fs.promises.stat(expectedDir).then(() => true).catch(() => false)

  expect(inputExists).toBe(true)
  expect(expectedExists).toBe(true)

  // Create temporary directory
  const tmpDir = await fs.promises.mkdtemp(path.join(__dirname, '..', 'tmp-test-'))

  try {
    // Copy input to temp directory
    await copyDirectory(inputDir, tmpDir)

    // Run codegen in temp directory
    await runCodegen(tmpDir)

    // Check for deleted files if meta/deleted.json exists
    const deletedJsonPath = path.join(metaDir, 'deleted.json')
    const deletedJsonExists = await fs.promises.stat(deletedJsonPath).then(() => true).catch(() => false)

    if (deletedJsonExists) {
      const deletedFilesContent = await fs.promises.readFile(deletedJsonPath, 'utf-8')
      const deletedFiles = JSON.parse(deletedFilesContent) as Array<string>

      // Verify that deleted files no longer exist
      for (const deletedFile of deletedFiles) {
        const deletedFilePath = path.join(tmpDir, deletedFile)
        const fileExists = await fs.promises.stat(deletedFilePath).then(() => true).catch(() => false)
        expect(fileExists).toBe(false)
      }
    }

    // Load modifications if they exist
    const modificationsJsonPath = path.join(metaDir, 'modifications.json')
    const modificationsJsonExists = await fs.promises.stat(modificationsJsonPath).then(() => true).catch(() => false)

    let modifications: Record<string, Array<{ operation: string, input: string, output: string }>> = {}
    if (modificationsJsonExists) {
      const modificationsContent = await fs.promises.readFile(modificationsJsonPath, 'utf-8')
      modifications = JSON.parse(modificationsContent) as Record<string, Array<{ operation: string, input: string, output: string }>>
    }

    // Get all expected files
    const expectedFiles = await getAllFiles(expectedDir)

    // Compare each expected file with generated file
    for (const expectedFile of expectedFiles) {
      const expectedFilePath = path.join(expectedDir, expectedFile)
      const generatedFilePath = path.join(tmpDir, expectedFile)

      // Check that generated file exists
      const generatedExists = await fs.promises.stat(generatedFilePath).then(() => true).catch(() => false)
      expect(generatedExists).toBe(true)

      // Read contents
      const expectedContent = await fs.promises.readFile(expectedFilePath, 'utf-8')
      let generatedContent = await fs.promises.readFile(generatedFilePath, 'utf-8')

      // Apply modifications if they exist for this file
      if (modifications[expectedFile]) {
        for (const modification of modifications[expectedFile]) {
          if (modification.operation === 'replace') {
            const regex = new RegExp(modification.input, 'g')
            generatedContent = generatedContent.replace(regex, modification.output)
          }
        }
      }

      expect(generatedContent.trim()).toBe(expectedContent.trim())
    }
  }
  finally {
    // Clean up temp directory
    await fs.promises.rm(tmpDir, { recursive: true, force: true })
  }
}
