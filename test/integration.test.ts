import { asError } from 'catch-unknown'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const execAsync = promisify(exec)

describe('Template Processing Integration Tests', () => {
  const testDir = path.join(__dirname, 'temp-integration')
  const projectRoot = path.dirname(__dirname)
  const cliPath = path.join(projectRoot, 'bin', 'ts-codegen.js')

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

    // Run the build command from test directory so cache file is created there
    const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })

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

    // Run the build command from test directory so cache file is created there
    await execAsync(`node "${cliPath}" build .`, { cwd: testDir })

    // Read and verify the generated content
    const outputFile = path.join(testDir, '_recursive.ts')
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')
    const expectedContent = await fs.promises.readFile(
      path.join(__dirname, 'expected', 'integration-recursive.ts'),
      'utf-8',
    )
    expect(generatedContent.trim()).toBe(expectedContent.trim())
  })

  it('should clean up orphaned output files when templates are removed', async () => {
    // Create a simple template file
    const templateContent = `// This is a generated file from template
// Template: {{taskPathBasename}}

export const generatedMessage = 'This file was generated and should be cleaned up!'
`

    await fs.promises.writeFile(path.join(testDir, '_orphan.ts.hbs'), templateContent)

    // First run: generate the output file
    const { stdout: firstStdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
    expect(firstStdout).toContain('ts-codegen build complete')

    // Verify the output file was created
    const outputFile = path.join(testDir, '_orphan.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Verify the content is correct
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')
    expect(generatedContent).toContain('This file was generated and should be cleaned up!')
    expect(generatedContent).toContain('Template: _orphan.ts.hbs')

    // Verify cache file was created and contains our output file
    const cacheFile = path.join(testDir, '.ts-codegen.cache')
    const cacheExists = await fs.promises.stat(cacheFile).then(() => true).catch(() => false)
    expect(cacheExists).toBe(true)

    const cacheContent = await fs.promises.readFile(cacheFile, 'utf-8')
    expect(cacheContent).toContain('_orphan.ts')

    // Remove the template file to make the output file orphaned
    await fs.promises.unlink(path.join(testDir, '_orphan.ts.hbs'))

    // Second run: should detect orphaned file and clean it up
    const { stdout: secondStdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
    expect(secondStdout).toContain('ts-codegen unlinking orphaned output files')
    expect(secondStdout).toContain('_orphan.ts')
    expect(secondStdout).toContain('ts-codegen build complete')

    // Verify the orphaned output file was removed
    const outputExistsAfterCleanup = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExistsAfterCleanup).toBe(false)

    // Verify the cache was updated (should be empty or not contain the orphaned file)
    const updatedCacheContent = await fs.promises.readFile(cacheFile, 'utf-8')
    expect(updatedCacheContent).not.toContain('_orphan.ts')
  })

  it('should write template parsing errors to output files', async () => {
    // Create a template with invalid Handlebars syntax (will fail during execution)
    const invalidTemplateContent = `// This template has invalid syntax
export const message = '{{invalid{{nested}}'
`

    await fs.promises.writeFile(path.join(testDir, '_parse-error.ts.hbs'), invalidTemplateContent)

    // Run the build command - should handle parsing error gracefully
    const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
    expect(stdout).toContain('ts-codegen build complete')

    // Verify the output file was created with error content
    const outputFile = path.join(testDir, '_parse-error.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Read and verify the error content
    const errorContent = await fs.promises.readFile(outputFile, 'utf-8')
    expect(errorContent).toContain('⚠️  TEMPLATE ERROR ⚠️')
    expect(errorContent).toContain('Template execution error') // Parsing errors show up as execution errors
    expect(errorContent).toContain('Template: ')
    expect(errorContent).toContain('_parse-error.ts.hbs')
    expect(errorContent).toContain('throw new Error(')
    expect(errorContent).toContain('This file contains an error instead of generated code')
    expect(errorContent).toContain('Parse error on line') // Verify it's actually a parsing error
  })

  it('should write template execution errors to output files', async () => {
    // Create a template that compiles but fails during execution
    const failingTemplateContent = `// This template will fail during execution
export const message = '{{nonExistentHelper "test"}}'
`

    await fs.promises.writeFile(path.join(testDir, '_exec-error.ts.hbs'), failingTemplateContent)

    // Run the build command - should handle execution error gracefully
    const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
    expect(stdout).toContain('ts-codegen build complete')

    // Verify the output file was created with error content
    const outputFile = path.join(testDir, '_exec-error.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Read and verify the error content
    const errorContent = await fs.promises.readFile(outputFile, 'utf-8')
    expect(errorContent).toContain('⚠️  TEMPLATE ERROR ⚠️')
    expect(errorContent).toContain('Template execution error')
    expect(errorContent).toContain('Template: ')
    expect(errorContent).toContain('_exec-error.ts.hbs')
    expect(errorContent).toContain('throw new Error(')
    expect(errorContent).toContain('This file contains an error instead of generated code')
    expect(errorContent).toContain('nonExistentHelper')
  })

  it('should support template inclusion with relative paths', async () => {
    // Create a shared template
    await fs.promises.mkdir(path.join(testDir, 'shared'), { recursive: true })
    const sharedTemplateContent = `// Shared template logic
// Entity type: {{entityType}}
export const {{camelcase entityType}}Classes = [
{{#each items}}
  {{this}},
{{/each}}
]`

    await fs.promises.writeFile(path.join(testDir, 'shared', 'entity-template.hbs'), sharedTemplateContent)

    // Create a consumer template that includes the shared one
    const consumerTemplateContent = '{{include "./shared/entity-template.hbs" entityType="User" items=(array "UserService" "UserModel")}}'

    await fs.promises.writeFile(path.join(testDir, '_users.ts.hbs'), consumerTemplateContent)

    // Run the build command
    const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
    expect(stdout).toContain('ts-codegen build complete')

    // Verify the output file was created with included content
    const outputFile = path.join(testDir, '_users.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Read and verify the generated content
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')
    expect(generatedContent).toContain('// Shared template logic')
    expect(generatedContent).toContain('// Entity type: User')
    expect(generatedContent).toContain('export const userClasses = [')
    expect(generatedContent).toContain('UserService,')
    expect(generatedContent).toContain('UserModel,')
  })

  it('should handle include errors gracefully', async () => {
    // Create a template that includes a non-existent file
    const templateContent = '{{include "non-existent-template.hbs"}}'

    await fs.promises.writeFile(path.join(testDir, '_include-error.ts.hbs'), templateContent)

    // Run the build command - should handle include error gracefully
    const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
    expect(stdout).toContain('ts-codegen build complete')

    // Verify the output file was created with error content
    const outputFile = path.join(testDir, '_include-error.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Read and verify the error content
    const errorContent = await fs.promises.readFile(outputFile, 'utf-8')
    expect(errorContent).toContain('⚠️  INCLUDE ERROR ⚠️')
    expect(errorContent).toContain('Template: non-existent-template.hbs')
    expect(errorContent).toContain('Template file not found')
    expect(errorContent).toContain('throw new Error(')
  })

  it('should use readdir from template directory, not working directory', async () => {
    // Create a nested directory structure to test the bug
    await fs.promises.mkdir(path.join(testDir, 'nested', 'subdir'), { recursive: true })

    // Create files in the root test directory (should NOT be found by nested template)
    await fs.promises.writeFile(path.join(testDir, 'rootFile.ts'), 'export class RootFile {}')
    await fs.promises.writeFile(path.join(testDir, 'anotherRoot.ts'), 'export class AnotherRoot {}')

    // Create files in the nested subdirectory (SHOULD be found by nested template)
    await fs.promises.writeFile(path.join(testDir, 'nested', 'subdir', 'file1.ts'), 'export class File1 {}')
    await fs.promises.writeFile(path.join(testDir, 'nested', 'subdir', 'file2.ts'), 'export class File2 {}')
    await fs.promises.writeFile(path.join(testDir, 'nested', 'subdir', 'ignored.txt'), 'text file')

    // Create a template in the nested subdirectory that uses readdir
    const templateContent = `// Files in current directory:
{{#each (readdir "." "*.ts")}}
// Found: {{this}}
{{/each}}

// Generated imports:
{{#each (readdir "." "*.ts")}}
{{#unless (startsWith this "_")}}
import { {{replace (basename this) ".ts" ""}} } from './{{replace this ".ts" ""}}'
{{/unless}}
{{/each}}`

    await fs.promises.writeFile(path.join(testDir, 'nested', 'subdir', '_template.ts.hbs'), templateContent)

    // Run the build command from the test directory (not the nested subdir)
    const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
    expect(stdout).toContain('ts-codegen build complete')

    // Verify the output file was created
    const outputFile = path.join(testDir, 'nested', 'subdir', '_template.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Read and verify the generated content
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')

    // Should find files from the template's directory (nested/subdir), NOT from root
    expect(generatedContent).toContain('// Found: file1.ts')
    expect(generatedContent).toContain('// Found: file2.ts')
    expect(generatedContent).toContain('import { file1 } from \'./file1\'')
    expect(generatedContent).toContain('import { file2 } from \'./file2\'')

    // Should NOT find files from the root directory
    expect(generatedContent).not.toContain('rootFile.ts')
    expect(generatedContent).not.toContain('anotherRoot.ts')
    expect(generatedContent).not.toContain('import { rootFile }')
    expect(generatedContent).not.toContain('import { anotherRoot }')

    // Should not include non-TypeScript files
    expect(generatedContent).not.toContain('ignored.txt')
  })

  describe('.hbs.ts file support', () => {
    it('should process .hbs.ts files with in-place generation', async () => {
      // Create a .hbs.ts file with embedded template
      const hbsTsContent = `// // Generated from: {{taskPathBasename}}
// export const message = 'Hello from {{taskPathBasename}}!'`

      await fs.promises.writeFile(path.join(testDir, 'example.hbs.ts'), hbsTsContent)

      // Run the build command
      const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
      expect(stdout).toContain('ts-codegen build complete')

      // Verify the file was processed in-place
      const outputFile = path.join(testDir, 'example.hbs.ts')
      const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')

      // Should match exact structure with template and generated content
      const expectedContent = `// // Generated from: {{taskPathBasename}}
// export const message = 'Hello from {{taskPathBasename}}!'

// ============= GENERATED CODE =============
// Generated from: example.hbs.ts
export const message = 'Hello from example.hbs.ts!'`

      expect(generatedContent).toBe(expectedContent)
    })

    it('should update .hbs.ts files when template changes', async () => {
      // Create initial .hbs.ts file
      const initialContent = '// export const initial = \'{{taskPathBasename}}\''

      await fs.promises.writeFile(path.join(testDir, 'updateTest.hbs.ts'), initialContent)

      // First build
      await execAsync(`node "${cliPath}" build .`, { cwd: testDir })

      let generatedContent = await fs.promises.readFile(path.join(testDir, 'updateTest.hbs.ts'), 'utf-8')
      const expectedInitialContent = `// export const initial = '{{taskPathBasename}}'

// ============= GENERATED CODE =============
export const initial = 'updateTest.hbs.ts'`

      expect(generatedContent).toBe(expectedInitialContent)

      // Update the template
      const updatedContent = `// export const updated = 'Modified: {{taskPathBasename}}'
// export const count = 42`

      await fs.promises.writeFile(path.join(testDir, 'updateTest.hbs.ts'), updatedContent)

      // Second build
      await execAsync(`node "${cliPath}" build .`, { cwd: testDir })

      generatedContent = await fs.promises.readFile(path.join(testDir, 'updateTest.hbs.ts'), 'utf-8')
      const expectedUpdatedContent = `// export const updated = 'Modified: {{taskPathBasename}}'
// export const count = 42

// ============= GENERATED CODE =============
export const updated = 'Modified: updateTest.hbs.ts'
export const count = 42`

      expect(generatedContent).toBe(expectedUpdatedContent)
    })

    it('should handle .hbs.ts files with template errors gracefully', async () => {
      // Create .hbs.ts file with invalid template
      const errorContent = '// export const broken = \'{{invalidHelper "test"}}\''

      await fs.promises.writeFile(path.join(testDir, 'errorTest.hbs.ts'), errorContent)

      // Run build command
      const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
      expect(stdout).toContain('ts-codegen build complete')

      // Verify error is written to the file
      const generatedContent = await fs.promises.readFile(path.join(testDir, 'errorTest.hbs.ts'), 'utf-8')

      // Test that it starts with the expected structure (template + banner)
      expect(generatedContent.startsWith('// export const broken = \'{{invalidHelper "test"}}\'\n\n// ============= GENERATED CODE =============\n⚠️  TEMPLATE ERROR ⚠️')).toBe(true)
      // Test that it contains the key error message parts
      expect(generatedContent).toContain('Template execution error')
      expect(generatedContent).toContain('errorTest.hbs.ts')
    })

    it('should handle .hbs.ts files with parsing errors gracefully', async () => {
      // Create .hbs.ts file with invalid format (no commented template)
      const invalidContent = 'export const notATemplate = \'this is not a template file\''

      await fs.promises.writeFile(path.join(testDir, 'parseErrorTest.hbs.ts'), invalidContent)

      // Run build command
      const { stdout } = await execAsync(`node "${cliPath}" build .`, { cwd: testDir })
      expect(stdout).toContain('ts-codegen build complete')

      // Verify error is written to the file
      const generatedContent = await fs.promises.readFile(path.join(testDir, 'parseErrorTest.hbs.ts'), 'utf-8')

      // Should have exact error structure
      const expectedContent = `//

// ============= GENERATED CODE =============
⚠️  TEMPLATE ERROR ⚠️

Template: parseErrorTest.hbs.ts
Template compilation error: No template found in .hbs.ts file. Expected lines starting with "// " (comment space)

This file contains an error instead of generated code.
Fix the template to resolve this issue.

Full error details:
Error: No template found in .hbs.ts file. Expected lines starting with "// " (comment space)
    at parseHbsTsFile (/Users/chriswa/ts-intern/dist/hbsTsParser.js:56:15)
    at new CodegenTask (/Users/chriswa/ts-intern/dist/CodegenTask.js:76:70)
    at /Users/chriswa/ts-intern/dist/api.js:53:33
    at _processFilesRecursively (/Users/chriswa/ts-intern/dist/processFilesRecursively.js:51:19)
    at async processFilesRecursively (/Users/chriswa/ts-intern/dist/processFilesRecursively.js:40:5)
    at async build (/Users/chriswa/ts-intern/dist/api.js:51:5)
    at async /Users/chriswa/ts-intern/dist/cli.js:17:13

throw new Error("Template compilation error: No template found in .hbs.ts file. Expected lines starting with \\"// \\" (comment space)");`

      expect(generatedContent).toBe(expectedContent)
    })

    it('should validate generated .hbs.ts files are valid TypeScript', async () => {
      // Create .hbs.ts file that generates valid TypeScript
      const tsContent = `// interface {{capitalize (replace taskPathBasename ".hbs.ts" "")}}Config {
//   name: string;
//   value: number;
// }
//
// export const {{camelcase (replace taskPathBasename ".hbs.ts" "")}}Config: {{capitalize (replace taskPathBasename ".hbs.ts" "")}}Config = {
//   name: '{{taskPathBasename}}',
//   value: 123
// }`

      await fs.promises.writeFile(path.join(testDir, 'validTs.hbs.ts'), tsContent)

      // Run build command
      await execAsync(`node "${cliPath}" build .`, { cwd: testDir })

      // Verify the generated file is valid TypeScript by compiling it
      try {
        await execAsync('npx tsc --noEmit validTs.hbs.ts', { cwd: testDir })
      }
      catch (error) {
        throw new Error(`Generated .hbs.ts file is not valid TypeScript: ${asError(error).message}`)
      }

      // Verify exact content structure
      const generatedContent = await fs.promises.readFile(path.join(testDir, 'validTs.hbs.ts'), 'utf-8')
      const expectedContent = `// interface {{capitalize (replace taskPathBasename ".hbs.ts" "")}}Config {
//   name: string;
//   value: number;
// }
//
// export const {{camelcase (replace taskPathBasename ".hbs.ts" "")}}Config: {{capitalize (replace taskPathBasename ".hbs.ts" "")}}Config = {
//   name: '{{taskPathBasename}}',
//   value: 123
// }

// ============= GENERATED CODE =============
interface ValidTsConfig {
  name: string;
  value: number;
}

export const validTsConfig: ValidTsConfig = {
  name: 'validTs.hbs.ts',
  value: 123
}`

      expect(generatedContent).toBe(expectedContent)
    })
  })
})
