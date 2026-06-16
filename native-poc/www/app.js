/* BoxdSeats photo-scan proof-of-concept.
 *
 * Goal: confirm an iOS Capacitor app can read each photo's timestamp + GPS, and
 * that geofencing those points against our venue list produces real hits. It is
 * deliberately exploratory — it prints the raw shape of whatever the photo
 * plugin returns so we can correct the field names against reality instead of
 * guessing. Nothing leaves the device.
 */

const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const rawEl = document.getElementById("raw");
const btn = document.getElementById("scan");

function setStatus(msg, isErr) {
  statusEl.innerHTML = `<span class="${isErr ? "err" : ""}">${msg}</span>`;
}

// Haversine distance in meters.
function distMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Pull lat/lng out of an asset no matter how the plugin nests it.
function coordsOf(asset) {
  const loc = asset.location || asset.gps || asset.coords || asset;
  const lat = loc.latitude ?? loc.lat ?? asset.latitude ?? asset.lat;
  const lng = loc.longitude ?? loc.lng ?? loc.lon ?? asset.longitude ?? asset.lng;
  if (typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0)) {
    return { lat, lng };
  }
  return null;
}

function dateOf(asset) {
  return (
    asset.creationDate || asset.dateTaken || asset.timestamp || asset.date || null
  );
}

async function loadVenues() {
  const res = await fetch("venues.json");
  return res.json(); // [[lat, lng, name], ...]
}

async function getAssets() {
  const Cap = window.Capacitor;
  if (!Cap || !Cap.Plugins) throw new Error("Capacitor not available (open this inside the native app, not a browser).");
  const Media = Cap.Plugins.Media;
  if (!Media) throw new Error("Media plugin not found on Capacitor.Plugins. Did `npx cap sync ios` run? Plugins seen: " + Object.keys(Cap.Plugins).join(", "));

  // The exact option names vary by plugin version — try a couple of shapes and
  // let whichever one returns assets win. We just need a list back.
  const attempts = [
    () => Media.getMedias({ quantity: 1500, types: "photos", sort: [{ key: "creationDate", ascending: false }] }),
    () => Media.getMedias({ quantity: 1500, type: "photos" }),
    () => Media.getMedias({ quantity: 1500 }),
    () => Media.getMedias({}),
  ];
  let lastErr;
  for (const attempt of attempts) {
    try {
      const r = await attempt();
      const assets = r.medias || r.assets || r.photos || r.results || (Array.isArray(r) ? r : null);
      if (assets && assets.length >= 0) return { assets, rawTop: r };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("getMedias returned nothing in any known shape.");
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  setStatus("Requesting photo access…");
  resultsEl.innerHTML = "";
  try {
    const [{ assets, rawTop }, venues] = await Promise.all([getAssets(), loadVenues()]);

    // Show the raw shape of the first asset + the top-level keys — this is the
    // ground truth we use to fix field names.
    const sample = assets[0] ? { ...assets[0] } : null;
    if (sample && sample.data) sample.data = "<base64 thumb omitted>";
    rawEl.textContent = JSON.stringify(
      { topLevelKeys: Object.keys(rawTop || {}), assetCount: assets.length, firstAsset: sample },
      null,
      2
    );

    let withCoords = 0;
    const matches = [];
    for (const a of assets) {
      const c = coordsOf(a);
      if (!c) continue;
      withCoords++;
      let best = null;
      for (const [vlat, vlng, name] of venues) {
        const d = distMeters(c.lat, c.lng, vlat, vlng);
        if (d <= 350 && (!best || d < best.d)) best = { d, name };
      }
      if (best) matches.push({ name: best.name, meters: Math.round(best.d), date: dateOf(a) });
    }

    setStatus(
      `Scanned <b>${assets.length}</b> photos · <b>${withCoords}</b> had GPS · ` +
        `<b>${matches.length}</b> were at a venue.`
    );

    if (withCoords === 0) {
      resultsEl.innerHTML =
        `<p class="sub err">No photos exposed GPS coordinates. Either the plugin doesn't return location ` +
        `(see the raw sample above) or iOS withheld it. Paste the raw sample back.</p>`;
    }

    matches
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 25)
      .forEach((m) => {
        const div = document.createElement("div");
        div.className = "match";
        div.innerHTML = `<div class="v">${m.name} <span class="d">(${m.meters}m)</span></div><div class="d">${m.date ?? "no date"}</div>`;
        resultsEl.appendChild(div);
      });
  } catch (e) {
    setStatus("Error: " + (e && e.message ? e.message : String(e)), true);
    rawEl.textContent = (e && e.stack) || String(e);
  } finally {
    btn.disabled = false;
  }
});
