import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const execAsync = promisify(exec)

describe('Template Processing Integration Tests', () => {
  const testDir = path.join(__dirname, 'temp-integration')

  beforeEach(async () => {
    // Clean up and create fresh test directory
    await fs.promises.rm(testDir, { recursive: true, force: true })
    await fs.promises.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up the temporary test directory
    await fs.promises.rm(testDir, { recursive: true, force: true })
  })

  it('should process templates with new handlebars-helpers syntax', async () => {
    // Create test template
    const templateContent = `// Generated imports:
{{#each (match (readdirRecursive ".") "*.ts")}}
{{#unless (contains (array "_example.ts.hbs" "_example.ts" "output1.ts" "output2.ts") this)}}
import { _{{replace (basename this) ".ts" ""}} } from './{{replace this ".ts" ""}}'
{{/unless}}
{{/each}}

// This is a generated file
// Template: {{taskPathBasename}}

export const message = 'Hello from ts-codegen!'

// Generated classes:
{{#each (match (readdirRecursive ".") "*.ts")}}
{{#unless (contains (array "_example.ts.hbs" "_example.ts" "output1.ts" "output2.ts") this)}}
// Found file: {{this}}
{{/unless}}
{{/each}}
`

    await fs.promises.writeFile(path.join(testDir, '_example.ts.hbs'), templateContent)

    // Create some test TypeScript files
    await fs.promises.writeFile(path.join(testDir, 'TestClass.ts'), 'export class TestClass {}')
    await fs.promises.writeFile(path.join(testDir, 'AnotherClass.ts'), 'export class AnotherClass {}')
    await fs.promises.writeFile(path.join(testDir, 'output1.ts'), 'export class ShouldBeSkipped {}') // Should be skipped

    // Run the build command
    const { stdout } = await execAsync(`node bin/ts-codegen.js build ${testDir}`)

    // Check that the build completed successfully
    expect(stdout).toContain('ts-codegen build complete')

    // Check that the output file was created
    const outputFile = path.join(testDir, '_example.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Read and verify the generated content
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')
    const expectedContent = await fs.promises.readFile(
      path.join(__dirname, 'expected', 'integration-example.ts'),
      'utf-8',
    )
    expect(generatedContent.trim()).toBe(expectedContent.trim())
  })

  it('should handle subdirectories recursively', async () => {
    // Create test template for recursive directory scanning
    const templateContent = `// Recursive directory test
{{#each (readdirRecursive ".")}}
// {{this}}
{{/each}}
`

    await fs.promises.writeFile(path.join(testDir, '_recursive.ts.hbs'), templateContent)

    // Create nested directory structure
    await fs.promises.mkdir(path.join(testDir, 'subdir'), { recursive: true })
    await fs.promises.mkdir(path.join(testDir, 'subdir', 'nested'), { recursive: true })

    await fs.promises.writeFile(path.join(testDir, 'root.ts'), 'export class Root {}')
    await fs.promises.writeFile(path.join(testDir, 'subdir', 'sub.ts'), 'export class Sub {}')
    await fs.promises.writeFile(path.join(testDir, 'subdir', 'nested', 'deep.ts'), 'export class Deep {}')

    // Run the build command
    await execAsync(`node bin/ts-codegen.js build ${testDir}`)

    // Read and verify the generated content
    const outputFile = path.join(testDir, '_recursive.ts')
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')
    const expectedContent = await fs.promises.readFile(
      path.join(__dirname, 'expected', 'integration-recursive.ts'),
      'utf-8',
    )
    expect(generatedContent.trim()).toBe(expectedContent.trim())
  })
})
