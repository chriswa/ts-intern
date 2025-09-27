import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

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
    const templateContent = `// This is a generated file
// Template: {{taskPathBasename}}

export const message = 'Hello from ts-codegen!'

// Generated imports:
{{#each (match (readdirRecursive ".") "*.ts")}}
{{#unless (contains (array "_example.ts.hbs" "_example.ts" "output1.ts" "output2.ts") this)}}
import { {{replace (basename this) ".ts" ""}} } from './{{replace this ".ts" ""}}'
{{/unless}}
{{/each}}

// Generated classes:
{{#each (match (readdirRecursive ".") "*.ts")}}
{{#unless (contains (array "_example.ts.hbs" "_example.ts" "output1.ts" "output2.ts") this)}}
// Found file: {{this}}
{{/unless}}
{{/each}}`

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

    // Should contain the static content
    expect(generatedContent).toContain('This is a generated file')
    expect(generatedContent).toContain('Hello from ts-codegen!')
    expect(generatedContent).toContain('Template: _example.ts.hbs')

    // Should contain imports for the test files (but not the excluded ones)
    expect(generatedContent).toContain('import { TestClass } from \'./TestClass\'')
    expect(generatedContent).toContain('import { AnotherClass } from \'./AnotherClass\'')
    expect(generatedContent).not.toContain('output1.ts') // Should be excluded

    // Should contain found file comments
    expect(generatedContent).toContain('// Found file: TestClass.ts')
    expect(generatedContent).toContain('// Found file: AnotherClass.ts')

    // Should not process output1.ts (which should be excluded)
    expect(generatedContent).not.toContain('import { ShouldBeSkipped }')
  })

  it('should handle subdirectories recursively', async () => {
    // Create test template for recursive directory scanning
    const templateContent = `// Recursive directory test
{{#each (readdirRecursive ".")}}
// {{this}}
{{/each}}`

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

    // Should find files at all levels
    expect(generatedContent).toContain('// root.ts')
    expect(generatedContent).toContain('// subdir/sub.ts')
    expect(generatedContent).toContain('// subdir/nested/deep.ts')
  })
})