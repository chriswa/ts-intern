# @chriswa/ts-codegen

A simple, dynamic TypeScript code generator with development "watch" support.

## What it does

Scans the provided directory (and subdirs) for Handlebars templates and generates TypeScript code. Supports two template formats:

1. **Standalone templates** (`.hbs` files) - `example.hbs` generates `example.ts`
2. **Embedded templates** (`.hbs.ts` files) - Template and generated code in the same file

Uses [handlebars-helpers](https://github.com/helpers/handlebars-helpers) library for template functionality. Primarily used for listing files in a directory and importing them, often with registration in factories or registries.

## Installation

```bash
pnpm add @chriswa/ts-codegen
```

## Example

Import and register classes in a directory with a factory. In watch mode, the output file is updated when class files are created, renamed, and deleted.

**Template:** `src/things/_index.ts.hbs`
```handlebars
// Generated code - see *.hbs file

import { myFactory } from '../factories'

// Auto-import all TypeScript files in this directory (excluding templates and outputs)
{{#each (match (readdirRecursive ".") "*.ts")}}
{{#unless (contains (array "_index.ts" "_index.ts" "Base.ts") this)}}
import { {{replace (basename this) ".ts" ""}} } from './{{replace this ".ts" ""}}'
{{/unless}}
{{/each}}

// Register all classes with the factory
{{#each (match (readdirRecursive ".") "*.ts")}}
{{#unless (contains (array "_index.ts" "_index.ts" "Base.ts") this)}}
myFactory.registerClass({{replace (basename this) ".ts" ""}})
{{/unless}}
{{/each}}
```

**Generated:** `src/things/_index.ts`
```typescript
// Generated code - see *.hbs file

import { myFactory } from '../factories'

// Auto-import all TypeScript files in this directory (excluding templates and outputs)
import { FooThing } from './FooThing'
import { BarThing } from './BarThing'
import { BaazThing } from './BaazThing'

// Register all classes with the factory
myFactory.registerClass(FooThing)
myFactory.registerClass(BarThing)
myFactory.registerClass(BaazThing)
```

## Embedded Templates

Embedded templates (`.hbs.ts` files) are an alternative to standalone templates where the template and generated code exist in the same file. The template (as comments) comes first, followed by the generated code.

**Before Processing:** `src/config.hbs.ts`
```typescript
// export const message = 'Hello from World!'
// export const template = '{{taskPathBasename}}'

// ============= GENERATED CODE =============
// This section will be replaced by the code generator
```

**After Processing:** `src/config.hbs.ts`
```typescript
// export const message = 'Hello from World!'
// export const template = '{{taskPathBasename}}'

// ============= GENERATED CODE =============
export const message = 'Hello from World!'
export const template = 'config.hbs.ts'
```

**Format:**
- Template is written as TypeScript comments (lines starting with `// `)
- Generated code replaces content after `// ============= GENERATED CODE =============`
- File is processed in-place, preserving the template for future regeneration

## Template Helpers

This package includes all [handlebars-helpers](https://github.com/helpers/handlebars-helpers) plus custom helpers:

### `readdirRecursive`
Recursively reads directory contents and returns file paths relative to the template location.

```handlebars
{{#each (readdirRecursive ".")}}
// Found: {{this}}
{{/each}}
```

### Combined with handlebars-helpers
Combine helpers for file processing:

```handlebars
{{#each (match (readdirRecursive ".") "*.ts")}}
{{#unless (contains (array "excluded.ts" "another.ts") this)}}
// Process: {{this}}
{{/unless}}
{{/each}}
```

Common helpers include:
- `match` - Filter arrays with glob patterns
- `contains` - Check if array contains value
- `unless` - Conditional exclusion
- `array` - Create arrays
- `basename` - Get filename from path
- `replace` - String replacement

### `include`
Include and process other template files with parameter passing. Supports relative paths and TypeScript path mapping.

```handlebars
{{include "./shared/entity-template.hbs" entityType="User" items=(array "UserService" "UserModel")}}
```

**Path Resolution:**
- **Relative paths**: `./shared/template.hbs`, `../common/template.hbs`
- **TypeScript paths**: `@/shared/template.hbs` (requires tsconfig.json with path mapping)

**Template Composition Example:**

**Shared Template** (`shared/entity-template.hbs`):
```handlebars
// Auto-generated {{entityType}} entities
{{#each items}}
import { {{this}} } from './{{this}}'
{{/each}}

export const {{camelcase entityType}}Classes = [
{{#each items}}
  {{this}},
{{/each}}
]
```

**Consumer Templates:**
```handlebars
{{include "./shared/entity-template.hbs" entityType="User" items=(array "UserService" "UserModel")}}
```
```handlebars
{{include "@/shared/entity-template.hbs" entityType="Product" items=(array "ProductService" "ProductModel")}}
```

## Examples

For comprehensive examples of how to use ts-codegen, see the [`examples/`](./examples/) directory. Each example contains:

- `input/` - Template files and supporting code
- `expected/` - Expected generated output
- `meta/` - Configuration for handling non-deterministic content (when applicable)

**Available Examples:**
- [`Basic/`](./examples/Basic/) - Simple template variable substitution
- [`HandlebarsHelpers/`](./examples/HandlebarsHelpers/) - Using helpers for file processing
- [`EmbeddedTemplateErrors/`](./examples/EmbeddedTemplateErrors/) - Error handling in embedded templates
- [`IncludeErrors/`](./examples/IncludeErrors/) - Include template error scenarios
- [`OrphanedFiles/`](./examples/OrphanedFiles/) - Automatic cleanup of deleted templates
- [`PathMapping/`](./examples/PathMapping/) - TypeScript path mapping with includes
- [`ReaddirFromTemplateDir/`](./examples/ReaddirFromTemplateDir/) - Directory-relative helpers
- [`Subdirectories/`](./examples/Subdirectories/) - Recursive template processing
- [`TemplateInclusion/`](./examples/TemplateInclusion/) - Template composition with includes

Run the examples with: `pnpm test` (runs all examples as tests)

## Usage

### CLI Usage

```bash
# Build once
npx ts-codegen build src

# Watch for changes
npx ts-codegen watch src

# Clean generated files
npx ts-codegen clean src
```

### Programmatic Usage

```typescript
import { build, watch, clean } from '@chriswa/ts-codegen'

// Build templates
await build('src')

// Watch for changes
watch('src')

// Clean generated files
clean('src')
```

### Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { tsCodegenVitePlugin } from '@chriswa/ts-codegen'

export default defineConfig({
  plugins: [
    tsCodegenVitePlugin('src'),
  ],
})
```

## TypeScript-First

This package distributes TypeScript source files and uses [tsx](https://github.com/esbuild-kit/tsx) to run TypeScript directly. This provides IDE support, type safety, and eliminates compilation steps for consumers.

## License

MIT
