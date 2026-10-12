/**
 * Every language the landing page is published in, sorted alphabetically by native name (keep it that
 * way: this order drives the language dropdown). `defaultLanguageCode` is served at `/` and used as
 * x-default. To add a language: add an entry here in alphabetical order, create `src/i18n/<code>.json`
 * with the same keys as `en.json`, add its jokes to `src/jokes.json`, a one-line `<path>/index.html` stub
 * (the locale plugin renders it from `/index.html`) and translated `<path>privacy/` and `<path>terms/` pages.
 * On a first visit, browsers whose preferred language matches `code` (or its base language) are sent to `path`.
 */
export const languages = [
  { code: "en", path: "/", label: "EN", nativeName: "English", ogLocale: "en_US" },
  { code: "it", path: "/it/", label: "IT", nativeName: "Italiano", ogLocale: "it_IT" },
] as const;

export type Language = (typeof languages)[number];
export type LanguageCode = Language["code"];

export const defaultLanguageCode: LanguageCode = "en";
