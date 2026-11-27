import { languages } from "./i18n/languages";

// The host serves this one page, built in English, for every missing URL. Show it in the visitor's language
// instead: the one in the path, else the one saved on the site, else their browser's. No match keeps English.
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

/** Sets an element's text, when the page has the element and the language has the words. */
function setText(element, text) {
  if (element && text) element.textContent = text;
}

const language = pickLanguage();
const locale = language && locales[language.code];
if (locale) {
  document.documentElement.lang = language.code;
  document.title = locale.metaTitle;
  setText(document.querySelector('[data-not-found="title"]'), locale.title);
  setText(document.querySelector('[data-not-found="body"]'), locale.body);
  const home = document.querySelector('[data-not-found="home"]');
  setText(home, locale.home);
  // The links come from the build's own list of languages, not from text on the page.
  home?.setAttribute("href", language.path);
  document.querySelector(".wordmark")?.setAttribute("href", language.path);
  // The footer: its label, each app's tagline (found by the app's link) and the Laching link.
  setText(document.querySelector(".more-from-label"), locale.moreFrom);
  setText(document.querySelector(".built-on a"), locale.builtOn);
  for (const app of document.querySelectorAll(".more-from-apps li")) {
    const url = app.querySelector("a")?.getAttribute("href");
    setText(app.querySelector(".more-from-tagline"), url && locale.taglines?.[url]);
  }
}
