⚠️  TEMPLATE ERROR ⚠️

Template: _parse-error.ts.hbs
Template execution error: Parse error on line 2:
... const message = '{{invalid{{nested}}'
-----------------------^
Expecting 'ID', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

This file contains an error instead of generated code.
Fix the template to resolve this issue.

Full error details:
Error: Parse error on line 2:
... const message = '{{invalid{{nested}}'
-----------------------^
Expecting 'ID', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'
    at Parser.parseError (/Users/chriswa/ts-intern/node_modules/.pnpm/handlebars@4.7.8/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:267:19)
    at Parser.parse (/Users/chriswa/ts-intern/node_modules/.pnpm/handlebars@4.7.8/node_modules/handlebars/dist/cjs/handlebars/compiler/parser.js:336:30)
    at parseWithoutProcessing (/Users/chriswa/ts-intern/node_modules/.pnpm/handlebars@4.7.8/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:46:33)
    at HandlebarsEnvironment.parse (/Users/chriswa/ts-intern/node_modules/.pnpm/handlebars@4.7.8/node_modules/handlebars/dist/cjs/handlebars/compiler/base.js:52:13)
    at compileInput (/Users/chriswa/ts-intern/node_modules/.pnpm/handlebars@4.7.8/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:508:19)
    at CodegenTask.ret [as template] (/Users/chriswa/ts-intern/node_modules/.pnpm/handlebars@4.7.8/node_modules/handlebars/dist/cjs/handlebars/compiler/compiler.js:517:18)
    at CodegenTask.run (/Users/chriswa/ts-intern/dist/CodegenTask.js:102:41)
    at /Users/chriswa/ts-intern/dist/api.js:54:25
    at _processFilesRecursively (/Users/chriswa/ts-intern/dist/processFilesRecursively.js:51:19)
    at async processFilesRecursively (/Users/chriswa/ts-intern/dist/processFilesRecursively.js:40:5)

throw new Error("Template execution error: Parse error on line 2:\n... const message = '{{invalid{{nested}}'\n-----------------------^\nExpecting 'ID', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'");