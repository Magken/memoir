import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const src = fs.readFileSync(
  path.join(root, 'item-reference/front-end/background-types-1/styles.css'),
  'utf8',
);
const blocks = [...src.matchAll(/\.p-([a-z0-9-]+)\s*\{([^}]+)\}/g)];

function fixBackgroundImage(line) {
  const match = line.match(/^background-image:\s*url\((["'])(.*)\1\)(.*)$/);
  if (!match) return line;
  const [, , inner, suffix] = match;
  const encoded = inner.replace(/'/g, '%27');
  return `background-image: url("${encoded}")${suffix.trim()}`;
}

let out =
  '/** Paper textures — ref.background-types-1 · SVG feTurbulence fills on div bg layer */\n\n@layer components {\n';

for (const [, id, body] of blocks) {
  out += `  .theme .theme-page-bg-texture--${id} {\n`;
  for (const line of body.trim().split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('background-color:')) continue;
    const fixed = t.startsWith('background-image:') ? fixBackgroundImage(t) : t;
    out += `    ${fixed}${fixed.endsWith(';') ? '' : ';'}\n`;
  }
  out += '    background-repeat: no-repeat;\n    background-size: cover;\n  }\n\n';
}

out += '}\n';

const outPath = path.join(root, 'front_end/src/css/effects/theme-page-bg-textures.css');
fs.writeFileSync(outPath, out);
postcss.parse(out);
console.log('wrote', blocks.length, 'textures');
