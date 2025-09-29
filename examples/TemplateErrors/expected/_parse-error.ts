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
    at Parser.parseError (***HANDLEBARS_PATH***)
    at Parser.parse (***HANDLEBARS_PATH***)
    at parseWithoutProcessing (***HANDLEBARS_PATH***)
    at HandlebarsEnvironment.parse (***HANDLEBARS_PATH***)
    at compileInput (***HANDLEBARS_PATH***)
    at CodegenTask.ret [as template] (***HANDLEBARS_PATH***)
    at CodegenTask.run (***PROJECT_PATH***)
    at ***PROJECT_PATH***
    at _processFilesRecursively (***PROJECT_PATH***)
    at async processFilesRecursively (***PROJECT_PATH***)