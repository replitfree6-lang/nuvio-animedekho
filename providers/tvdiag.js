// ---------------------------------------------------------------------------
// TV Diagnostic — TEMPORARY scraper, not a content provider.
// Exists to find out why Anime Dekho returns no streams on some TV builds
// (LG webOS) while working on phones. Each stage reports its own result as
// a stream entry, so the furthest stage that appears on the TV tells us
// exactly where the TV runtime diverges:
//   Stage 0  the scraper executes at all and its results are displayed
//   Stage 1  the cheerio module the scrapers rely on is available
//   Stage 2  plain fetch to api.themoviedb.org works
//   Stage 3  fetch with an AbortController timeout signal works
//   Stage 4  GET animedekho.tv suggest API (WordPress REST) works
//   Stage 5  GET an animedekho.tv series page works (reports bytes)
//   Stage 6  POST animedekho.tv watch API works (a "gated" reply is SUCCESS)
//   Stage 7  GET an extractor host page (rubystm.com) works
// Every entry points at a public test stream; nothing here is content.
// ---------------------------------------------------------------------------

var TMDB_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TEST_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

function entry(stage, ok, detail) {
    return {
        name: "Diag " + stage,
        title: stage + (ok ? " OK" : " FAILED") + (detail ? " — " + detail : ""),
        url: TEST_URL,
        quality: "Auto",
    };
}

async function getStreams(tmdbId, mediaType, season, episode) {
    var out = [];
    out.push(entry("Stage 0: scraper executed", true, "runtime runs plugin code"));

    // Stage 1: cheerio module
    try {
        var ch = require("cheerio-without-node-native");
        out.push(entry("Stage 1: cheerio module", !!ch, ch ? "require() returned a module" : "require() returned nothing"));
    } catch (e) {
        out.push(entry("Stage 1: cheerio module", false, String(e).slice(0, 120)));
    }

    // Stage 2: plain fetch to TMDB
    try {
        var r2 = await fetch("https://api.themoviedb.org/3/tv/30623?api_key=" + TMDB_KEY);
        var t2 = await r2.text();
        out.push(entry("Stage 2: fetch TMDB", r2.ok, "HTTP " + r2.status + ", " + t2.length + " bytes"));
    } catch (e) {
        out.push(entry("Stage 2: fetch TMDB", false, String(e).slice(0, 120)));
    }

    // Stage 3: fetch with AbortController signal (what the scraper uses)
    try {
        var ctl = new AbortController();
        var timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 12000);
        var r3 = await fetch("https://api.themoviedb.org/3/tv/37854?api_key=" + TMDB_KEY, { signal: ctl.signal });
        clearTimeout(timer);
        out.push(entry("Stage 3: fetch + AbortController", r3.ok, "HTTP " + r3.status));
    } catch (e) {
        out.push(entry("Stage 3: fetch + AbortController", false, String(e).slice(0, 120)));
    }

    // Stage 4: animedekho suggest API
    try {
        var r4 = await fetch("https://animedekho.tv/wp-json/dgt/v1/suggest?q=Shinchan");
        var t4 = await r4.text();
        var n4 = "?";
        try { n4 = String((JSON.parse(t4).items || []).length); } catch (e) {}
        out.push(entry("Stage 4: animedekho suggest API", r4.ok, "HTTP " + r4.status + ", items=" + n4));
    } catch (e) {
        out.push(entry("Stage 4: animedekho suggest API", false, String(e).slice(0, 120)));
    }

    // Stage 5: animedekho series page HTML
    try {
        var r5 = await fetch("https://animedekho.tv/series-hindi/shin-chan-all/");
        var t5 = await r5.text();
        out.push(entry("Stage 5: animedekho series page", r5.ok, "HTTP " + r5.status + ", " + t5.length + " bytes, snapshot=" + (t5.indexOf("data-snapshot") !== -1)));
    } catch (e) {
        out.push(entry("Stage 5: animedekho series page", false, String(e).slice(0, 120)));
    }

    // Stage 6: animedekho watch API (POST JSON) — post 7422 / episode 42934.
    // A "gated: true" reply means the API round-trip fully works.
    try {
        var r6 = await fetch("https://animedekho.tv/wp-json/dgt/v1/watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{\"post_id\":7422,\"episode_id\":42934}",
        });
        var t6 = await r6.text();
        var d6 = "";
        try {
            var j6 = JSON.parse(t6);
            d6 = "gated=" + j6.gated + ", sources=" + (j6.sources ? j6.sources.length : 0);
        } catch (e) {
            d6 = t6.slice(0, 60);
        }
        out.push(entry("Stage 6: animedekho watch POST", r6.ok, "HTTP " + r6.status + ", " + d6));
    } catch (e) {
        out.push(entry("Stage 6: animedekho watch POST", false, String(e).slice(0, 120)));
    }

    // Stage 7: an extractor host page (StreamRuby player)
    try {
        var r7 = await fetch("https://rubystm.com/zmk1pdbvyakb", {
            headers: { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36" },
        });
        var t7 = await r7.text();
        out.push(entry("Stage 7: extractor host page", r7.ok, "HTTP " + r7.status + ", " + t7.length + " bytes"));
    } catch (e) {
        out.push(entry("Stage 7: extractor host page", false, String(e).slice(0, 120)));
    }

    return out;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
