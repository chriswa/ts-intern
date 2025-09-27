import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

describe('CLI End-to-End Tests', () => {
  const testDir = path.join(__dirname, 'temp-test')
  const fixturesDir = path.join(__dirname, 'fixtures')

  beforeEach(async () => {
    // Create a temporary test directory
    await fs.promises.mkdir(testDir, { recursive: true })

    // Copy the test fixture
    const fixtureContent = await fs.promises.readFile(
      path.join(fixturesDir, '_example.ts.hbs'),
      'utf-8'
    )
    await fs.promises.writeFile(
      path.join(testDir, '_example.ts.hbs'),
      fixtureContent
    )
  })

  afterEach(async () => {
    // Clean up the temporary test directory
    await fs.promises.rm(testDir, { recursive: true, force: true })
  })

  it('should build handlebars templates using the CLI', async () => {
    // Run the build command
    const { stdout, stderr } = await execAsync(`node bin/ts-codegen.js build ${testDir}`)

    // Check that the output file was created
    const outputFile = path.join(testDir, '_example.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Check the content of the generated file
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')
    expect(generatedContent).toContain('This is a generated file')
    expect(generatedContent).toContain('Hello from ts-codegen!')
    expect(generatedContent).toContain('Template: _example.ts.hbs')

    // Check that the build completed successfully
    expect(stdout).toContain('ts-codegen build complete')
  })
})