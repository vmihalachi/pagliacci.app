# pagliacci.app

The landing page of [Mister Pagliacci](https://pagliacci.app), a clown who lives in your menu bar (Mac) or notification area (Windows) and tells jokes.

The app itself lives in a private repository; this page is open source. It's plain HTML, CSS and a little
JavaScript, built with [Vite+](https://viteplus.dev/) into one page per language, with no third-party scripts,
fonts or requests (`connect-src 'none'`).

## Build

```sh
pnpm install
vp dev      # http://localhost:5173
vp check    # format, lint, type check
vp build    # dist/
```

- `index.html` is a template: `{{key}}` placeholders are filled from `src/i18n/<language>.json`
  (`vite.config.ts`), and the build fails when a language is missing a key.
- `src/jokes.json` holds the jokes the page tells, and `src/portrait.svg` his portrait.
- `og/` renders the social cards and icons at build time.

## Deploy

`.github/workflows/deploy.yml` checks and builds every push and pull request, and deploys `master` to a
Cloudflare Worker serving static assets (`wrangler.json`, with the headers and CSP in the generated
`_headers`).

## License

The code is MIT; the copy, character, art and recordings are not. See [LICENSE](LICENSE).
