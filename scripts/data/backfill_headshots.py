#!/usr/bin/env python3
"""Backfill athlete headshots from ESPN's headshot CDN.

ESPN serves athlete headshots at a stable, league-scoped path:

    https://a.espncdn.com/i/headshots/{path}/players/full/{espn_id}.png

A present headshot returns 200; a missing one returns a clean 404, so a HEAD
request is an authoritative existence check (no silhouette placeholder to filter
out). We map our `sport` to the CDN path(s) and take the first that resolves.

By default this only touches athletes that appear in `event_athletes` (the set
surfaced in the Fan Passport "Players you've seen" section) and that have no
headshot yet. Pass --all to walk the whole athletes table. Only an espn-keyed
athlete with a confirmed 200 is updated, so we never write a wrong or broken
image, and the run is idempotent (re-running skips anything already filled).

Usage:  python3 scripts/data/backfill_headshots.py [--live] [--all] [--limit=N]
        (default is a dry run that writes nothing)
Env:    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
"""
import os, sys, re, json, time, urllib.request, urllib.error, collections

for line in open(os.path.join(os.path.dirname(__file__), "../../.env.local")):
    m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
    if m and m.group(1) not in os.environ: os.environ[m.group(1)] = m.group(2)
URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]; KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
LIVE = "--live" in sys.argv
ALL = "--all" in sys.argv
LIMIT = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--limit=")), None)
HDR = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
UA = {"User-Agent": "BoxdSeats/1.0 (arinaldi@yext.com)"}

# sport -> ordered CDN path candidates (first 200 wins). Major leagues first.
SPORT_PATHS = {
    "baseball": ["mlb"],
    "basketball": ["nba", "wnba", "mens-college-basketball"],
    "football": ["nfl", "college-football"],
    "hockey": ["nhl"],
    "soccer": ["soccer"],
    "golf": ["golf"],
    "motorsports": ["rpm"],
    "tennis": ["tennis"],
}

def db_get(p): return json.load(urllib.request.urlopen(urllib.request.Request(URL + "/rest/v1/" + p, headers=HDR)))
def db_patch(athlete_id, url):
    r = urllib.request.Request(URL + "/rest/v1/athletes?id=eq." + athlete_id, method="PATCH",
                               data=json.dumps({"headshot_url": url}).encode(), headers=HDR)
    urllib.request.urlopen(r)

def head_ok(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA, method="HEAD"), timeout=15)
        return r.status == 200
    except urllib.error.HTTPError:
        return False
    except Exception:
        return False

def resolve(sport, espn_id):
    for path in SPORT_PATHS.get(sport, []):
        url = f"https://a.espncdn.com/i/headshots/{path}/players/full/{espn_id}.png"
        if head_ok(url):
            return url
        time.sleep(0.03)
    return None

def candidate_ids():
    """Distinct athlete ids to consider, newest data first."""
    if ALL:
        ids, off = [], 0
        while True:
            rows = db_get(f"athletes?select=id&headshot_url=is.null&order=id&limit=1000&offset={off}")
            ids += [r["id"] for r in rows]
            if len(rows) < 1000: break
            off += 1000
        return ids
    ids, off = set(), 0
    while True:
        rows = db_get(f"event_athletes?select=athlete_id&order=id&limit=1000&offset={off}")
        for r in rows:
            if r["athlete_id"]: ids.add(r["athlete_id"])
        if len(rows) < 1000: break
        off += 1000
    return list(ids)

def main():
    print(f"[headshots] {'LIVE' if LIVE else 'DRY RUN'} scope={'all athletes' if ALL else 'event_athletes'}"
          f"{f' limit={LIMIT}' if LIMIT else ''}")
    ids = candidate_ids()
    # pull metadata for the ones still missing a headshot
    todo = []
    for i in range(0, len(ids), 100):
        for r in db_get("athletes?select=id,name,sport,headshot_url,external_ids&id=in.(" + ",".join(ids[i:i+100]) + ")"):
            if r.get("headshot_url"): continue
            espn = (r.get("external_ids") or {}).get("espn")
            if not espn: continue
            todo.append((r["id"], r["name"], r.get("sport"), str(espn)))
    if LIMIT: todo = todo[:LIMIT]
    print(f"candidates missing a headshot (espn-keyed): {len(todo)}")

    found = collections.Counter(); none = collections.Counter()
    updated = 0; samples = []
    for n, (aid, name, sport, espn) in enumerate(todo):
        url = resolve(sport, espn)
        if url:
            found[sport] += 1
            if LIVE: db_patch(aid, url)
            if len(samples) < 12: samples.append((name, sport, url.split("/")[-1]))
            updated += 1
        else:
            none[sport] += 1
        if (n + 1) % 250 == 0:
            print(f"  ...{n+1}/{len(todo)}  found={updated}")

    print("\n=== resolved by sport ===")
    for s in sorted(set(found) | set(none)):
        print(f"  {s}: {found[s]} found / {none[s]} no image")
    print(f"\n{'updated' if LIVE else 'would update'}: {updated} of {len(todo)}")
    print("samples:")
    for nm, sp, fn in samples: print(f"  {nm} ({sp}) -> {fn}")

main()
