// The landing page's only script: Mister Pagliacci telling jokes in the hero (setup with the lights down, a
// 1.2 s beat, the punchline brings the lights up), keeping quiet after Shh, listening to the visitor's
// jokes at the end, and putting their own platform's store first. It fetches nothing and stores only the chosen language.

const i18n = JSON.parse(document.getElementById("runtime-i18n")?.textContent || "{}");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const root = document.documentElement;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// LANGUAGE: a chosen language stops the root page from redirecting by the browser's.
for (const link of document.querySelectorAll("[data-lang]")) {
  link.addEventListener("click", () => {
    try {
      localStorage.setItem("lang", link.dataset.lang);
    } catch {}
  });
}

// STORE BUTTONS: the visitor's own platform leads, the other one steps back to an outline.
const platform = navigator.userAgentData?.platform ?? navigator.platform ?? "";
const ownStore = /^win/i.test(platform) ? "windows" : /^mac/i.test(platform) ? "mac" : null;
if (ownStore) {
  for (const group of document.querySelectorAll(".store-buttons")) {
    const own = group.querySelector(`[data-store="${ownStore}"]`);
    if (!own) continue;
    group.prepend(own);
    for (const other of group.querySelectorAll(`[data-store]:not([data-store="${ownStore}"])`)) {
      other.classList.add("is-alt");
    }
  }
}

// HIS MARK: blinks on a fixed, irregular schedule (the app's rig does the same), sways in CSS.
const marks = [...document.querySelectorAll(".mark[data-mood]")];
const blinkGaps = [3400, 2100, 4700, 2900, 5200, 1800, 3900];
let blinkIndex = 0;
function blink() {
  for (const mark of marks) {
    if (mark.dataset.mood === "laughing") continue;
    mark.classList.add("blink");
    setTimeout(() => mark.classList.remove("blink"), 140);
  }
  setTimeout(blink, blinkGaps[blinkIndex++ % blinkGaps.length]);
}
if (!reduceMotion.matches) setTimeout(blink, blinkGaps[0]);

/** Opens and closes a mark's mouth while he speaks; returns the function that stops it. */
function flapMouth(mark) {
  mark.dataset.mood = "talking";
  let open = false;
  const timer = setInterval(() => {
    open = !open;
    mark.dataset.mouth = open ? "open" : "closed";
  }, 125);
  return () => {
    clearInterval(timer);
    delete mark.dataset.mouth;
  };
}

// LIGHTS: gel 0 is the lights down; 1–5 are the colours the punchlines bring up, in turn.
const gelCount = 5;
let lastGel = gelCount; // so the first punchline brings up gel 1, the card's colour
const themeColor = document.querySelector('meta[name="theme-color"]');
function lights(gel) {
  root.dataset.gel = String(gel);
  if (gel) lastGel = gel;
  setTimeout(
    () =>
      themeColor?.setAttribute(
        "content",
        getComputedStyle(root).getPropertyValue("--field").trim(),
      ),
    reduceMotion.matches ? 0 : 950,
  );
}

// THE HERO
const hero = document.querySelector(".hero");
const jokeBox = hero?.querySelector(".joke");

if (hero && jokeBox && i18n.jokes?.length) {
  const setupLine = jokeBox.querySelector(".setup");
  const punchLine = jokeBox.querySelector(".punch");
  const beat = document.createElement("span");
  beat.className = "beat";
  beat.setAttribute("aria-hidden", "true");
  setupLine.after(beat);
  const aside = hero.querySelector(".aside");
  const mark = hero.querySelector(".mark-hero");
  const another = hero.querySelector('[data-action="another"]');
  const shh = hero.querySelector('[data-action="shh"]');

  // The first joke is the one already printed; the rest come shuffled, never the same twice in a row.
  let queue = [];
  function nextJoke() {
    if (!queue.length) {
      queue = i18n.jokes.map((_, index) => index).sort(() => Math.random() - 0.5);
      if (queue[queue.length - 1] === current) queue.unshift(queue.pop());
    }
    return queue.pop();
  }
  let current = 0;

  let performance = null; // { cancelled } while he speaks
  let shushed = false;
  let interrupted = null; // { index, phase } when Shh cut him off

  /** Splits a line into words that appear one by one at speaking pace. Resolves false if cut off. */
  async function say(line, text, run) {
    line.hidden = false;
    const words = text.split(/(\s+)/).map((part) => {
      if (/^\s+$/.test(part)) return document.createTextNode(part);
      const word = document.createElement("span");
      word.className = "w";
      word.textContent = part;
      return word;
    });
    line.replaceChildren(...words);
    const spoken = words.filter((node) => node.nodeType === 1);
    if (reduceMotion.matches) {
      spoken.forEach((word) => word.classList.add("on"));
      await wait(Math.min(2400, text.length * 30));
      return !run.cancelled;
    }
    const stop = flapMouth(mark);
    try {
      for (const word of spoken) {
        if (run.cancelled) {
          // Stopped mid-word: what was said stays, half of this word and a dash, the rest goes.
          const text = word.textContent;
          word.textContent = text.slice(0, Math.ceil(text.length / 2));
          const dash = document.createElement("span");
          dash.className = "cut";
          dash.textContent = "—";
          word.append(dash);
          word.classList.add("on");
          while (word.nextSibling) word.nextSibling.remove();
          return false;
        }
        word.classList.add("on");
        await wait(70 + word.textContent.length * 52);
      }
      return !run.cancelled;
    } finally {
      stop();
      mark.dataset.mood = shushed ? "hushed" : "awake";
    }
  }

  /** Tells joke `index` from `phase` ("setup" or "punch"): the lights go down for the setup, up on the punch. */
  async function perform(index, phase = "setup") {
    const run = { cancelled: false };
    performance = run;
    current = index;
    another.setAttribute("aria-disabled", "true");
    const [first, second] = i18n.jokes[index];
    const setup = second ? first : "";
    const punch = second ?? first;
    const nextGel = (lastGel % gelCount) + 1;

    beat.classList.remove("on");
    if (phase === "setup") {
      punchLine.replaceChildren();
      setupLine.replaceChildren();
      setupLine.hidden = !setup;
      lights(0);
      await wait(reduceMotion.matches ? 0 : 450);
      if (setup && !(await say(setupLine, setup, run))) return stopped(index, "setup");
      if (run.cancelled) return stopped(index, "setup");
      // The beat: mouth closed, the bubble waits.
      beat.classList.add("on");
      await wait(setup ? 1200 : 500);
      if (run.cancelled) return stopped(index, "punch");
    }
    if (setup) {
      lights(nextGel);
      if (!(await say(punchLine, punch, run))) return stopped(index, "punch");
    } else {
      if (!(await say(punchLine, punch, run))) return stopped(index, "setup");
      lights(nextGel);
    }
    performance = null;
    interrupted = null;
    another.removeAttribute("aria-disabled");
  }

  function stopped(index, phase) {
    performance = null;
    interrupted = { index, phase };
  }

  another.addEventListener("click", () => {
    if (performance || shushed) return;
    aside.textContent = "";
    void perform(nextJoke());
  });

  shh.addEventListener("click", async () => {
    shushed = !shushed;
    shh.setAttribute("aria-pressed", String(shushed));
    shh.textContent = shushed ? i18n.wake : i18n.shh;
    if (shushed) {
      root.dataset.shh = "on";
      mark.dataset.mood = "hushed";
      another.setAttribute("aria-disabled", "true");
      if (performance) {
        performance.cancelled = true;
        aside.textContent = i18n.shhCut;
      } else {
        aside.textContent = i18n.shhQuiet;
      }
      return;
    }
    delete root.dataset.shh;
    mark.dataset.mood = "awake";
    if (interrupted) {
      const { index, phase } = interrupted;
      aside.textContent = i18n.wakeResume;
      await wait(reduceMotion.matches ? 300 : 1100);
      if (shushed) return;
      void perform(index, phase);
    } else {
      aside.textContent = i18n.woken;
      another.removeAttribute("aria-disabled");
    }
  });

  // First joke: the printed one, told from the top.
  jokeBox.classList.add("ready");
  if (reduceMotion.matches) {
    lights(1);
  } else {
    void perform(0);
  }
}

// THE FINALE: the visitor tells him a joke. Deadpan, then a hint, then he cracks.
const finale = document.querySelector(".finale");
const tell = finale?.querySelector('[data-action="tell"]');
if (finale && tell && i18n.yours?.length) {
  const talk = finale.querySelector(".talk");
  const mark = finale.querySelector(".mark-big");
  const moods = ["deadpan", "awake", "laughing"];
  let told = 0;
  let busy = false;

  const line = (className, text) => {
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = text;
    return paragraph;
  };

  tell.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    const [setup, punch] = i18n.yours[told % i18n.yours.length];
    mark.dataset.mood = "awake";
    talk.replaceChildren(line("you", setup));
    await wait(reduceMotion.matches ? 400 : 1600);
    talk.append(line("you", punch));
    await wait(reduceMotion.matches ? 300 : 1100);
    const step = Math.min(told, moods.length - 1);
    talk.append(line("his", i18n.reactions[step]));
    mark.dataset.mood = moods[step];
    told += 1;
    if (told >= moods.length) tell.hidden = true;
    else tell.textContent = i18n.again;
    busy = false;
  });
}
