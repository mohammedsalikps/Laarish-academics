// @vitest-environment node
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Vercel type-checks each serverless function (api/*.ts) with its own settings: not strict, and
 * ES2020 library types. The project's own check is strict, so code can pass here and still print
 * errors in the Vercel build log (16 Nov 2026: three errors, none of them runtime faults). This test
 * repeats Vercel's check so those messages cannot come back unnoticed.
 */
const ROOT = resolve(__dirname, '..');

describe('Vercel serverless functions', () => {
  it('type-check cleanly with the settings Vercel uses for api/*.ts', () => {
    const entries = readdirSync(join(ROOT, 'api'))
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => join(ROOT, 'api', f));
    expect(entries.length).toBeGreaterThan(0);
    const program = ts.createProgram(entries, {
      noEmit: true,
      strict: false,
      target: ts.ScriptTarget.ES2020,
      lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
      skipLibCheck: true,
      types: ['node'],
      ignoreDeprecations: '6.0',
    });
    const errors = ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .map((d) => {
        const where = d.file ? `${relative(ROOT, d.file.fileName)}(${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1})` : '';
        return `${where}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
      });
    expect(errors).toEqual([]);
  }, 60_000);
});
