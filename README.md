# AnimeDekho for Nuvio — converted from CloudStream

A Nuvio plugin repository converted from **AnimeDekhoProvider.cs3**
(CloudStream3 plugin, version 72, by **phisher98**). Nothing from the
original plugin was dropped: every provider and every extractor registered
in the original `AnimeDekhoPlugin.load()` is ported, in the original
registration order. Where CloudStream has a feature that a stream-only
Nuvio plugin cannot express, that is stated openly below instead of being
silently removed.

Support the original author: https://buymeacoffee.com/phisher98 ·
GitHub: https://github.com/phisher98

## Scrapers in this repository

| Scraper | Site | Types | Language |
| --- | --- | --- | --- |
| Anime Dekho | https://animedekho.tv | movie, tv | hi |
| HindiSubAnime | https://hindisubanime.co | movie, tv | hi |
| OnePace | https://onepace.co | tv | en |

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

1. Host this folder somewhere reachable over HTTPS (for example a GitHub
   repository), so that `manifest.json` has a public raw URL.
2. In Nuvio, open the Plugins screen and add a repository using that
   `manifest.json` URL.
3. Enable the scrapers you want (Anime Dekho, HindiSubAnime, OnePace).

## What was converted

### Providers (CloudStream `MainAPI`s → Nuvio scrapers)

- **AnimeDekhoProvider** — full port: DGT suggest search with the HTML
  search fallback, `load()` snapshot parsing (title/poster/backdrop/plot,
  TMDB/MAL/AniList ids, season tabs, episodes API), the watch API
  (`/wp-json/dgt/v1/watch`), the complete ad-gate bypass (`bypassGate`,
  `verifyGate`, wait schedule `[4, 12, 30, 75]` / `[10, 45]`, nonce
  fallback), embed and download source handling (including the
  `/player.php?url=` iframe unwrap and the `dl2.php` Base64 decode), and
  `extractLabeled` server/quality/tag renaming.
- **HindiSubAnime** — inherits AnimeDekho's search/load in the original;
  its own `loadLinks` (page iframes + the `trdekho` 0–7 server fan-out) is
  ported unchanged.
- **OnepaceProvider** — its arc catalogue, search and `load()` are ported,
  and its `loadLinks` uses the same `trdekho` fan-out.

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
  the providers' main pages (Recently Added, Popular, Top Rated, genre
  categories, etc.), search results and detail pages. Nuvio plugins are
  stream-only, so there is no surface for these. The same search/load
  logic is still present and is used internally to resolve the TMDB id
  Nuvio hands the scraper into the site's post/episode before extracting
  streams.
- **TMDB resolution step** — CloudStream starts from the site's own
  pages; Nuvio hands the scraper only a TMDB id. The scrapers therefore
  look the title up on TMDB first, then run the original site search/load
  flow and prefer the result whose snapshot TMDB id matches.
- **Donation popup** — the `.cs3` contains an Android donation dialog
  (`DonationManager` / `DonationDialogFragment`) driven by
  `https://raw.githubusercontent.com/phisher98/TVVVV/main/goal.json` and
  `https://supportbot.phisher2.workers.dev/`, linking to
  https://buymeacoffee.com/phisher98 and https://github.com/phisher98.
  A stream-only JavaScript plugin has no UI, so the popup itself cannot
  exist in Nuvio; the author's support links are preserved here and in
  each file's header comment instead.
- **Subtitles** — CloudStream delivers subtitles through a separate
  callback; Nuvio attaches them to the stream object, which is what these
  scrapers do.
- **HTTP timeout** — the shared HTTP helpers use a 30-second timeout (a
  client-platform safeguard added during conversion after a live host
  hung indefinitely). This does not change any extraction logic.

## Site-drift fallbacks (conversion additions, clearly marked in code)

The original logic runs first and unchanged in every case; these fallbacks
only fire when the original flow finds nothing because a site has been
rebuilt since the `.cs3` was released:

- **OnePace** — onepace.co now runs the same DGT system as animedekho.tv
  and no longer has the arc-box markup the original `load()` parses. If
  arc-box resolution finds nothing, the episode is resolved through the
  site's DGT episodes API instead; the original `trdekho` `loadLinks`
  then runs unchanged.
- **StreamRuby** — rubystm.com now serves its player script Dean Edwards
  packed, so the original `file:"…"` pattern only exists after unpacking;
  the extractor retries on the unpacked script when the plain pattern
  finds nothing.
- **HindiSubAnime** — hindisubanime.co no longer runs the DGT system (its
  suggest route answers 404), but its episode pages still carry the
  `term-<id>` body class and still answer the `trdekho` fan-out. If the
  original DGT resolution finds nothing, the episode is resolved from the
  theme's `/epi/<slug>-<season>x<episode>/` links on the series page;
  the original `loadLinks` then runs unchanged.

## Validation (live, 22 Oct 2026)

- Anime Dekho — One Piece S1E1: 16 streams; Your Name (movie): 13 streams
  (full gate-bypass path exercised); Shinchan S1E1: 10 streams (NeoCDN,
  HydraX/Abyss, SRuby, Vidmoly — the site's own source list for that
  episode is VidStreamm [hidden by the site itself], HydraX, NeoCDN,
  SRuby, Vidstream).
- HindiSubAnime — One Piece S1E1: 5 streams; Naruto S1E1: 4 streams.
- OnePace — One Piece S1E1: 8 streams (sub + dub).
- All three files pass `node --check`; `manifest.json` is valid JSON.
