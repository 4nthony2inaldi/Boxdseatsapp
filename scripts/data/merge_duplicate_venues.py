#!/usr/bin/env python3
"""Merge confirmed duplicate venues (renames + mojibake/seed dups).

Detects clusters via: exact same name+city, OR same city + shared team +
near-identical coordinates (<150m = same physical building renamed). Excludes
relocations (different buildings, same team) and a couple of hand-vetted false
positives. For each cluster the venue with the most events is canonical; the
others' events/logs/visits/list-items/favorites/teams/aliases are repointed to
it, their names are kept as search aliases, and the dup rows are deleted.

Run:  python3 scripts/data/merge_duplicate_venues.py [--live]
Env:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
"""
import os, sys, json, urllib.request, urllib.parse, struct, collections, re
from math import radians, sin, cos, asin, sqrt

for line in open(os.path.join(os.path.dirname(__file__), "../../.env.local")):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line)
    if m and m.group(1) not in os.environ: os.environ[m.group(1)] = m.group(2)
URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]; KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
LIVE = "--live" in sys.argv
H = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}

def req(method, path, body=None, prefer=None):
    h = dict(H)
    if prefer: h["Prefer"] = prefer
    r = urllib.request.Request(URL + "/rest/v1/" + path, method=method,
                               data=json.dumps(body).encode() if body is not None else None, headers=h)
    return urllib.request.urlopen(r)
def get(path):
    return json.load(req("GET", path))
def page(tbl, sel):
    out = []; off = 0
    while True:
        rows = get(f"{tbl}?select={sel}&order=id&limit=1000&offset={off}"); out += rows
        if len(rows) < 1000: break
        off += 1000
    return out
def dec(h):
    if not h: return None
    b = bytes.fromhex(h); x, y = struct.unpack_from("<dd", b, 9); return (y, x)
def dist(a, b):
    R = 6371000; la1, lo1, la2, lo2 = map(radians, [a[0], a[1], b[0], b[1]])
    h = sin((la2-la1)/2)**2 + cos(la1)*cos(la2)*sin((lo2-lo1)/2)**2
    return 2*R*asin(sqrt(h))
def norm(s): return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()
def demojibake(s):
    if not s or not re.search(r"[ÃÂ]", s): return (s or "").strip()
    try:
        f = s.encode("latin-1").decode("utf-8")
        return f.strip() if "�" not in f else s.strip()
    except Exception:
        return s.strip()

venues = page("venues", "id,name,city,location,photo_url")
vById = {v["id"]: v for v in venues}
counts = collections.Counter()
for e in page("events", "venue_id"): counts[e["venue_id"]] += 1
cl = collections.Counter(v["location"] for v in venues if v.get("location"))
junk = {loc for loc, c in cl.items() if c >= 5}
coords = {v["id"]: dec(v["location"]) for v in venues if v.get("location") and v["location"] not in junk}
city = {v["id"]: norm(v.get("city")) for v in venues}
nm = {v["id"]: norm(v["name"]) for v in venues}
vt = collections.defaultdict(set)
for r in page("venue_teams", "venue_id,team_id"): vt[r["venue_id"]].add(r["team_id"])

# hand-vetted exclusions: relocations / distinct-but-adjacent venues
EXCLUDE_NAMES = {"community america ballpark", "white hart lane", "tottenham hotspur stadium"}

parent = {}
def find(x):
    parent.setdefault(x, x)
    while parent[x] != x: parent[x] = parent[parent[x]]; x = parent[x]
    return x
def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb: parent[ra] = rb

byname = collections.defaultdict(list)
for v in venues:
    if nm[v["id"]]: byname[(nm[v["id"]], city[v["id"]])].append(v["id"])
for g in byname.values():
    for x in g[1:]: union(g[0], x)
bycity = collections.defaultdict(list)
for v in venues:
    if city[v["id"]] and v["id"] in vt and v["id"] in coords: bycity[city[v["id"]]].append(v["id"])
for c, vs in bycity.items():
    for i in range(len(vs)):
        for j in range(i+1, len(vs)):
            a, b = vs[i], vs[j]
            if nm[a] != nm[b] and (vt[a] & vt[b]) and dist(coords[a], coords[b]) < 150:
                union(a, b)
union("9e35fa79-b036-5462-95d0-d900f2f0c9d8", "b8fcb369-d0d3-43c3-8cb9-d69d68c8574e")  # Red Bull / SI

clusters = collections.defaultdict(list)
for v in venues: clusters[find(v["id"])].append(v["id"])
merges = []
for root, mem in clusters.items():
    if len(mem) < 2: continue
    if any(nm[i] in EXCLUDE_NAMES for i in mem):
        print(f"  EXCLUDE cluster: {[vById[i]['name'] for i in mem]}")
        continue
    mem.sort(key=lambda i: -counts[i])
    merges.append((mem[0], mem[1:]))

REPOINT = [("events", "venue_id"), ("event_logs", "venue_id"), ("venue_visits", "venue_id"),
           ("list_items", "venue_id"), ("user_league_favorites", "venue_id"),
           ("venue_teams", "venue_id"), ("venue_aliases", "venue_id"), ("profiles", "fav_venue_id")]

def repoint(tbl, col, dup, canon):
    """Repoint dup->canon; on unique-constraint conflict, drop the dup's rows."""
    try:
        req("PATCH", f"{tbl}?{col}=eq.{dup}", {col: canon}, prefer="return=minimal")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            req("DELETE", f"{tbl}?{col}=eq.{dup}", prefer="return=minimal")
        else:
            raise

sql = ["begin;"]
print(f"\n{'LIVE' if LIVE else 'DRY'} — {len(merges)} clusters, {sum(len(d) for _,d in merges)} venues to remove\n")
for canon, dups in merges:
    # clean the canonical name (fix mojibake / trailing space)
    clean = demojibake(vById[canon]["name"])
    if clean and clean != vById[canon]["name"]:
        sql.append("update venues set name = '%s' where id = '%s';" % (clean.replace("'", "''"), canon))
        if LIVE: req("PATCH", f"venues?id=eq.{canon}", {"name": clean}, prefer="return=minimal")
    print(f"CANON {clean} [{counts[canon]}]")
    for dup in dups:
        print(f"   <= {vById[dup]['name']} [{counts[dup]}]")
        # add dup name as a search alias of canon so the old name still resolves
        if nm[dup] != nm[canon]:
            sql.append("insert into venue_aliases (venue_id, alias_name) values ('%s', '%s');" % (canon, vById[dup]["name"].replace("'", "''")))
            if LIVE:
                try: req("POST", "venue_aliases", {"venue_id": canon, "alias_name": vById[dup]["name"]}, prefer="return=minimal")
                except Exception: pass
        # copy missing location/photo from dup to canon
        patch = {}
        if not vById[canon].get("location") and vById[dup].get("location"): patch["location"] = vById[dup]["location"]
        if not vById[canon].get("photo_url") and vById[dup].get("photo_url"): patch["photo_url"] = vById[dup]["photo_url"]
        if patch and LIVE: req("PATCH", f"venues?id=eq.{canon}", patch, prefer="return=minimal")
        for tbl, col in REPOINT:
            sql.append(f"update {tbl} set {col} = '{canon}' where {col} = '{dup}';")
            if LIVE: repoint(tbl, col, dup, canon)
        sql.append(f"delete from venues where id = '{dup}';")
        if LIVE: req("DELETE", f"venues?id=eq.{dup}", prefer="return=minimal")
sql.append("commit;")
open("/tmp/merge_venues.sql", "w").write("\n".join(sql))
print(f"\nSQL written to /tmp/merge_venues.sql ({len(merges)} merges)")
