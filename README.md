# Kotoba Room

Kotoba Room is a local-first ambient workspace for Japanese text. It is a static Vite application with Write and Read modes, local documents, slowly shifting environments, and optional generated ambient sound.

## Development

```sh
npm install
npm run dev
```

Build the deployable site with `npm run build`. The output is in `dist/`. For a project Pages site, set the repository path at build time:

```sh
BASE_PATH=/kotoba-room/ npm run build
```

## GitHub Pages

Publish `dist/` using the Pages workflow or `gh-pages`.

All document and mixer data stays in the browser's localStorage. Version one intentionally excludes dictionary lookup, furigana, AI, accounts, sync, gamification, and external audio/assets.
