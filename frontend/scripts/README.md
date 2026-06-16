# Run instructions

## runImportTsvScores

Parses the tsv files in the test folder (`frontend/test/scoreparsers/notationParser/data/tabuh-notation`) and saves them
either to file or to the database.

```linux
node --experimental-transform-types --loader ./scripts/ts_loader.mjs ./scripts/importTsvScores.ts <file|db> [folder] --target=<name>
```

`folder` defaults to `frontend/test/scoreparsers/notationParser/data/tabuh-notation`.

`--target`: `local` or `remote`

or alternatively

```linux
npm run import:scores:<target>
```

`target`: `local` or `remote`

### Set up (once)

```linux
cd frontend
cp scripts/.env.example scripts/.env.local
cp scripts/.env.example scripts/.env.remote   # then edit each
```
