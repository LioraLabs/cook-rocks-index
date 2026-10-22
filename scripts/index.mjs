// Renders index.html from the rockspecs in this directory. Run after `luarocks-admin make-manifest .`,
// which overwrites index.html with its own page. Node only; no dependencies.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('..', import.meta.url).pathname;
const hidden = new Set(['cook_ai', 'cook_smoke', 'cook_cpp']); // deprecated, fixture, reserved name: still installable, not catalogued
const notes = {};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const field = (src, key) => src.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm'))?.[1] ?? '';
const semver = v => v.split(/[.-]/).map(Number);
const newer = (a, b) => { const x = semver(a), y = semver(b); for (let i = 0; i < 4; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0); return 0; };

const rocks = new Map();
for (const f of readdirSync(dir).filter(f => f.endsWith('.rockspec')).sort()) {
  const src = readFileSync(dir + f, 'utf8');
  const name = field(src, 'package'), version = field(src, 'version');
  const detailed = src.match(/detailed\s*=\s*\[\[([\s\S]*?)\]\]/)?.[1].trim().split(/\n\s*\n/)[0].replace(/\s+/g, ' ') ?? '';
  const deps = [...(src.match(/dependencies\s*=\s*\{([^}]*)\}/)?.[1].matchAll(/"([^"]+)"/g) ?? [])].map(m => m[1]).filter(d => !d.startsWith('lua '));
  const r = rocks.get(name) ?? { name, versions: [] };
  r.versions.push({ version, summary: field(src, 'summary'), detailed, deps, homepage: field(src, 'homepage'), file: f });
  rocks.set(name, r);
}
for (const h of hidden) rocks.delete(h);
const list = [...rocks.values()].map(r => ({ ...r, versions: r.versions.sort((a, b) => newer(a.version, b.version)) })).sort((a, b) => (notes[a.name] ? 1 : 0) - (notes[b.name] ? 1 : 0) || a.name.localeCompare(b.name));

const tile = (r, k) => { const v = r.versions[0]; return `
<section class="tile${notes[r.name] ? ' dim' : ''}" id="${esc(r.name)}" style="--k:${k}">
  <span class="kicker">${esc(v.version)} · ${r.versions.length} release${r.versions.length > 1 ? 's' : ''}${notes[r.name] ? ` · ${notes[r.name]}` : ''}</span>
  <h2>${esc(r.name)}</h2>
  <p class="summary">${esc(v.summary)}</p>
  ${v.detailed && !notes[r.name] ? `<p class="detail">${esc(v.detailed)}</p>` : ''}
  <pre class="pin"><span class="c"># cook.toml</span>
[modules]
${esc(r.name)} = <span class="s">"${esc(v.version)}"</span></pre>
  <div class="meta">
    ${v.deps.length ? `<span>needs ${v.deps.map(esc).join(', ')}</span>` : ''}
    <a href="https://docs.usecook.com/n/modules/${esc(r.name)}">docs</a>
    ${v.homepage ? `<a href="${esc(v.homepage)}/tree/main/${esc(r.name)}">source</a>` : ''}
    <details><summary>all versions</summary><ul>${r.versions.map(x => `<li><a href="${esc(x.file)}">${esc(x.version)}</a> <a class="rock" href="${esc(x.file.replace(/\.rockspec$/, '.src.rock'))}">.src.rock</a></li>`).join('')}</ul></details>
  </div>
</section>`; };

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>rocks.usecook.com — cook's blessed modules</title>
<meta name="description" content="The LuaRocks index cook installs modules from: cook_cc, cook_pnpm, cook_dotnet, cook_rust. Pin a version in cook.toml and cook fetches it.">
<link rel="icon" href="https://usecook.com/favicon.svg" type="image/svg+xml">
<style>
:root{--bg:#1F1F28;--surface:#2A2A37;--ink:#DCD7BA;--muted:#C8C093;--gray:#727169;--accent:#FFA066;--line:#363646;--green:#98BB6C;--ink0:#16161D;--mono:"JetBrains Mono",ui-monospace,monospace;--sans:Inter,system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(60% 45% at 50% 20%,rgba(42,42,55,.7),transparent 70%),var(--bg);color:var(--ink);font:400 16px/1.65 var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit}a:hover{color:var(--accent)}
.site-header{position:sticky;top:0;z-index:10;height:56px;display:flex;justify-content:space-between;align-items:center;padding:0 24px;background:var(--bg);font:12px/1.8 var(--mono)}
.wordmark{color:var(--accent);text-decoration:none;white-space:nowrap}
.site-header nav{display:flex;gap:22px}.site-header nav a{color:var(--muted);text-decoration:none}.site-header nav a:hover{color:var(--accent)}
.page{width:min(100% - 48px,1360px);margin:0 auto;padding:44px 0 72px}
h1{font:400 clamp(1.8rem,4vw,3rem)/1.07 var(--mono);margin:0 0 20px}
.lede{color:var(--muted);max-width:68ch;font-size:19px;line-height:1.7;margin:0 0 40px}
.lede code,.meta code{font:.9em var(--mono);color:var(--accent)}
.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.tile{display:flex;flex-direction:column;gap:8px;padding:20px 22px;background:var(--surface);border:1px solid var(--line);animation:tile-in .64s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--k) * 55ms)}
@keyframes tile-in{from{opacity:0;transform:translateY(14px)}}
.tile.dim{opacity:.55}
.kicker{font:11px/1.6 var(--mono);color:var(--gray);text-transform:uppercase;letter-spacing:.08em}
.tile h2{font:400 clamp(20px,1.8vw,28px)/1.1 var(--mono);margin:4px 0 0}
.summary{margin:0;color:var(--ink);font-size:15px}.detail{margin:0;color:var(--muted);font-size:13.5px;line-height:1.55;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden}
.pin{margin:8px 0 0;padding:12px 14px;background:var(--ink0);border:1px solid var(--line);font:12.5px/1.6 var(--mono);color:var(--ink);overflow:auto}
.pin .c{color:var(--gray);font-style:italic}.pin .s{color:var(--green)}
.meta{margin-top:auto;padding-top:10px;display:flex;flex-wrap:wrap;gap:6px 16px;font:12px/1.6 var(--mono);color:var(--gray)}
.meta a{color:var(--muted);text-decoration:none}.meta a:hover{color:var(--accent)}
details{flex-basis:100%}summary{cursor:pointer;color:var(--muted)}details ul{list-style:none;margin:8px 0 0;padding:0;columns:2;gap:16px}details li{display:flex;gap:10px;padding:2px 0}details .rock{color:var(--gray)}
.foot{margin-top:40px;color:var(--gray);font:12px/1.8 var(--mono)}.foot a{color:var(--muted);text-decoration:none}
@media(prefers-reduced-motion:reduce){.tile{animation:none}}
@media(max-width:1000px){.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.tiles{grid-template-columns:1fr}.page{width:calc(100% - 32px);padding-top:28px}.site-header{padding:0 16px}.site-header nav{gap:12px}.site-header nav a:nth-child(n+4){display:none}}
</style>
</head>
<body>
<header class="site-header"><a class="wordmark" href="/">cook:~<span aria-hidden="true">$</span> rocks</a><nav><a href="https://docs.usecook.com/">Docs</a><a href="https://docs.usecook.com/standard/27-catalogue/">Catalogue §27</a><a href="https://github.com/lioralabs/cook-modules">Source</a><a href="https://usecook.com/">usecook.com</a></nav></header>
<main class="page">
<h1>cook's blessed modules</h1>
<p class="lede">This is the LuaRocks index <code>cook</code> installs modules from. Pin a version under <code>[modules]</code> in <code>cook.toml</code>, add <code>use cook_cc</code> to your Cookfile, and cook fetches the rock itself. Every module contributes ordinary units to the same graph and the same cache.</p>
<div class="tiles">${list.map(tile).join('\n')}</div>
<p class="foot">Index: <a href="manifest-5.4">manifest-5.4</a> · ${list.length} modules, ${[...rocks.values()].reduce((n, r) => n + r.versions.length, 0)} releases · Apache-2.0 and MIT · <a href="https://lioralabs.dev">Liora Labs</a></p>
</main>
</body>
</html>
`;
writeFileSync(dir + 'index.html', html);
console.log(`index.html: ${list.length} packages`);
