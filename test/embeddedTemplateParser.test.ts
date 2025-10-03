import { assembleEmbeddedTemplateFile, GENERATED_BANNER, parseEmbeddedTemplateFile } from '../src/embeddedTemplateParser'
import { describe, expect, it } from 'vitest'

describe('embeddedTemplateParser', () => {
  describe('parseEmbeddedTemplateFile', () => {
    it('should extract template from commented lines', () => {
      const content = `// export const message = 'Hello {{name}}!'
// export const value = {{count}}`

      const result = parseEmbeddedTemplateFile(content)

      expect(result.template).toBe(`export const message = 'Hello {{name}}!'
export const value = {{count}}`)
      expect(result.prelude).toBe(`// export const message = 'Hello {{name}}!'
// export const value = {{count}}`)
      expect(result.hasGeneratedContent).toBe(false)
    })

    it('should handle blank line ending template', () => {
      const content = `// export const first = '{{value1}}'
// export const second = '{{value2}}'

const someCode = 'after template'`

      const result = parseEmbeddedTemplateFile(content)

      expect(result.template).toBe(`export const first = '{{value1}}'
export const second = '{{value2}}'`)
      expect(result.prelude).toBe(`// export const first = '{{value1}}'
// export const second = '{{value2}}'`)
      expect(result.hasGeneratedContent).toBe(false)
    })

    it('should handle non-comment line ending template', () => {
      const content = `// export const template = '{{value}}'
const regularCode = 'this ends the template'`

      const result = parseEmbeddedTemplateFile(content)

      expect(result.template).toBe('export const template = \'{{value}}\'')
      expect(result.prelude).toBe('// export const template = \'{{value}}\'')
      expect(result.hasGeneratedContent).toBe(false)
    })

    it('should handle files with existing generated content', () => {
      const content = `// export const message = 'Hello {{name}}!'

${GENERATED_BANNER}
export const message = 'Hello World!'`

      const result = parseEmbeddedTemplateFile(content)

      expect(result.template).toBe('export const message = \'Hello {{name}}!\'')
      expect(result.prelude).toBe('// export const message = \'Hello {{name}}!\'')
      expect(result.hasGeneratedContent).toBe(true)
    })

    it('should handle complex template with multiple sections', () => {
      const content = `// {{#each items}}
// export const {{name}} = '{{value}}';
// {{/each}}
//
// export const count = {{items.length}}`

      const result = parseEmbeddedTemplateFile(content)

      expect(result.template).toBe(`{{#each items}}
export const {{name}} = '{{value}}';
{{/each}}

export const count = {{items.length}}`)
      expect(result.hasGeneratedContent).toBe(false)
    })

    it('should throw error when no template found', () => {
      const content = `const regularCode = 'no template here'
export const value = 123`

      expect(() => parseEmbeddedTemplateFile(content)).toThrow('No template found in .hbs.ts file')
    })

    it('should handle template ending at EOF', () => {
      const content = '// export const last = \'{{value}}\''

      const result = parseEmbeddedTemplateFile(content)

      expect(result.template).toBe('export const last = \'{{value}}\'')
      expect(result.prelude).toBe('// export const last = \'{{value}}\'')
      expect(result.hasGeneratedContent).toBe(false)
    })

    it('should preserve prelude before generated banner', () => {
      const content = `// export const template = '{{value}}'

import { helper } from './utils'

${GENERATED_BANNER}
export const template = 'Hello!'`

      const result = parseEmbeddedTemplateFile(content)

      expect(result.template).toBe('export const template = \'{{value}}\'')
      expect(result.prelude).toBe(`// export const template = '{{value}}'

import { helper } from './utils'`)
      expect(result.hasGeneratedContent).toBe(true)
    })
  })

  describe('assembleEmbeddedTemplateFile', () => {
    it('should combine prelude and generated content correctly', () => {
      const prelude = '// export const message = \'Hello {{name}}!\''
      const generatedContent = 'export const message = \'Hello World!\''

      const result = assembleEmbeddedTemplateFile(prelude, generatedContent)

      expect(result).toBe(`// export const message = 'Hello {{name}}!'

${GENERATED_BANNER}
export const message = 'Hello World!'
`)
    })

    it('should handle multiline content correctly', () => {
      const prelude = `// interface Config {
//   name: string;
// }
// export const config: Config = { name: '{{name}}' }`
      const generatedContent = `interface Config {
  name: string;
}
export const config: Config = { name: 'test' }`

      const result = assembleEmbeddedTemplateFile(prelude, generatedContent)

      expect(result).toBe(`// interface Config {
//   name: string;
// }
// export const config: Config = { name: '{{name}}' }

${GENERATED_BANNER}
interface Config {
  name: string;
}
export const config: Config = { name: 'test' }
`)
    })
  })
})
