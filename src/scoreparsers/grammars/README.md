These grammar files are used by the Lezer library to parse notation files. Each grammar should be declared in a separate
folder. Then

```command
.\node_modules\.bin\lezer-generator.ps1 <grammar file path> -o .\<grammar file path>\<grammar name> --typeScript
```

e.g.

```
.\node_modules\.bin\lezer-generator.ps1 .\src\scoreparsers\grammars\tabuh\tabuh.grammar -o .\src\scoreparsers\grammars\tabuh\tabuh --typeScript
```

Where `<grammar file path>` is the path to the grammar's `*.grammar` file. Use the grammar's folder name for the
`<grammar name>` value.

add option `--names` to make the tool include term names in the output, to help debugging.
