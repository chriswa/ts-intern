import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
      'utf-8',
    )
    await fs.promises.writeFile(
      path.join(testDir, '_example.ts.hbs'),
      fixtureContent,
    )
  })

  afterEach(async () => {
    // Clean up the temporary test directory
    await fs.promises.rm(testDir, { recursive: true, force: true })
  })

  it('should build handlebars templates using the CLI', async () => {
    // Run the build command
    const { stdout } = await execAsync(`node bin/ts-codegen.js build ${testDir}`)

    // Check that the output file was created
    const outputFile = path.join(testDir, '_example.ts')
    const outputExists = await fs.promises.stat(outputFile).then(() => true).catch(() => false)
    expect(outputExists).toBe(true)

    // Check the content of the generated file
    const generatedContent = await fs.promises.readFile(outputFile, 'utf-8')
    const expectedContent = await fs.promises.readFile(
      path.join(__dirname, 'expected', 'cli-example.ts'),
      'utf-8',
    )
    expect(generatedContent.trim()).toBe(expectedContent.trim())

    // Check that the build completed successfully
    expect(stdout).toContain('ts-codegen build complete')
  })
})
