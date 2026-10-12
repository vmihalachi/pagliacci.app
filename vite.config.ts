import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  appleIcon,
  companionLanding,
  escapeAttr,
  escapeHtml,
  scriptJson,
  type Locale,
} from "@deskling/landing";
import { defineConfig } from "vite-plus";
import {
  defaultLanguageCode,
  languages,
  type Language,
  type LanguageCode,
} from "./src/i18n/languages";

const root = __dirname;
const locales = Object.fromEntries(
  languages.map(({ code }) => [
    code,
    JSON.parse(readFileSync(resolve(root, `src/i18n/${code}.json`), "utf8")),
  ]),
) as Record<LanguageCode, any>;

/**
 * His jokes, per language. Drafts until milestone 3 writes the bank: then they come from the app's String
 * Catalog (`phrase.<id>`, `.1`/`.2`) by these ids, as on sunnysays, so the page quotes exactly what he says.
 * `yours` are the jokes a visitor tells him at the end of the page.
 */
type Joke = { id: string; lines: [string] | [string, string] };
const jokes = JSON.parse(readFileSync(resolve(root, "src/jokes.json"), "utf8")) as Record<
  LanguageCode,
  { his: Joke[]; yours: [string, string][] }
>;

/** Mister Pagliacci in a few lines (the menu bar glyph's style), inlined so CSS can switch his moods. */
const portrait = readFileSync(resolve(root, "src/portrait.svg"), "utf8").trim();

const siteUrl = "https://pagliacci.app";
/**
 * The Mac App Store listing. Set it to `https://apps.apple.com/app/id<Apple ID>` once the app is approved;
 * until then the page shows "Coming soon to the Mac App Store" instead of a link.
 */
const appStoreUrl: string | null = null;

/** The store link (`.store`), or "coming soon" while there's no listing. */
function renderStoreButton(locale: Locale) {
  if (!appStoreUrl) {
    return `<span class="store store-soon">${appleIcon}<span>${escapeHtml(locale.store.soon)}</span></span>`;
  }
  return `<a class="store" href="${escapeAttr(appStoreUrl)}">${appleIcon}<span>${escapeHtml(
    locale.store.mac,
  )}</span></a>`;
}

/** A joke's lines as the hero prints them before the script takes over (and for readers without it). */
function renderJoke(joke: Joke) {
  const [first, second] = joke.lines;
  const setup = second ? first : "";
  const punch = second ?? first;
  return `<p class="setup"${setup ? "" : " hidden"}>${escapeHtml(setup)}</p><p class="punch">${escapeHtml(punch)}</p>`;
}

/** The social card's punchline in two lines (SVG text doesn't wrap): split at the space nearest the middle. */
function twoLines(text: string) {
  const spaces = [...text.matchAll(/ /g)].map((match) => match.index!);
  if (!spaces.length) return { punch1: text, punch2: "" };
  const middle = spaces.reduce((best, index) =>
    Math.abs(index - text.length / 2) < Math.abs(best - text.length / 2) ? index : best,
  );
  return { punch1: text.slice(0, middle), punch2: text.slice(middle + 1) };
}

/**
 * The page's plumbing (every language's home page from `index.html`, the legal pages' links, the sitemap, the
 * `_headers` with its CSP, the social cards and icons) is Deskling's (`@deskling/landing`); what's here is his:
 * the languages and URLs, the jokes and the portrait, the store link and the card's joke.
 */
const landing = companionLanding({
  root,
  siteUrl,
  appStoreUrl,
  contactEmail: "hello@pagliacci.app",
  languages,
  defaultLanguageCode,
  locales,
  placeholders: (key, language: Language, locale) => {
    switch (key) {
      case "portrait":
        return portrait;
      case "firstJoke":
        return renderJoke(jokes[language.code].his[0]);
      case "runtimeJson":
        return scriptJson({
          ...locale.runtime,
          jokes: jokes[language.code].his.map(({ lines }) => lines),
          yours: jokes[language.code].yours,
          tell: locale.finale.tell,
          again: locale.finale.again,
          call: locale.hero.call,
          leave: locale.hero.leave,
        });
      default:
        return undefined;
    }
  },
  jsonLd: (language, locale) => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Mister Pagliacci",
    description: locale.meta.description,
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "macOS",
    inLanguage: language.code,
    url: `${siteUrl}${language.path}`,
    image: `${siteUrl}/og-${language.code}.png`,
    ...(appStoreUrl ? { installUrl: appStoreUrl } : {}),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Person", name: "Vlad Mihalachi", url: "https://vmihalachi.com" },
  }),
  languageSwitcher: "inline",
  storeButton: renderStoreButton,
  localeProblems: ({ code }) =>
    jokes[code as LanguageCode]?.his.length ? undefined : `No jokes for ${code} in src/jokes.json`,
  og: {
    dir: resolve(root, "og"),
    iconPath: resolve(root, "public/favicon.svg"),
    fontFamily: "Bodoni Moda",
    iconBackground: "#B8321D",
    // The card prints his first joke, from the same list the page plays.
    copy: (language, locale) => {
      const [first, second] = jokes[language.code].his[0].lines;
      return { ...locale.og, setup: second ? first : "", ...twoLines(second ?? first) };
    },
  },
});

export default defineConfig({
  ...landing,
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
