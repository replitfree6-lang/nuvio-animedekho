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
- **Parallel candidate loading** — the TMDB-match scan loads candidate
  posts in parallel instead of one page fetch at a time; the selection
  result is identical, the runtime is much lower.
- **HTTP timeout** — requests time out after 12 seconds: several
  extractor hosts hang rather than refuse, and Nuvio kills scrapers that
  run too long.
- **StreamRuby** — rubystm.com now serves its player script Dean Edwards
  packed, so the original `file:"…"` pattern only exists after
  unpacking; the extractor retries on the unpacked script when the plain
  pattern finds nothing. The original pattern still runs first.

## Validation (live, 22 Oct 2026)

Tested by calling `getStreams` exactly the way Nuvio does (including with
string season/episode arguments):

- One Piece S1E1: 17 streams in ~26 s (NeoCDN, HydraX/Abyss, SRuby,
  Vidmoly, Vidstream).
- Shinchan S1E1: 10 streams in ~20 s (NeoCDN, HydraX/Abyss, SRuby,
  Vidmoly — the site's own source list for that episode is VidStreamm
  [hidden by the site itself], HydraX, NeoCDN, SRuby, Vidstream).
- Your Name (movie): 13 streams (full gate-bypass path exercised).
