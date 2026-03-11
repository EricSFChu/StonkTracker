# StonkTracker

SQLite-backed Next.js portfolio tracker for stocks, ETFs, and crypto symbols.

## Features

- Save holdings across `Individual`, `Crypto`, `Trad IRA`, `Roth IRA`, and `401(k)` accounts
- Persist everything locally in `data/stonktracker.sqlite`
- Refresh quotes only when the user presses a button
- Use Twelve Data with a free API key and stale-first batched refreshes
- Fall back to Yahoo Finance when no key is configured
- View account allocation, top positions, and a simple future value projection

## Run

```bash
yarn install
yarn dev
```

Open `http://localhost:3000`.

## Windows

You can run the app the same way from PowerShell or Command Prompt. No WSL is required.

```powershell
yarn install
yarn dev
```

Notes:

- The SQLite database is still created locally at `data/stonktracker.sqlite`
- `.env` or `.env.local` works the same on Windows
- If `yarn install` fails on `better-sqlite3`, switch to an LTS version of Node and try again
- `better-sqlite3` ships prebuilt binaries for LTS Node versions; if your machine still tries to build from source, install Visual Studio Build Tools and Python, then rerun `yarn install`

## Optional API key

For more reliable quote refreshes, create a free Twelve Data API key and set it before starting the app.
Place your key in a .env file in the root folder.

## Quote source

The app prefers Twelve Data when `TWELVE_DATA_API_KEY` is configured. Without that key, it falls back to Yahoo Finance's unofficial quote endpoint, which can rate limit aggressively.

## API limitations

- Twelve Data `Basic` is currently limited to `8` API credits per minute and `800` per day
- Quote usage is charged per symbol, not per HTTP request. A refresh for `AAPL,MSFT,TSLA` uses `3` credits
- This app refreshes distinct symbols only, so duplicate holdings do not multiply API usage
- When Twelve Data is active, the app refreshes the most stale symbols first in batches of `8`, then waits `65` seconds before the next batch
- Large portfolios can therefore take multiple minutes to fully refresh on the free tier
- If the minute or daily quota is exhausted, Twelve Data may return rate-limit errors or no usable quotes for that batch
- The Yahoo Finance fallback is unofficial and best-effort only; rate limiting and symbol coverage are less predictable

Official docs:

- https://twelvedata.com/pricing
- https://support.twelvedata.com/en/articles/5615854-credits
- https://support.twelvedata.com/en/articles/5203360-batch-api-requests
- https://support.twelvedata.com/en/articles/5713553-control-over-api-usage
