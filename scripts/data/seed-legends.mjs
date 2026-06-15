#!/usr/bin/env node
/**
 * seed-legends.mjs — adds retired/all-time-great athletes to the favorite-athlete
 * picker. The roster seeder (seed-athletes.mjs) only pulls *current* rosters, so
 * legends like Kobe, Jeter, Jordan, Gretzky, or Pelé never appear. This script
 * resolves a curated, cross-sport list of legends by name through ESPN's public
 * search API (the reliable source for correct names, ids, and headshots) and
 * upserts them as inactive athletes.
 *
 * Resolution:
 *  - GET site.api.espn.com/apis/search/v2?query=<name> → first `player` result.
 *  - The result carries a per-sport ESPN athlete id (uid "s:..~a:<id>"), the
 *    canonical display name, a sport, and a headshot href. We only accept a
 *    result whose sport matches the bucket the name was curated under, so name
 *    collisions across sports (e.g. multiple "Ronaldo"s) can't slip through.
 *  - Headshots are HEAD-checked; older legends (e.g. Jordan) have none, which is
 *    fine — the picker/Big Four fall back to initials.
 *
 * Idempotency / dedup:
 *  - Existing athletes are loaded first; a legend already present by
 *    (sport, espn id) or by (sport, normalized name) is skipped.
 *  - is_active is left false for everyone here (these are legends).
 *
 * Storage: writes through the Supabase Management API SQL endpoint (direct
 * Postgres isn't reachable from every environment), so it needs only HTTPS.
 *
 * Usage:  node scripts/data/seed-legends.mjs [--dry-run]
 * Env:    SUPABASE_PAT       Supabase personal access token (required unless --dry-run)
 *         SUPABASE_PROJECT   project ref (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const CONCURRENCY = 6;

// ESPN sport string → our sport_type enum
const SPORT_MAP = {
  baseball: "baseball", basketball: "basketball", football: "football",
  hockey: "hockey", soccer: "soccer", golf: "golf", tennis: "tennis",
  racing: "motorsports", motorsports: "motorsports",
};

// Curated legends, bucketed by our sport enum. Names are resolved against ESPN;
// a result is only accepted if its sport matches the bucket.
const LEGENDS = {
  basketball: [
    "Michael Jordan", "Kobe Bryant", "Magic Johnson", "Larry Bird", "Shaquille O'Neal",
    "Tim Duncan", "Hakeem Olajuwon", "Kareem Abdul-Jabbar", "Wilt Chamberlain", "Bill Russell",
    "Allen Iverson", "Dwyane Wade", "Kevin Garnett", "Charles Barkley", "Scottie Pippen",
    "Karl Malone", "John Stockton", "Patrick Ewing", "David Robinson", "Isiah Thomas",
    "Dirk Nowitzki", "Paul Pierce", "Ray Allen", "Vince Carter", "Tracy McGrady",
    "Steve Nash", "Jason Kidd", "Gary Payton", "Reggie Miller", "Clyde Drexler",
    "Dominique Wilkins", "Moses Malone", "Julius Erving", "Oscar Robertson", "Jerry West",
    "Elgin Baylor", "Kevin McHale", "James Worthy", "Pau Gasol", "Carmelo Anthony",
    "Chris Bosh", "Yao Ming", "Manu Ginobili", "Tony Parker", "Chauncey Billups",
    "Grant Hill", "Alonzo Mourning", "Dikembe Mutombo", "Chris Webber", "Shawn Kemp",
    "Dennis Rodman", "George Gervin", "Ben Wallace", "Rasheed Wallace", "Bernard King",
  ],
  baseball: [
    "Derek Jeter", "Babe Ruth", "Hank Aaron", "Willie Mays", "Mickey Mantle",
    "Ken Griffey Jr.", "Barry Bonds", "Mariano Rivera", "Pedro Martinez", "Randy Johnson",
    "Greg Maddux", "Cal Ripken Jr.", "Tony Gwynn", "Roberto Clemente", "Jackie Robinson",
    "Lou Gehrig", "Ted Williams", "Joe DiMaggio", "Sandy Koufax", "Nolan Ryan",
    "Roger Clemens", "Albert Pujols", "David Ortiz", "Ichiro Suzuki", "Chipper Jones",
    "Frank Thomas", "Alex Rodriguez", "Manny Ramirez", "Vladimir Guerrero", "Jim Thome",
    "Mike Piazza", "Ivan Rodriguez", "Trevor Hoffman", "John Smoltz", "Tom Glavine",
    "Bob Gibson", "Stan Musial", "Yogi Berra", "Reggie Jackson", "Rickey Henderson",
    "Wade Boggs", "George Brett", "Ozzie Smith", "Johnny Bench", "Roy Halladay",
    "Ryne Sandberg", "Dennis Eckersley", "Tom Seaver", "Willie McCovey", "Ernie Banks",
  ],
  football: [
    "Tom Brady", "Jerry Rice", "Joe Montana", "Peyton Manning", "Brett Favre",
    "Barry Sanders", "Emmitt Smith", "Walter Payton", "Jim Brown", "Lawrence Taylor",
    "Reggie White", "Deion Sanders", "Ray Lewis", "Ed Reed", "Randy Moss",
    "Terrell Owens", "Marshall Faulk", "LaDainian Tomlinson", "Adrian Peterson", "Drew Brees",
    "Ben Roethlisberger", "Eli Manning", "Troy Polamalu", "Brian Urlacher", "Junior Seau",
    "Bruce Smith", "Michael Strahan", "Warren Sapp", "John Elway", "Dan Marino",
    "Steve Young", "Terry Bradshaw", "Joe Namath", "Johnny Unitas", "Tony Gonzalez",
    "Antonio Gates", "Calvin Johnson", "Charles Woodson", "Larry Fitzgerald", "Frank Gore",
    "Marshawn Lynch", "Rob Gronkowski", "Julius Peppers", "DeMarcus Ware", "Patrick Willis",
    "Steve Smith Sr.", "Andre Johnson", "Tony Romo", "Philip Rivers", "Earl Campbell",
    "Gale Sayers", "Dick Butkus", "Ronnie Lott", "Bo Jackson", "Marcus Allen",
    "Thurman Thomas", "Curtis Martin", "Champ Bailey", "Ladainian Tomlinson",
  ],
  hockey: [
    "Wayne Gretzky", "Mario Lemieux", "Bobby Orr", "Gordie Howe", "Maurice Richard",
    "Patrick Roy", "Martin Brodeur", "Dominik Hasek", "Jaromir Jagr", "Steve Yzerman",
    "Joe Sakic", "Mark Messier", "Brett Hull", "Mike Modano", "Nicklas Lidstrom",
    "Chris Chelios", "Ray Bourque", "Scott Stevens", "Teemu Selanne", "Paul Kariya",
    "Pavel Bure", "Sergei Fedorov", "Peter Forsberg", "Eric Lindros", "Jarome Iginla",
    "Daniel Alfredsson", "Henrik Sedin", "Daniel Sedin", "Zdeno Chara", "Henrik Lundqvist",
    "Joe Thornton", "Patrick Marleau", "Marian Hossa", "Pavel Datsyuk", "Guy Lafleur",
    "Phil Esposito", "Bobby Hull", "Stan Mikita", "Jean Beliveau", "Grant Fuhr",
  ],
  soccer: [
    "Pele", "Diego Maradona", "Johan Cruyff", "Franz Beckenbauer", "Ronaldo",
    "Ronaldinho", "Zinedine Zidane", "Thierry Henry", "David Beckham", "Steven Gerrard",
    "Frank Lampard", "Paolo Maldini", "Andrea Pirlo", "Xavi", "Andres Iniesta",
    "Carles Puyol", "Roberto Carlos", "Cafu", "Kaka", "Wayne Rooney",
    "Francesco Totti", "Alessandro Del Piero", "Raul", "Iker Casillas", "Gianluigi Buffon",
    "Didier Drogba", "Samuel Eto'o", "Bobby Charlton", "Michel Platini", "Romario",
    "Rivaldo", "Landon Donovan", "Clint Dempsey", "Tim Howard", "Mia Hamm",
    "Abby Wambach", "Carli Lloyd",
  ],
  tennis: [
    "Roger Federer", "Serena Williams", "Venus Williams", "Pete Sampras", "Andre Agassi",
    "Steffi Graf", "Martina Navratilova", "Chris Evert", "Boris Becker", "John McEnroe",
    "Jimmy Connors", "Bjorn Borg", "Rod Laver", "Monica Seles", "Maria Sharapova",
    "Justine Henin", "Lleyton Hewitt", "Andy Roddick", "Kim Clijsters", "Ivan Lendl",
  ],
  golf: [
    "Tiger Woods", "Jack Nicklaus", "Arnold Palmer", "Gary Player", "Tom Watson",
    "Seve Ballesteros", "Nick Faldo", "Greg Norman", "Phil Mickelson", "Ben Hogan",
    "Sam Snead", "Lee Trevino", "Vijay Singh", "Ernie Els", "Fred Couples",
    "Payne Stewart", "Bobby Jones",
  ],
  motorsports: [
    "Dale Earnhardt", "Dale Earnhardt Jr.", "Jeff Gordon", "Richard Petty", "Jimmie Johnson",
    "Tony Stewart", "Mark Martin", "Rusty Wallace", "Bill Elliott", "Ayrton Senna",
    "Michael Schumacher", "Niki Lauda", "Alain Prost", "Mario Andretti", "A.J. Foyt",
  ],
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function makeLimiter(max) {
  let active = 0; const queue = [];
  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

function normName(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Guard against ESPN's fuzzy search returning a different same-sport player when
 * the real legend isn't indexed (e.g. "Mia Hamm" → "Mia Hammermann"). Require
 * the surname to appear as a full token in the result and, for multi-word
 * queries, the given name too. Mononyms must match exactly.
 */
function nameMatches(query, resultName) {
  const q = normName(query), r = normName(resultName);
  if (!q || !r) return false;
  if (q === r) return true;
  const qt = q.split(" ");
  const rTokens = r.split(" ");
  const rt = new Set(rTokens);
  if (qt.length === 1) return rt.has(q); // mononym: exact token only
  // Generational suffixes must match exactly, else it's a different person
  // (e.g. "Patrick Ewing" must not match his son "Patrick Ewing Jr.").
  const SUFFIX = new Set(["jr", "sr", "ii", "iii"]);
  const qSuf = qt.filter((t) => SUFFIX.has(t)).join();
  const rSuf = rTokens.filter((t) => SUFFIX.has(t)).join();
  if (qSuf !== rSuf) return false;
  let i = qt.length - 1;
  while (i > 0 && SUFFIX.has(qt[i])) i--;
  const surname = qt[i];
  return rt.has(surname) && rt.has(qt[0]); // surname AND given name both present
}

function sqlLit(s) {
  if (s === null || s === undefined) return "null";
  return `'${String(s).replace(/'/g, "''")}'`;
}

async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-legends/1.0" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw new Error(`HTTP ${res.status}: ${url}`);
      await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 5) throw err;
    await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1);
  }
}

const headCache = new Map();
async function headOk(url) {
  if (!url) return null;
  if (headCache.has(url)) return headCache.get(url);
  let out = null;
  try { const r = await fetch(url, { method: "HEAD" }); if (r.ok) out = url; } catch { /* no headshot */ }
  headCache.set(url, out);
  return out;
}

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Resolve one curated name → {espnId, name, sport, headshot} or null. */
async function resolve(name, expectSport) {
  const data = await fetchJSON(`https://site.api.espn.com/apis/search/v2?query=${encodeURIComponent(name)}&limit=6`);
  const playerGroup = (data.results || []).find((r) => r.type === "player");
  for (const c of playerGroup?.contents || []) {
    const sport = SPORT_MAP[c.sport];
    if (sport !== expectSport) continue;
    if (!nameMatches(name, c.displayName)) continue;
    const m = /a:(\d+)/.exec(c.uid || "");
    if (!m) continue;
    const headshot = await headOk(c.image?.default || null);
    return { espnId: m[1], name: c.displayName, sport, headshot };
  }
  return null;
}

// ---------------------------------------------------------------------------

if (!DRY && !PAT) { console.error("SUPABASE_PAT is required (or pass --dry-run)."); process.exit(2); }

const limiter = makeLimiter(CONCURRENCY);

// Existing athletes for dedup.
const haveEspn = new Set();
const haveName = new Set();
if (!DRY) {
  const rows = await runSQL(`select sport, external_ids->>'espn' as espn, name from athletes`);
  for (const r of rows) {
    if (r.espn) haveEspn.add(`${r.sport}|${r.espn}`);
    haveName.add(`${r.sport}|${normName(r.name)}`);
  }
  console.log(`Loaded ${rows.length} existing athletes for dedup.`);
}

const jobs = [];
for (const [sport, names] of Object.entries(LEGENDS)) {
  for (const name of names) jobs.push(limiter(async () => {
    try {
      const r = await resolve(name, sport);
      if (!r) { console.warn(`  [miss] ${sport}: "${name}" — no matching player result`); return null; }
      return r;
    } catch (err) {
      console.warn(`  [err]  ${sport}: "${name}" — ${err.message}`); return null;
    }
  }));
}

const resolved = (await Promise.all(jobs)).filter(Boolean);

// Dedup within this run + against existing.
const seen = new Set();
const toInsert = [];
let dupExisting = 0, dupRun = 0;
for (const r of resolved) {
  const ek = `${r.sport}|${r.espnId}`;
  const nk = `${r.sport}|${normName(r.name)}`;
  if (seen.has(ek) || seen.has(nk)) { dupRun++; continue; }
  seen.add(ek); seen.add(nk);
  if (haveEspn.has(ek) || haveName.has(nk)) { dupExisting++; continue; }
  toInsert.push(r);
}

console.log(`\nResolved ${resolved.length}/${jobs.length} · new ${toInsert.length} · already present ${dupExisting} · dup-in-run ${dupRun}`);
const withHead = toInsert.filter((r) => r.headshot).length;
console.log(`Headshots: ${withHead}/${toInsert.length}`);

if (DRY) {
  for (const r of toInsert) console.log(`  + ${r.sport.padEnd(11)} ${r.name}${r.headshot ? "" : "  (no headshot)"}`);
  console.log("\nDRY RUN — nothing written.");
  process.exit(0);
}

// Insert in batches.
let inserted = 0;
for (let i = 0; i < toInsert.length; i += 80) {
  const batch = toInsert.slice(i, i + 80);
  const values = batch.map((r) =>
    `(${sqlLit(r.name)}, ${sqlLit(r.sport)}::sport_type, ${sqlLit(r.headshot)}, false, jsonb_build_object('espn', ${sqlLit(r.espnId)}))`
  ).join(",\n");
  const sql = `insert into athletes (name, sport, headshot_url, is_active, external_ids) values\n${values};`;
  await runSQL(sql);
  inserted += batch.length;
  console.log(`  inserted ${inserted}/${toInsert.length}`);
}

console.log(`\nDone. Inserted ${inserted} legends.`);
