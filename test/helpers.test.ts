import '../src/handlebarsHelpers' // Load the helpers
import Handlebars from 'handlebars'
import { describe, expect, it } from 'vitest'

describe('Handlebars Helpers Unit Tests', () => {
  describe('pascalcase helper', () => {
    it('should preserve existing case in camelCase words', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: 'fooBarBaz' })).toBe('FooBarBaz')
    })

    it('should handle space-separated words', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: 'foo bar baz' })).toBe('FooBarBaz')
    })

    it('should handle dash-separated words', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: 'foo-bar-baz' })).toBe('FooBarBaz')
    })

    it('should handle underscore-separated words', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: 'foo_bar_baz' })).toBe('FooBarBaz')
    })

    it('should handle mixed separators', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: 'foo-bar_baz qux' })).toBe('FooBarBazQux')
    })

    it('should handle already PascalCase input', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: 'FooBarBaz' })).toBe('FooBarBaz')
    })

    it('should handle single word', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: 'foo' })).toBe('Foo')
    })

    it('should handle empty string', () => {
      const template = Handlebars.compile('{{pascalcase input}}')
      expect(template({ input: '' })).toBe('')
    })
  })

  describe('camelcase helper', () => {
    it('should preserve existing case in camelCase words', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: 'fooBarBaz' })).toBe('fooBarBaz')
    })

    it('should handle space-separated words', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: 'foo bar baz' })).toBe('fooBarBaz')
    })

    it('should handle dash-separated words', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: 'foo-bar-baz' })).toBe('fooBarBaz')
    })

    it('should handle underscore-separated words', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: 'foo_bar_baz' })).toBe('fooBarBaz')
    })

    it('should handle mixed separators', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: 'foo-bar_baz qux' })).toBe('fooBarBazQux')
    })

    it('should handle PascalCase input', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: 'FooBarBaz' })).toBe('fooBarBaz')
    })

    it('should handle single word', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: 'Foo' })).toBe('foo')
    })

    it('should handle empty string', () => {
      const template = Handlebars.compile('{{camelcase input}}')
      expect(template({ input: '' })).toBe('')
    })
  })

  describe('array helper', () => {
    it('should create array from multiple arguments', () => {
      const template = Handlebars.compile('{{#each (array "a" "b" "c")}}{{this}}{{/each}}')
      expect(template({})).toBe('abc')
    })

    it('should handle single argument', () => {
      const template = Handlebars.compile('{{#each (array "single")}}{{this}}{{/each}}')
      expect(template({})).toBe('single')
    })

    it('should handle empty array', () => {
      const template = Handlebars.compile('{{#each (array)}}{{this}}{{/each}}')
      expect(template({})).toBe('')
    })

    it('should work with variables', () => {
      const template = Handlebars.compile('{{#each (array var1 var2)}}{{this}}{{/each}}')
      expect(template({ var1: 'hello', var2: 'world' })).toBe('helloworld')
    })

    it('should work with mixed types', () => {
      const template = Handlebars.compile('{{#each (array "string" 123 true)}}{{this}}{{/each}}')
      expect(template({})).toBe('string123true')
    })
  })
})