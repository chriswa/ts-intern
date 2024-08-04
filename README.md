# ts-intern

A simple, dynamic TS code generator with development "watch" support.

## What it does

Scans the provided directory (and subdirs) for templates with filenames ending in `.codegen.hbs` and writes the processed template to an output file without that suffix.

### Example

Automatically import and register classes in a directory with a factory. In watch mode, the output file will be updated immediately when class files are created, renamed, and deleted.

In `src/things/_index.ts.codegen.hbs`:
```
// ts-intern generated code; see *.codegen.hbs file

import { myFactory } from 'src/factories'

{{#listFiles "." "Base.ts"}}
import { {{basenameNoExt}} } from './{{filePathNoExt}}'
myFactory.registerClass({{basenameNoExt}})
{{/listFiles}}
```

Produces `src/things/_index.ts`:
```
// ts-intern generated code; see *.codegen.hbs file

import { myFactory } from 'src/factories'

import { FooThing } from './FooThing'
myFactory.registerClass(FooThing)
import { BarThing } from './BarThing'
myFactory.registerClass(BarThing)
import { BaazThing } from './BaazThing'
myFactory.registerClass(BaazThing)
```

## Usage

### Usage from CLI:

```
npx ts-intern build src
npx ts-intern watch src
```

### Usage from vite:

In `vite.config.js`:
```
import { vitePluginTsIntern } from 'ts-intern'
export default defineConfig({
  plugins: [
    vitePluginTsIntern('src'),
  ],
})
```
