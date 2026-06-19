#!/usr/bin/env python3
"""Standardize major-venue naming: current sponsor name as the main name, every
historical name as a searchable alias, and merge rename-duplicate rows.

Sports venues get renamed often (Staples Center -> Crypto.com Arena, Wells Fargo
Center -> Xfinity Mobile Arena). The DB had a mix: some current with no priors,
some stuck on an old name, some split into two rows. This applies a curated map
of {current name, city -> [historical names]}: it finds every venue row matching
any of those names, merges them into one (most events = canonical), sets the
canonical name to the current one, and records all the others as aliases so old
names still surface the venue in search.

Run:  python3 scripts/data/standardize_venue_names.py [--live]
Env:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
"""
import os, sys, json, urllib.request, urllib.parse, re, collections

for line in open(os.path.join(os.path.dirname(__file__), "../../.env.local")):
    m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
    if m and m.group(1) not in os.environ: os.environ[m.group(1)] = m.group(2)
URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]; KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
LIVE = "--live" in sys.argv
HDR = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}

def req(method, path, body=None, prefer=None):
    h = dict(HDR)
    if prefer: h["Prefer"] = prefer
    return urllib.request.urlopen(urllib.request.Request(
        URL + "/rest/v1/" + path, method=method,
        data=json.dumps(body).encode() if body is not None else None, headers=h))
def get(path): return json.load(req("GET", path))
def norm(s): return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()

# current name -> historical names (most recent first is the main name)
CANON = {
    "Crypto.com Arena": ["Staples Center"],
    "Xfinity Mobile Arena": ["Wells Fargo Center", "Wachovia Center", "First Union Center", "CoreStates Center"],
    "Footprint Center": ["Talking Stick Resort Arena", "US Airways Center", "America West Arena", "PHX Arena", "Talking Stick Resort"],
    "Kaseya Center": ["FTX Arena", "American Airlines Arena", "AmericanAirlines Arena", "Miami-Dade Arena"],
    "Smoothie King Center": ["New Orleans Arena"],
    "Gainbridge Fieldhouse": ["Bankers Life Fieldhouse", "Conseco Fieldhouse"],
    "Frost Bank Center": ["AT&T Center", "SBC Center"],
    "Paycom Center": ["Chesapeake Energy Arena", "Ford Center"],
    "Ball Arena": ["Pepsi Center"],
    "Capital One Arena": ["Verizon Center", "MCI Center"],
    "Scotiabank Arena": ["Air Canada Centre"],
    "State Farm Arena": ["Philips Arena"],
    "Moda Center": ["Rose Garden Arena", "Rose Garden"],
    "Spectrum Center": ["Time Warner Cable Arena", "Charlotte Bobcats Arena"],
    "Rocket Arena": ["Rocket Mortgage FieldHouse", "Quicken Loans Arena", "Gund Arena"],
    "Delta Center": ["Vivint Arena", "Vivint Smart Home Arena", "EnergySolutions Arena"],
    "TD Garden": ["TD Banknorth Garden", "FleetCenter"],
    "Honda Center": ["Arrowhead Pond", "Arrowhead Pond of Anaheim"],
    "Acrisure Stadium": ["Heinz Field"],
    "Paycor Stadium": ["Paul Brown Stadium"],
    "Caesars Superdome": ["Mercedes-Benz Superdome", "Louisiana Superdome", "Superdome"],
    "EverBank Stadium": ["TIAA Bank Field", "EverBank Field", "Alltel Stadium"],
    "Highmark Stadium": ["New Era Field", "Ralph Wilson Stadium", "Bills Stadium", "Rich Stadium"],
    "Northwest Stadium": ["FedExField", "Commanders Field", "FedEx Field"],
    "Oracle Park": ["AT&T Park", "Pacific Bell Park", "SBC Park"],
    "T-Mobile Park": ["Safeco Field"],
    "loanDepot park": ["Marlins Park"],
    "Rate Field": ["Guaranteed Rate Field", "U.S. Cellular Field", "US Cellular Field", "Comiskey Park"],
    "Progressive Field": ["Jacobs Field"],
    "Truist Park": ["SunTrust Park"],
}

venues = []
off = 0
while True:
    rows = get(f"venues?select=id,name,city,location,photo_url&order=id&limit=1000&offset={off}"); venues += rows
    if len(rows) < 1000: break
    off += 1000
counts = collections.Counter()
for e in (lambda:[])():
    pass
off = 0
while True:
    rows = get(f"events?select=venue_id&order=id&limit=1000&offset={off}")
    if not rows: break
    for r in rows: counts[r["venue_id"]] += 1
    if len(rows) < 1000: break
    off += 1000

by_norm = collections.defaultdict(list)
for v in venues: by_norm[norm(v["name"])].append(v)

REPOINT = [("events","venue_id"),("event_logs","venue_id"),("venue_visits","venue_id"),
           ("list_items","venue_id"),("user_league_favorites","venue_id"),
           ("venue_teams","venue_id"),("venue_aliases","venue_id"),("profiles","fav_venue_id")]
def repoint(tbl,col,dup,canon):
    try: req("PATCH", f"{tbl}?{col}=eq.{dup}", {col:canon}, prefer="return=minimal")
    except urllib.error.HTTPError as e:
        if e.code==409: req("DELETE", f"{tbl}?{col}=eq.{dup}", prefer="return=minimal")
        else: raise
def add_alias(vid, name):
    ex = get(f"venue_aliases?select=id&venue_id=eq.{vid}&alias_name=eq."+urllib.parse.quote(name))
    if ex: return
    if LIVE: req("POST","venue_aliases",{"venue_id":vid,"alias_name":name},prefer="return=minimal")

renamed=merged=aliased=0
for current, historicals in CANON.items():
    names = [current] + historicals
    nset = {norm(n) for n in names}
    matches = []
    for n in nset: matches += by_norm.get(n, [])
    matches = {v["id"]: v for v in matches}.values()
    matches = sorted(matches, key=lambda v: -counts[v["id"]])
    if not matches:
        continue
    canon = matches[0]
    cid = canon["id"]
    # Only merge other rows that are in the SAME city as the canonical — a
    # generic historical name (e.g. "Ford Center", "Rose Garden") can also name
    # an unrelated venue elsewhere, which must not be merged in.
    canon_city = norm(canon.get("city"))
    dups = [m for m in list(matches)[1:] if canon_city and norm(m.get("city")) == canon_city]
    skipped = [m for m in list(matches)[1:] if m not in dups]
    for s in skipped:
        print(f"    SKIP merge (diff city): {s['name']!r} in {s.get('city')!r} vs canon {canon.get('city')!r}")
    print(f"[{current}] canonical={canon['name']!r} ({counts[cid]} ev){' + '+str(len(dups))+' dup(s)' if dups else ''}")
    # merge any other rows into canonical
    for dup in dups:
        merged += 1
        print(f"    merge <= {dup['name']!r} ({counts[dup['id']]} ev)")
        if not canon.get("location") and dup.get("location") and LIVE:
            req("PATCH", f"venues?id=eq.{cid}", {"location": dup["location"]}, prefer="return=minimal")
        if not canon.get("photo_url") and dup.get("photo_url") and LIVE:
            req("PATCH", f"venues?id=eq.{cid}", {"photo_url": dup["photo_url"]}, prefer="return=minimal")
        for tbl,col in REPOINT:
            if LIVE: repoint(tbl,col,dup["id"],cid)
        add_alias(cid, dup["name"])
        if LIVE: req("DELETE", f"venues?id=eq.{dup['id']}", prefer="return=minimal")
    # set canonical name to the current name
    if norm(canon["name"]) != norm(current):
        renamed += 1
        print(f"    rename '{canon['name']}' -> '{current}'")
        if LIVE: req("PATCH", f"venues?id=eq.{cid}", {"name": current}, prefer="return=minimal")
    # every historical name becomes a searchable alias
    for h in historicals:
        if norm(h) != norm(current):
            add_alias(cid, h); aliased += 1
print(f"\n{'LIVE' if LIVE else 'DRY'} done. renamed={renamed} merged={merged} aliases~={aliased}")
