#!/usr/bin/env python3
"""Ingest ESPN box scores for events and populate athletes + event_athletes.

This is the box-score pipeline validated in the scoping work. Given a set of
events it fetches each one's box score from ESPN, then:
  - upserts every participant into `athletes` keyed by (sport, external_ids.espn)
    so existing players (incl. the roster-seeded ones) merge with no dupes;
  - inserts one `event_athletes` row per (event, athlete) with team, finish
    position and winner flag where the sport provides them.

Idempotent: events that already have event_athletes rows are skipped, so it's
safe to re-run. Covers the sports with an unambiguous field — team sports (box
score), soccer (rosters), golf (leaderboard), motorsports (race scoreboard).
Tennis is skipped (a logged day maps to many matches, so attendance is
ambiguous).

Usage:  python3 scripts/data/ingest_boxscores.py [--live] [--limit=N]
        (default is a dry run that writes nothing)
Env:    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
"""
import os, sys, json, time, urllib.request, urllib.parse, collections

for line in open(os.path.join(os.path.dirname(__file__), "../../.env.local")):
    import re as _re
    m = _re.match(r"^([A-Z0-9_]+)=(.*)$", line)
    if m and m.group(1) not in os.environ: os.environ[m.group(1)] = m.group(2)
URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]; KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
LIVE = "--live" in sys.argv
LIMIT = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--limit=")), None)
UA = "BoxdSeats/1.0 (arinaldi@yext.com)"
HDR = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}

def db_get(p): return json.load(urllib.request.urlopen(urllib.request.Request(URL + "/rest/v1/" + p, headers=HDR)))
def db_post(tbl, rows):
    r = urllib.request.Request(URL + "/rest/v1/" + tbl, method="POST", data=json.dumps(rows).encode(),
                               headers={**HDR, "Prefer": "return=representation"})
    return json.load(urllib.request.urlopen(r))
def espn(url):
    try: return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20))
    except Exception: return None

SOCCER_CODE = {"mls": "usa.1", "nwsl": "usa.nwsl"}
RACING = {"nascar-cup": "nascar-premier", "nascar-xfinity": "nascar-secondary",
          "nascar-truck": "nascar-craftsman", "f1": "f1", "indycar": "irl", "imsa": "imsa"}
TEAM_PATH = {"mlb": "baseball/mlb", "nba": "basketball/nba", "wnba": "basketball/wnba",
             "ncaam": "basketball/mens-college-basketball", "nhl": "hockey/nhl",
             "nfl": "football/nfl", "ncaaf": "football/college-football"}

# --- per-sport parsers: return list of (espn_athlete_id, name, espn_team_id, finish_pos, is_winner) ---
def parse_team(d):
    out = []
    for t in (d.get("boxscore", {}) or {}).get("players", []) or []:
        tid = (t.get("team") or {}).get("id")
        for cat in t.get("statistics", []) or []:
            for a in cat.get("athletes", []) or []:
                ath = a.get("athlete") or {}
                if ath.get("id"): out.append((str(ath["id"]), ath.get("displayName"), str(tid) if tid else None, None, None))
    return out
def parse_soccer(d):
    out = []
    for t in d.get("rosters", []) or []:
        tid = (t.get("team") or {}).get("id")
        for r in t.get("roster", []) or []:
            ath = r.get("athlete") or {}
            if ath.get("id"): out.append((str(ath["id"]), ath.get("displayName"), str(tid) if tid else None, None, None))
    return out
def parse_field(d):  # golf / motorsports — competitor.id is the stable athlete id
    out = []
    evs = d.get("events", []) or [d]
    for e in evs:
        for comp in e.get("competitions", []) or []:
            for c in comp.get("competitors", []) or []:
                aid = c.get("id") or (c.get("athlete") or {}).get("id")
                nm = (c.get("athlete") or {}).get("displayName")
                if aid: out.append((str(aid), nm, None, c.get("order"), bool(c.get("winner"))))
    return out

def fetch_event(sport, slug, espnid, date):
    if sport == "tennis": return None
    if sport == "soccer":
        code = SOCCER_CODE.get(slug, slug)
        return parse_soccer(espn(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{code}/summary?event={espnid}") or {})
    if sport == "golf":
        base = espnid.split("-")[0]
        return parse_field(espn(f"https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event={base}") or {})
    if sport == "motorsports":
        path = RACING.get(slug)
        if not path: return None
        d = espn(f"https://site.api.espn.com/apis/site/v2/sports/racing/{path}/scoreboard?dates={date.replace('-','')}") or {}
        d = {"events": [x for x in d.get("events", []) if x.get("id") == espnid]}
        return parse_field(d)
    path = TEAM_PATH.get(slug)
    if not path: return None
    return parse_team(espn(f"https://site.api.espn.com/apis/site/v2/sports/{path}/summary?event={espnid}") or {})

def main():
    print(f"[ingest] {'LIVE' if LIVE else 'DRY RUN'}{f' limit={LIMIT}' if LIMIT else ''}")
    logs = db_get("event_logs?select=event_id&event_id=not.is.null&limit=5000")
    ids = list({l["event_id"] for l in logs})
    meta = {}
    for i in range(0, len(ids), 50):
        for r in db_get("events?select=id,event_date,external_ids,home_team_id,away_team_id,leagues(sport,slug)&id=in.(" + ",".join(ids[i:i+50]) + ")"):
            meta[r["id"]] = {"espn": (r.get("external_ids") or {}).get("espn"), "sport": (r.get("leagues") or {}).get("sport"),
                             "slug": (r.get("leagues") or {}).get("slug"), "date": r["event_date"]}
    # events already ingested -> skip (idempotent)
    done = set()
    for i in range(0, len(ids), 50):
        for r in db_get("event_athletes?select=event_id&event_id=in.(" + ",".join(ids[i:i+50]) + ")"):
            done.add(r["event_id"])
    # team espn id -> our uuid
    team_map = {}
    off = 0
    while True:
        rows = db_get(f"teams?select=id,external_ids&order=id&limit=1000&offset={off}")
        for t in rows:
            e = (t.get("external_ids") or {}).get("espn")
            if e: team_map[str(e)] = t["id"]
        if len(rows) < 1000: break
        off += 1000

    # pass 1: fetch + parse, collect participants
    todo = [eid for eid in ids if eid not in done and meta.get(eid, {}).get("sport") not in (None, "tennis")]
    if LIMIT: todo = todo[:LIMIT]
    parts = {}  # event_id -> list of (espn_aid, name, espn_tid, pos, winner)
    by_sport_ath = collections.defaultdict(dict)  # sport -> {espn_aid: name}
    fetched = collections.Counter()
    for n, eid in enumerate(todo):
        m = meta[eid]
        if not m["espn"]: fetched["no-espn-id"] += 1; continue
        time.sleep(0.2)
        aths = fetch_event(m["sport"], m["slug"], m["espn"], m["date"])
        if not aths: fetched[f"empty:{m['sport']}"] += 1; continue
        aths = list({a[0]: a for a in aths}.values())
        parts[eid] = aths
        for a in aths: by_sport_ath[m["sport"]][a[0]] = a[1]
        fetched[f"ok:{m['sport']}"] += 1

    # pass 2: resolve athletes (existing vs new) per sport
    espn_to_uuid = {}  # (sport, espn_aid) -> athlete uuid
    new_count = 0
    for sport, athmap in by_sport_ath.items():
        eids = list(athmap.keys())
        for i in range(0, len(eids), 80):
            chunk = eids[i:i+80]
            for r in db_get(f"athletes?select=id,external_ids&sport=eq.{sport}&external_ids->>espn=in.(" + ",".join(chunk) + ")"):
                espn_to_uuid[(sport, (r.get("external_ids") or {}).get("espn"))] = r["id"]
        missing = [(sport, aid) for aid in eids if (sport, aid) not in espn_to_uuid]
        new_count += len(missing)
        if missing and LIVE:
            for i in range(0, len(missing), 100):
                rows = [{"name": athmap[aid] or "Unknown", "sport": sport, "is_active": True,
                         "external_ids": {"espn": aid}} for (sp, aid) in missing[i:i+100]]
                for ins in db_post("athletes?select=id,external_ids", rows):
                    espn_to_uuid[(sport, (ins.get("external_ids") or {}).get("espn"))] = ins["id"]

    # pass 3: build + insert event_athletes
    ea_rows = []
    for eid, aths in parts.items():
        sport = meta[eid]["sport"]
        for (aid, name, tid, pos, winner) in aths:
            uuid = espn_to_uuid.get((sport, aid))
            if not uuid:  # only happens in dry run (new athletes not inserted)
                continue
            ea_rows.append({"event_id": eid, "athlete_id": uuid, "team_id": team_map.get(tid),
                            "finish_position": pos, "is_winner": winner})
    if LIVE and ea_rows:
        for i in range(0, len(ea_rows), 500):
            db_post("event_athletes?select=id", ea_rows[i:i+500])

    print("\n=== fetch coverage ===")
    for k, v in sorted(fetched.items()): print(f"  {k}: {v}")
    print(f"\nevents to ingest: {len(todo)} (already done, skipped: {len(done)})")
    print(f"distinct athletes touched: {sum(len(m) for m in by_sport_ath.values())} | new (would insert): {new_count}")
    print(f"event_athletes rows {'inserted' if LIVE else 'that would insert (existing-athlete subset in dry run)'}: {len(ea_rows)}")

main()
