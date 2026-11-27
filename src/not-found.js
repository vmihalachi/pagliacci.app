import { languages } from "./i18n/languages";

// The host serves this one page for every missing URL, in English. Show it in the visitor's language instead:
// the one in the path, else the one they chose on the site, else their browser's.
const locales = JSON.parse(document.getElementById("not-found-i18n")?.textContent || "{}");

function pickLanguage() {
  const find = (wanted) => {
    const lower = wanted.toLowerCase();
    const base = lower.split("-")[0];
    return (
      languages.find(({ code }) => code.toLowerCase() === lower) ??
      languages.find(({ code }) => code.toLowerCase().split("-")[0] === base)
    );
  };
  const path = location.pathname.toLowerCase();
  const fromPath = languages.find(
    (language) => language.path !== "/" && path.startsWith(language.path),
  );
  let saved = null;
  try {
    saved = localStorage.getItem("lang");
  } catch {}
  return (
    fromPath ||
    (saved && find(saved)) ||
    [...(navigator.languages ?? [navigator.language])].filter(Boolean).map(find).find(Boolean)
  );
}

const language = pickLanguage();
const locale = language && locales[language.code];
if (locale) {
  const text = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  };
  document.documentElement.lang = language.code;
  document.title = locale.metaTitle;
  text('[data-not-found="title"]', locale.title);
  text('[data-not-found="body"]', locale.body);
  text('[data-not-found="home"]', locale.home);
  // The link comes from the build's own list of languages, not from text on the page.
  document.querySelector('[data-not-found="home"]')?.setAttribute("href", language.path);
  // The footer, in the same language: each app's tagline is keyed by its name.
  text(".more-from-label", locale.moreFrom);
  text(".built-on a", locale.builtOn);
  for (const app of document.querySelectorAll(".more-from-apps li")) {
    const name = app.querySelector("a")?.textContent;
    const tagline = app.querySelector(".more-from-tagline");
    if (tagline && locale.taglines?.[name]) tagline.textContent = locale.taglines[name];
  }
}
