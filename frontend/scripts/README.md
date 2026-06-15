# Run instructions

## runImportTsvScores

Parses the tsv files in the test folder (`frontend/test/scoreparsers/notationParser/data/tabuh-notation`) and saves them
either to file or to the database.

```linux
node --experimental-transform-types --loader ./scripts/ts_loader.mjs ./scripts/importTsvScores.ts <file|db> [folder]
```

`folder` defaults to `frontend/test/scoreparsers/notationParser/data/tabuh-notation`.
