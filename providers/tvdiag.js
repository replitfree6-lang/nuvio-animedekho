// ---------------------------------------------------------------------------
// TV Diagnostic v3 — TEMPORARY scraper, not a content provider.
// Runs the REAL Anime Dekho ad-gate bypass for a known episode, using the
// candidate TV fixes, and reports each step:
//   - waiting via a busy-wait clock loop (the TV runtime has no setTimeout)
//   - cookie capture via getSetCookie / headers.get / full header scan
//   - if no cookie is readable, a cookie-jar attempt (redirect follow +
//     credentials:"include") in case the TV's fetch stores cookies itself
// Summary-first output, like v2. All entries point at a public test stream.
// ---------------------------------------------------------------------------

var TEST_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
var MAIN = "https://animedekho.tv";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

function spinWait(ms) {
    var end = Date.now() + ms;
    return (async function () {
        while (Date.now() < end) {
            var sliceEnd = Math.min(end, Date.now() + 40);
            while (Date.now() < sliceEnd) {}
            await Promise.resolve();
        }
    })();
}

function formEncode(obj) {
    var parts = [];
    for (var k in obj) parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
    return parts.join("&");
}

async function watch(cookie, useJar) {
    var headers = { "Content-Type": "application/json" };
    if (cookie) headers["Cookie"] = "dgt_verified=" + cookie;
    var init = { method: "POST", headers: headers, body: "{\"post_id\":7422,\"episode_id\":42934}" };
    if (useJar) init.credentials = "include";
    var res = await fetch(MAIN + "/wp-json/dgt/v1/watch", init);
    var text = await res.text();
    try { return JSON.parse(text); } catch (e) { return null; }
}

function findCookie(res) {
    var found = { via: null, value: null, headerNames: [] };
    try {
        if (typeof res.headers.getSetCookie === "function") {
            var arr = res.headers.getSetCookie();
            for (var i = 0; i < arr.length; i++) {
                var m = /dgt_verified=([^;]+)/.exec(arr[i]);
                if (m) { found.via = "getSetCookie"; found.value = m[1]; return found; }
            }
        }
    } catch (e) {}
    try {
        var single = res.headers.get("set-cookie");
        if (single) {
            var m2 = /dgt_verified=([^;]+)/.exec(single);
            if (m2) { found.via = "headers.get"; found.value = m2[1]; return found; }
        }
    } catch (e) {}
    try {
        if (typeof res.headers.forEach === "function") {
            res.headers.forEach(function (v, k) {
                found.headerNames.push(k);
                var m3 = /dgt_verified=([^;]+)/.exec(String(v));
                if (m3 && !found.value) { found.via = "header scan (" + k + ")"; found.value = m3[1]; }
            });
        }
    } catch (e) {}
    return found;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    var t0 = Date.now();
    var log = [];
    function step(s) { log.push(s); }
    var engaged = "?";
    var cookieVia = "none";
    var jarWorks = "?";
    var finalSources = -1;
    var verifyStatus = "?";

    try {
        // A: is the gate engaged for this episode right now?
        var w1 = await watch(null, false);
        if (!w1) {
            step("A watch#1: unparseable reply");
        } else if (w1.gated !== true) {
            engaged = "NO";
            finalSources = w1.sources ? w1.sources.length : 0;
            step("A watch#1: NOT gated, sources=" + finalSources);
        } else {
            engaged = "YES";
            step("A watch#1: gated");
            var gate = w1.gate;
            // B: gate page -> shortlink + postlink (regex; no DOM)
            var gateRes = await fetch(gate, { headers: { "Referer": MAIN } });
            var gateText = await gateRes.text();
            var sl = /https?:\/\/[^"'\s<>]*\?dgt_verify=1[^"'\s<>]*/.exec(gateText);
            var shortlink = sl ? sl[0].split("&#038;").join("&") : null;
            if (!shortlink) {
                var inp = /<input[^>]*name=["']?shortlink["']?[^>]*value=["'](https?:[^"']+)/.exec(gateText) ||
                    /<input[^>]*value=["'](https?:[^"']+)["'][^>]*name=["']?shortlink/.exec(gateText);
                if (inp) shortlink = inp[1].split("&amp;").join("&");
            }
            var pl = /<input[^>]*name=["']?postlink["']?[^>]*value=["']([^"']*)/.exec(gateText) ||
                /<input[^>]*value=["']([^"']*)["'][^>]*name=["']?postlink/.exec(gateText);
            var postlink = pl ? pl[1] : "";
            step("B gate page: shortlink=" + (shortlink ? "found" : "MISSING"));
            if (shortlink) {
                // C: tell the shortener we are coming
                await fetch(MAIN + "/skip/vshort.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded", "Referer": gate },
                    body: formEncode({ postlink: postlink, shortlink: shortlink }),
                });
                step("C vshort POST done");
                // D: wait the gate's first schedule point (spin-wait), then verify
                var im = /[?&]i=(\d+)/.exec(shortlink);
                var iVal = im ? parseInt(im[1], 10) : null;
                var waitMs = iVal != null ? (iVal + 4) * 1000 - Date.now() : 4000;
                if (waitMs < 500) waitMs = 500;
                if (waitMs > 15000) waitMs = 15000;
                await spinWait(waitMs);
                step("D waited " + waitMs + "ms (spin)");
                var vRes = await fetch(shortlink, { method: "GET", headers: { "User-Agent": UA, "Referer": MAIN }, redirect: "manual" });
                verifyStatus = String(vRes.status);
                var fc = findCookie(vRes);
                step("D verify(manual): HTTP " + vRes.status + ", cookie via=" + (fc.via || "none") + ", headers seen=" + (fc.headerNames.join(",") || "n/a"));
                await vRes.text();
                if (fc.value) {
                    cookieVia = fc.via;
                    // E: classic path — send the cookie manually to the watch API
                    var w2 = await watch(fc.value, false);
                    if (w2) {
                        finalSources = w2.sources ? w2.sources.length : 0;
                        step("E watch#2 (manual cookie): gated=" + w2.gated + " sources=" + finalSources);
                    } else {
                        step("E watch#2: unparseable reply");
                    }
                } else {
                    // F: jar attempt — verify following redirects with
                    // credentials, then watch relying on the fetch jar
                    var v2 = await fetch(shortlink, { method: "GET", headers: { "User-Agent": UA, "Referer": MAIN }, redirect: "follow", credentials: "include" });
                    await v2.text();
                    step("F verify(follow+credentials): HTTP " + v2.status);
                    var w3 = await watch(null, true);
                    if (w3 && w3.gated !== true) {
                        jarWorks = "YES";
                        finalSources = w3.sources ? w3.sources.length : 0;
                        step("F watch#3 (jar): gated=" + w3.gated + " sources=" + finalSources);
                    } else {
                        jarWorks = "NO";
                        step("F watch#3 (jar): still gated");
                        // G: one more timed cycle — second schedule point
                        var wait2 = iVal != null ? (iVal + 12) * 1000 - Date.now() : 8000;
                        if (wait2 < 500) wait2 = 500;
                        if (wait2 > 12000) wait2 = 12000;
                        await spinWait(wait2);
                        var v3 = await fetch(shortlink, { method: "GET", headers: { "User-Agent": UA, "Referer": MAIN }, redirect: "follow", credentials: "include" });
                        await v3.text();
                        var w4 = await watch(null, true);
                        if (w4 && w4.gated !== true) {
                            jarWorks = "YES (2nd cycle)";
                            finalSources = w4.sources ? w4.sources.length : 0;
                        }
                        step("G 2nd cycle: gated=" + (w4 ? w4.gated : "?") + " sources=" + finalSources);
                    }
                }
            }
        }
    } catch (e) {
        step("EXCEPTION: " + String(e).slice(0, 120));
    }

    var elapsed = Date.now() - t0;
    var out = [];
    out.push({
        name: "Diag gate summary",
        title: "GATE engaged:" + engaged + " | cookie:" + cookieVia + " | jar:" + jarWorks + " | sources:" + finalSources + " | " + elapsed + "ms",
        url: TEST_URL,
        quality: "Auto",
    });
    out.push({
        name: "Diag gate steps",
        title: log.join(" ;; ").slice(0, 230),
        url: TEST_URL,
        quality: "Auto",
    });
    for (var i = 0; i < log.length; i++) {
        out.push({ name: "Diag step " + (i + 1), title: log[i], url: TEST_URL, quality: "Auto" });
    }
    return out;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
