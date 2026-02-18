<p align="center">
  <img src="build/icon.png" width="128" height="128" alt="LOLPro Logo">
</p>

# LOLPro

A League of Legends assistant tool based on Electron + React. Currently supports:

- ARAM Mayhem (`aram-mayhem`)
- Arena (`arena`)

Features include client status detection, champion detail pages, in-game overlay, and pinned floating window.

## Data Source Design

### Shared Data (Cross-mode)

- Champion List: Blitz / DDragon (cached by language)
- Basic Champion Info (Name, Title, Lore, Skills, etc.): OP.GG / Blitz champion meta

### Mode-Specific Data

- **Arena** Gameplay Data:
  - `https://lol-api-champion.op.gg/api/{region}/champions/arena/{championId}?tier={arenaTier}`
- **ARAM Mayhem** Gameplay Data:
  - OP.GG page scraping (Next Flight parsing)
  - `/lol/modes/aram-mayhem/{champion}/augments`
  - `/lol/modes/aram-mayhem/{champion}/items`
  - `/lol/modes/aram-mayhem/{champion}/skills`

## Local Cache (SQLite)

- `build_cache`: Mode-specific build cache (by `mode/champion/lang/source_key`)
- `champion_profiles`: Basic champion info cache (mode-independent)
- `mode_tier_lists`: Mode tier list/ranking cache
- `app_meta`: Global KV storage (e.g., Riot version number)

## Shortcuts

- Show/Hide floating window: `Ctrl/Cmd + Shift + T`
- Toggle interaction mode: `Ctrl/Cmd + Shift + I`
- Toggle Augment quality (floating window): `Ctrl/Cmd + Shift + J`

## Development

```bash
pnpm install
pnpm run doctor
pnpm run dev
```

## Running Locally and Packaging

### macOS

```bash
pnpm run dev
pnpm run dist
```

### Windows (PowerShell)

```powershell
pnpm install
pnpm run native:electron
pnpm run dev
pnpm run dist
```

Build artifacts are output to `release/` by default.

## LCU Connection

The project connects to the LCU API on `127.0.0.1` by reading the LoL client's `lockfile` to obtain the port and token.

If connection fails:

- Ensure the LoL client is running.
- You can explicitly specify the lockfile path via the `LOL_LOCKFILE_PATH` environment variable.

### Signing and Notarization

Auto-discovery of signing identities is disabled by default (`CSC_IDENTITY_AUTO_DISCOVERY=false`) to produce unsigned installers reliably.

For official distribution, it is recommended to configure signing parameters in GitHub Secrets:

- macOS: `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `CSC_LINK` / `CSC_KEY_PASSWORD`
- Windows: Code signing certificate related secrets
