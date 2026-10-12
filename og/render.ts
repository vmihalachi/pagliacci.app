import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { Plugin } from "vite-plus";

type OgCopy = Record<string, string>;

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function createRenderer(ogDir: string) {
  const fontFiles = readdirSync(resolve(ogDir, "fonts"))
    .filter((file) => file.endsWith(".ttf"))
    .map((file) => resolve(ogDir, "fonts", file));

  function toPng(svg: string, width?: number) {
    return new Resvg(svg, {
      font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Bodoni Moda" },
      fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    })
      .render()
      .asPng();
  }

  /** Renders the 1200×630 social card, filling {{og.*}} placeholders from a locale's `og` object. */
  function renderOgImage(og: OgCopy) {
    const template = readFileSync(resolve(ogDir, "og-image.svg"), "utf8");
    const svg = template.replace(/{{\s*og\.(\w+)\s*}}/g, (_placeholder, key: string) => {
      if (typeof og[key] !== "string") {
        throw new Error(`Missing og.${key} for the social preview image`);
      }
      return escapeXml(og[key]);
    });
    return toPng(svg);
  }

  /** Renders the square icon at `size`. `padded` insets it on the first gel for iOS/Android masks. */
  function renderIcon(iconSvg: string, size: number, { padded = false } = {}) {
    if (!padded) return toPng(iconSvg, size);
    const inner = iconSvg
      .replace(/<\?xml[^>]*>/, "")
      .replace(/<svg[^>]*>/, '<svg x="8" y="8" width="48" height="48" viewBox="0 0 64 64">');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#B8321D"/>${inner}</svg>`;
    return toPng(svg, size);
  }

  return { renderOgImage, renderIcon };
}

/**
 * Renders link-preview images and PNG icons from SVG sources. They are emitted into the build output and
 * served from memory by the dev server, so nothing generated is committed.
 */
export function socialAssetsPlugin(options: {
  ogDir: string;
  iconPath: string;
  locales: Record<string, { og: OgCopy } & Record<string, any>>;
}): Plugin {
  const { renderOgImage, renderIcon } = createRenderer(options.ogDir);
  let assets: Map<string, Buffer> | undefined;

  const render = () => {
    const icon = readFileSync(options.iconPath, "utf8");
    const files = new Map<string, Buffer>([
      ["favicon-32.png", renderIcon(icon, 32)],
      ["apple-touch-icon.png", renderIcon(icon, 180, { padded: true })],
      ["icon-192.png", renderIcon(icon, 192, { padded: true })],
      ["icon-512.png", renderIcon(icon, 512, { padded: true })],
    ]);
    for (const [lang, locale] of Object.entries(options.locales)) {
      files.set(`og-${lang}.png`, renderOgImage(locale.og));
    }
    return files;
  };

  return {
    name: "pagliacci-social-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0]?.replace(/^\//, "");
        if (!name?.endsWith(".png")) return next();
        assets ??= render();
        const file = assets.get(name);
        if (!file) return next();
        res.setHeader("Content-Type", "image/png");
        res.end(file);
      });
    },
    generateBundle() {
      for (const [fileName, source] of render()) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}
