# AnimeDekho for Nuvio — converted from CloudStream

A Nuvio plugin repository converted from **AnimeDekhoProvider.cs3**
(CloudStream3 plugin, version 72, by **phisher98**). Nothing from the
original AnimeDekho provider was dropped: its full provider logic and
every extractor it registers are ported, in the original registration
order. Where CloudStream has a feature that a stream-only Nuvio plugin
cannot express, that is stated openly below instead of being silently
removed.

> This repository ships only the **Anime Dekho** scraper. The .cs3 also
> contained HindiSubAnime and OnePace providers; their conversions were
> removed from this repository on 2026-10-22 at the user's request.

Support the original author: https://buymeacoffee.com/phisher98 ·
GitHub: https://github.com/phisher98

## Scraper in this repository

| Scraper | Site | Types | Language |
| --- | --- | --- | --- |
| Anime Dekho | https://animedekho.tv | movie, tv | hi |

## How Nuvio plugins work

- A Nuvio *plugin* (scraper) is a JavaScript file that runs **locally on
  your device** in a sandboxed QuickJS runtime. This is different from a
  Nuvio/Stremio *addon*, which is a remote server.
- Plugins only provide **streams**. They cannot provide catalogues, home
  pages, search screens or metadata pages.
- Plugins are distributed as a **repository**: you give Nuvio the URL of a
  `manifest.json`, it reads the scraper list from it, downloads each
  scraper's `.js` file, and lets you enable/disable scrapers individually.
- When you open a title, Nuvio calls each enabled scraper's
  `getStreams(tmdbId, mediaType, season, episode)` and merges the returned
  `{ name, title, url, quality, headers }` objects with addon results.
- Only sideloaded Nuvio builds support plugins; app-store builds do not.

## Install

1. In Nuvio, open the Plugins screen and add a repository using this
   repo's raw `manifest.json` URL:
   `https://raw.githubusercontent.com/replitfree6-lang/nuvio-animedekho/main/manifest.json`
2. Enable the **Anime Dekho** scraper.
3. After an update, refresh the repository in Nuvio so it picks up the
   new scraper version.

## What was converted

### Provider (CloudStream `MainAPI` → Nuvio scraper)

- **AnimeDekhoProvider** — full port: DGT suggest search with the HTML
  search fallback, `load()` snapshot parsing (title/poster/backdrop/plot,
  TMDB/MAL/AniList ids, season tabs, episodes API), the watch API
  (`/wp-json/dgt/v1/watch`), the complete ad-gate bypass (`bypassGate`,
  `verifyGate`, wait schedule `[4, 12, 30, 75]` / `[10, 45]`, nonce
  fallback), embed and download source handling (including the
  `/player.php?url=` iframe unwrap and the `dl2.php` Base64 decode), and
  `extractLabeled` server/quality/tag renaming.

### Extractors (original registration order)

StreamRuby, Vidmoly (vidmoly.net), GDMirrorbot, Techinmind, StreamWish
(Cdnwish), StreamWish (Multimovies), FileMoon, FileMoonNL (Filesim),
Krakenfiles, Voe, StreamTape, FilemoonV2, Vidhide (Animezia), VidStack
(Cloudy), VidStack (vidcloudupns), Animedekhoco, Blakiteapi, AWSStream
(ascdn21 / Zephyrflick), AWSStream (ascdn26 / Zephyrflick), Ravok, NeoCDN,
DekhoVidSrc, AnimeworldMirror, GDFlix, Gofile, DekhoHubCloud (HubCloud),
Vidmoly (vidmoly.biz), AnimedekhoEmbed, Abyass, Short, AbyssPlayer —
including quirks preserved from the bytecode, such as Gofile's swapped
MB/GB size formatting and DekhoVidSrc emitting the extractor name instead
of the source label.

Extractors the plugin *author* wrote were ported method-for-method from
the decompiled `.cs3`. Extractors that are CloudStream app built-ins or
base classes (FileMoon, Krakenfiles, Voe, StreamTape, FilemoonV2, Vidmoly,
StreamWish, Vidhide, VidStack, Filesim) are **not inside the `.cs3`
file**; they are re-implemented from their standard public CloudStream
behaviour so `loadExtractor()` routes exactly like CloudStream.

## Platform differences (nothing silently omitted)

- **Catalogue / home page / search / metadata UI** — CloudStream shows
  the provider's main pages (Recently Added, Popular, Top Rated, genre
  categories, etc.), search results and detail pages. Nuvio plugins are
  stream-only, so there is no surface for these. The same search/load
  logic is still present and is used internally to resolve the TMDB id
  Nuvio hands the scraper into the site's post/episode before extracting
  streams.
- **TMDB resolution step** — CloudStream starts from the site's own
  pages; Nuvio hands the scraper only a TMDB id. The scraper therefore
  looks the title up on TMDB first, then runs the original site
  search/load flow and prefers the result whose snapshot TMDB id matches.
- **Donation popup** — the `.cs3` contains an Android donation dialog
  (`DonationManager` / `DonationDialogFragment`) driven by
  `https://raw.githubusercontent.com/phisher98/TVVVV/main/goal.json` and
  `https://supportbot.phisher2.workers.dev/`, linking to
  https://buymeacoffee.com/phisher98 and https://github.com/phisher98.
  A stream-only JavaScript plugin has no UI, so the popup itself cannot
  exist in Nuvio; the author's support links are preserved here and in
  the file's header comment instead.
- **Subtitles** — CloudStream delivers subtitles through a separate
  callback; Nuvio attaches them to the stream object, which is what this
  scraper does.

## Conversion adjustments (clearly marked in code)

- **Argument coercion** — Nuvio can hand `season`/`episode` to
  `getStreams` as strings while the site's season/episode data is
  numeric; they are coerced to numbers before comparison. (Without this,
  series requests returned no streams in the app.)
- **Type-safe title resolution** — Nuvio hands the scraper only a TMDB
  id, and the site's suggest search can miss the series entirely (for
  "Shin Chan" it returns only same-franchise movies; the series is
  indexed as "Shinchan"). TMDB's own primary name for an id is not
  stable either (id 30623 has answered both "Shin Chan" and "Crayon
  Shin-chan" on the same day — the latter would resolve to the spin-off
  series). The resolver therefore searches with the primary name, the
  original name and TMDB's alternative titles (Latin ones first), each
  also in squashed form, and only ever resolves a tv request to a series
  post and a movie request to a movie post (exact TMDB-id or title
  matches aside). An earlier version fell back to the first loaded post,
  which made series requests play a movie.
- **Low-end / TV hardware** — TVs (e.g. LG webOS) are far slower than
  phones, and Nuvio kills slow scrapers, which showed up as "no streams
  on TV, fine on phone". Candidate posts are now loaded in small
  prioritised batches with early exit, and pages are read with plain
  string scans (snapshot JSON, season tabs and id buttons are single
  attributes) instead of building a DOM over each ~300 KB page.
  Resolution also no longer depends on the cheerio module being present.
- **HTTP timeout** — requests time out after 12 seconds: several
  extractor hosts hang rather than refuse, and Nuvio kills scrapers that
  run too long.
- **TV runtime: no `setTimeout`** — the LG webOS build of the app has no
  `setTimeout` function at all (proven by a diagnostic scraper run on the
  TV itself). The ad-gate bypass has to wait between verify attempts;
  with no timer the waits collapsed to zero and the bypass could never
  pass on TV. `sleep()` now falls back to waiting by watching the clock,
  in small slices. Behaviour on runtimes that do have `setTimeout`
  (phones, desktop) is unchanged.
- **TV runtime: hidden `Set-Cookie`** — the same TV fetch layer hides
  `set-cookie` from both `headers.get()` and `getSetCookie()`, which is
  where the gate's `dgt_verified` cookie lives. `verifyGate()` now also
  scans every response header by iteration as a last resort before
  giving up on the cookie.
- **AbyssPlayer (playback)** — a dec-abyss source URL is not the file
  itself: it answers 302 to a rotating mirror host, and players that
  drop custom headers across a cross-host redirect (or mishandle the
  redirect) fail on these streams while direct-link servers play. The
  extractor now resolves that redirect itself — on the same device/IP
  the player will use — and emits the final URL, together with the
  Referer and the exact User-Agent the extractor used (the same
  identity-binding lesson as StreamRuby). If the redirect cannot be
  resolved, the original URL is emitted unchanged.
- **StreamRuby (site drift)** — rubystm.com now serves its player script
  Dean Edwards packed, so the original `file:"…"` pattern only exists
  after unpacking; the extractor retries on the unpacked script when the
  plain pattern finds nothing. The original pattern still runs first.
- **StreamRuby (playback)** — streamruby binds its playlist token to the
  exact User-Agent that fetched the player page (verified live: same UA
  returns 200, any other UA returns 403). In CloudStream the scraper and
  the player share one HTTP stack, so this never mattered; in Nuvio they
  differ, so the page is fetched with a fixed User-Agent and the same
  User-Agent is attached to the stream for the player.

## Validation (live, 22 Oct 2026)

Tested by calling `getStreams` exactly the way Nuvio does (including with
string season/episode arguments), and by replaying the returned SRuby
stream through a player-style fetch of its master playlist, variants and
segments:

- One Piece S1E1: 17 streams in ~11 s (NeoCDN, HydraX/Abyss, SRuby,
  Vidmoly, Vidstream).
- Shinchan S1E1: resolves to the actual episode (post 7422, episode
  42934) — NeoCDN, SRuby, HydraX/Abyss, Vidstream. (The site's own source
  list for that episode is VidStreamm [hidden by the site itself],
  HydraX, NeoCDN, SRuby, Vidstream.) SRuby master/variant/segment
  requests all return 200 with the stream's headers.
- Your Name (movie): 14 streams (full gate-bypass path exercised).
