@echo off
REM Usage: runImportTsvScores.bat <file^|db> [folder]
REM   file : write a .json next to each .tsv
REM   db   : save/update scores via the API (needs TABUH_EMAIL, TABUH_PASSWORD,
REM          and optionally TABUH_API_BASE)
node --experimental-transform-types --loader ./scripts/ts_loader.mjs ./scripts/importTsvScores.ts %1 %2
pause
