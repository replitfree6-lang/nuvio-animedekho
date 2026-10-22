// ---------------------------------------------------------------------------
// TV Diagnostic v2 — TEMPORARY scraper, not a content provider.
// Pinpoints why Anime Dekho returns no streams on some TV builds (LG
// webOS) while working on phones. The app only shows the first few test
// entries, so the FIRST TWO entries are summaries covering every stage:
//   S0 plugin executes            S5 animedekho series page loads
//   S1 cheerio module present     S6 animedekho watch POST answers
//   S2 fetch + text() works       S7 extractor host page loads
//   S3 fetch + AbortController    S8 fetch + response.json() works
//   S4 animedekho suggest API     S9 Set-Cookie header is visible
// Every entry points at a public test stream; nothing here is content.
// ---------------------------------------------------------------------------

var TMDB_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var TEST_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

function shortErr(e) {
    return String(e).slice(0, 90);
}

async function getStreams(tmdbId, mediaType, season, episode) {
    var t0 = Date.now();
    var S = {}; // stage -> [ok, detail]

    // S0: execution is proven by any result at all.
    S[0] = [true, ""];

    // S1: cheerio module
    try {
        var ch = require("cheerio-without-node-native");
        S[1] = [!!ch, ch ? "" : "empty module"];
    } catch (e) {
        S[1] = [false, shortErr(e)];
    }

    // S2: plain fetch + text()
    try {
        var r2 = await fetch("https://api.themoviedb.org/3/tv/30623?api_key=" + TMDB_KEY);
        var t2 = await r2.text();
        S[2] = [r2.ok, "HTTP " + r2.status + " " + t2.length + "B"];
    } catch (e) {
        S[2] = [false, shortErr(e)];
    }

    // S3: fetch with AbortController signal (the scraper's timeout method)
    try {
        var ctl = new AbortController();
        var timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 12000);
        var r3 = await fetch("https://api.themoviedb.org/3/tv/37854?api_key=" + TMDB_KEY, { signal: ctl.signal });
        clearTimeout(timer);
        S[3] = [r3.ok, "HTTP " + r3.status];
        await r3.text();
    } catch (e) {
        S[3] = [false, shortErr(e)];
    }

    // S4: animedekho suggest API
    try {
        var r4 = await fetch("https://animedekho.tv/wp-json/dgt/v1/suggest?q=Shinchan");
        var t4 = await r4.text();
        var n4 = "?";
        try { n4 = String((JSON.parse(t4).items || []).length); } catch (e) {}
        S[4] = [r4.ok, "HTTP " + r4.status + " items=" + n4];
    } catch (e) {
        S[4] = [false, shortErr(e)];
    }

    // S5: animedekho series page
    try {
        var r5 = await fetch("https://animedekho.tv/series-hindi/shin-chan-all/");
        var t5 = await r5.text();
        S[5] = [r5.ok, "HTTP " + r5.status + " " + t5.length + "B snap=" + (t5.indexOf("data-snapshot") !== -1)];
    } catch (e) {
        S[5] = [false, shortErr(e)];
    }

    // S6: animedekho watch POST (post 7422 / episode 42934; gated=true is SUCCESS)
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
            d6 = "gated=" + j6.gated + " src=" + (j6.sources ? j6.sources.length : 0);
        } catch (e) {
            d6 = t6.slice(0, 40);
        }
        S[6] = [r6.ok, "HTTP " + r6.status + " " + d6];
    } catch (e) {
        S[6] = [false, shortErr(e)];
    }

    // S7: extractor host page (StreamRuby player)
    try {
        var r7 = await fetch("https://rubystm.com/zmk1pdbvyakb", {
            headers: { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36" },
        });
        var t7 = await r7.text();
        S[7] = [r7.ok, "HTTP " + r7.status + " " + t7.length + "B"];
    } catch (e) {
        S[7] = [false, shortErr(e)];
    }

    // S8: response.json() — the main scraper parses TMDB replies with it
    try {
        var r8 = await fetch("https://api.themoviedb.org/3/tv/30623?api_key=" + TMDB_KEY);
        if (typeof r8.json !== "function") {
            S[8] = [false, "res.json is " + typeof r8.json];
        } else {
            var j8 = await r8.json();
            S[8] = [!!(j8 && j8.id === 30623), "name=" + (j8 && j8.name)];
        }
    } catch (e) {
        S[8] = [false, shortErr(e)];
    }

    // S9: Set-Cookie visibility — the site's ad-gate bypass reads the
    // dgt_verified cookie from a Set-Cookie response header; if the TV's
    // fetch hides that header (browser-style), the gate can never pass.
    try {
        var r9 = await fetch("https://httpbin.org/cookies/set?dgt_verified=probe123", { redirect: "manual" });
        var viaGet = null;
        try { viaGet = r9.headers.get("set-cookie"); } catch (e) { viaGet = "get() threw"; }
        var viaSet = null;
        try {
            viaSet = typeof r9.headers.getSetCookie === "function" ? r9.headers.getSetCookie().join(" | ") : "no getSetCookie()";
        } catch (e) { viaSet = "getSetCookie threw"; }
        var found = (viaGet && String(viaGet).indexOf("dgt_verified=probe123") !== -1) ||
            (viaSet && String(viaSet).indexOf("dgt_verified=probe123") !== -1);
        S[9] = [!!found, "status=" + r9.status + " get=" + String(viaGet).slice(0, 40) + " getSetCookie=" + String(viaSet).slice(0, 40)];
    } catch (e) {
        S[9] = [false, shortErr(e)];
    }

    var elapsed = Date.now() - t0;
    function fmt(ids) {
        return ids.map(function (i) {
            return "S" + i + (S[i][0] ? ":OK" : ":FAIL");
        }).join(" ");
    }
    function fails() {
        var f = [];
        for (var i = 0; i <= 9; i++) if (!S[i][0]) f.push("S" + i + " " + S[i][1]);
        return f.length ? f.join(" ;; ") : "none";
    }
    var out = [];
    out.push({ name: "Diag summary 1", title: fmt([0, 1, 2, 3, 4]) + " (" + elapsed + "ms)", url: TEST_URL, quality: "Auto" });
    out.push({ name: "Diag summary 2", title: fmt([5, 6, 7, 8, 9]), url: TEST_URL, quality: "Auto" });
    out.push({ name: "Diag failures", title: "Failures: " + fails().slice(0, 220), url: TEST_URL, quality: "Auto" });
    for (var i = 0; i <= 9; i++) {
        out.push({
            name: "Diag S" + i,
            title: "S" + i + (S[i][0] ? " OK" : " FAILED") + (S[i][1] ? " — " + S[i][1] : ""),
            url: TEST_URL,
            quality: "Auto",
        });
    }
    return out;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
