// What the runtime proof installs, which runtimes it runs, and which tests it runs under them.

// The dependencies this package imports, with JSR ones as the npm aliases npm.jsr.io serves.
// Deno reads these from deno.json, but Node and Bun need a package.json to resolve them.
export const dependencies: Record<string, string> = {
  '@std/assert': 'npm:@jsr/std__assert@^1.0.19',
  '@std/path': 'npm:@jsr/std__path@^1.1.6',
  '@typescript-eslint/parser': '^8.67.0',
  'eslint': '^10.8.1',
  'mdast-util-from-markdown': '^2.0.3',
  'minimatch': '^10.2.6',
  'nlcst-to-string': '^4.0.0',
  'parse-english': '^7.0.0',
}

// Once a package.json exists Deno switches to node-modules resolution and needs these types.
// The proof installs them even though the runtimes themselves do not read types.
export const devDependencies: Record<string, string> = {
  '@types/node': '^26.2.0',
}

// A published version is verified against the LTS line and the current line.
export const nodeVersions = ['24.19.0', '26.7.0']

// src/index.test.ts walks the docs with Deno.readDir to check every rule is documented.
// It is deliberately Deno only and is not part of what the other runtimes prove.
// Node takes a glob and Bun takes a directory, so each runtime gets the form it accepts.
export const nodeTestGlobs = ['src/utils/**/*.test.ts', 'src/rules/**/*.test.ts']

export const bunTestPaths = ['src/utils/', 'src/rules/']

// Source directories copied into the staging directory, in repository order.
export const sourceDirectories = ['src']
