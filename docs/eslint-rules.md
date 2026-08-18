# ESLint Rule Set

`src/eslint-rules.ts` holds the eslint, import, and typescript-eslint rules this project considers correct, separately from the plugin.
It is published as the `./eslint-rules` export.

Its default export has a `recommended` property, which is a list of flat configs rather than a single one, so it is spread rather than listed.

```js
// eslint.config.js
import eslintRules from '@whaaaley/looks-good/eslint-rules'
import looksGood from '@whaaaley/looks-good'

export default [
  ...eslintRules.recommended,
  looksGood.configs.recommended,
]
```

It covers `@eslint/js` recommended, the `import-x` rules including a configured `import-x/order`, and the `typescript-eslint` strict set.
It is independent of the plugin, so a consumer can take either one alone.

**The plugin ships its own port of `import-x/order` as `looks-good/import-group-order`.**
Enabling both reports the same import twice, so take the `import-x/order` configured here or the port, never the two together.
The port exists for projects running oxlint, which has no equivalent rule.
Its differences from the original are in [Rules](rules.md#import-group-order).

## Related Docs

- [Configs](configs.md) - the plugin's own configs, which this set sits alongside
- [Rules](rules.md) - the plugin's rules, including the `import-x/order` port
