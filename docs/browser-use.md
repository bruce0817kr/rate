# browser-use setup note

`browser-use` is installed in the local Python environment.
Playwright Chromium is also installed.

## Recommended entry point

Use the wrapper below on Windows:

```powershell
.\scripts\browser-use.ps1 --help
```

## Examples

Open the local app:

```powershell
.\scripts\browser-use.ps1 open http://localhost:3033
```

Read browser state as JSON:

```powershell
.\scripts\browser-use.ps1 --json state
```

Run with a named session:

```powershell
.\scripts\browser-use.ps1 --session rate-qa open http://localhost:3033
```

## Notes

- Global flags like `--session` and `--json` must come before the subcommand.
- `browser-use install` can fail on this machine because it expects `uvx`.
- Chromium runtime was installed with `playwright install chromium`.
