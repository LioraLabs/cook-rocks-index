# cook-rocks-index

Source of truth for [`rocks.usecook.com`](https://rocks.usecook.com) — the Cook-blessed LuaRocks index.

## What this is

A flat directory of LuaRocks artifacts served as static files behind Cloudflare Pages:

- `manifest-5.4` — the LuaRocks manifest (lists every rockspec in the index)
- `*.rockspec` — rock specifications
- `*.src.rock` — packed source rocks
- `*.<arch>.rock` — packed binary rocks (future)

No server-side compute, no auth. The site is the repo.

## How rocks land here

1. Author or update a rockspec in its own source repo (e.g. `LioraLabs/cook-cpp`).
2. `luarocks pack <rockspec>` to produce a `.src.rock` (and binary rocks per platform).
3. Commit the `.rockspec` + `.src.rock` files into this repo on Gitea.
4. Regenerate the manifest: `luarocks-admin make-manifest .` and commit.
5. Push to Gitea, then run `scripts/publish.sh` to refresh the GitHub mirror.
6. Cloudflare Pages picks up the GitHub force-push and redeploys; new rocks become installable from `rocks.usecook.com` within minutes.

The Phase 4 publishing workflow in [SHI-176](https://linear.app/shiny-guru/issue/SHI-176) will formalize and automate this.

## Repo topology

- **Gitea (NAS) — canonical.** Real commit history. All authoring happens here.
- **GitHub mirror (`LioraLabs/cook-rocks-index`) — single-commit snapshot.** Each publish replaces `main` with one orphan commit holding the current tree. No history is preserved on the GitHub side; Cloudflare Pages reads from this mirror.
- **Cloudflare Pages.** Bound to the GitHub mirror's `main` branch; redeploys on each force-push.

To publish:

```sh
# After committing and pushing to Gitea:
scripts/publish.sh           # force-pushes a snapshot to remote `github`, branch `main`
scripts/publish.sh github main  # explicit form
```

The script requires a clean working tree and an existing `github` remote.

## Hosting

- **Host:** Cloudflare (Workers + Static Assets — formerly Pages, decided in [SHI-178](https://linear.app/shiny-guru/issue/SHI-178))
- **DNS:** `usecook.com` on Cloudflare nameservers ([SHI-179](https://linear.app/shiny-guru/issue/SHI-179))
- **Stand-up:** [SHI-180](https://linear.app/shiny-guru/issue/SHI-180)
- **Project:** [Cook distribution infra — rocks index + installer hosting](https://linear.app/shiny-guru/project/cook-distribution-infra-rocks-index-installer-hosting-9ee27f58483d)

`wrangler.jsonc` declares this as a static-only project (`assets.directory = "./"`); `.assetsignore` keeps tooling files (`scripts/`, `README.md`, the wrangler config itself) out of what's served. Each push to the GitHub mirror triggers `npx wrangler deploy` in Cloudflare's CI.

## Known limitations (v1)

- Manifests are not signed. luarocks.org signs theirs; we do not, in v1. Hardening pass with GPG signing is a follow-up.
