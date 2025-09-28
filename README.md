# @chriswa/ts-codegen

A simple, dynamic TypeScript code generator with development "watch" support.

## What it does

Scans the provided directory (and subdirs) for Handlebars templates with filenames ending in `.hbs` and writes the processed template to an output file of the same name (but with the extension changed from `.hbs` to `.ts`.) Uses [handlebars-helpers](https://github.com/helpers/handlebars-helpers) library for rich template functionality. Probably most useful for generating custom "barrel"-like files, listing all the files/classes in a directory.

## Installation

```bash
pnpm add @chriswa/ts-codegen
```

## Example

Automatically import and register classes in a directory with a factory. In watch mode, the output file will be updated immediately when class files are created, renamed, and deleted.

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
Use powerful combinations for file processing:

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

This package is TypeScript-first - it distributes TypeScript source files and uses [tsx](https://github.com/esbuild-kit/tsx) to run TypeScript directly. This provides:

- ✅ **Better IDE support** - Jump to definitions, IntelliSense
- ✅ **Type safety** - Full TypeScript checking
- ✅ **Faster iteration** - No compilation step for consumers
- ✅ **Modern tooling** - Built for TypeScript projects

## License

MIT
