#!/usr/bin/env node
/**
 * Mikelvra — refresca data/normativa.json, noticias.json, calendario.json
 * Fuentes: seed curado + AFP open endpoints + HTML oficial gob.pe
 * Fallos parciales = warning; siempre deja JSON válidos.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const SEED = path.join(DATA, "seed", "normativa.base.json");

const AFP_NAME_MAP = {
  HABITAT: { id: "habitat", nombre: "AFP Habitat" },
  INTEGRA: { id: "integra", nombre: "AFP Integra" },
  PRIMA: { id: "prima", nombre: "AFP Prima" },
  PROFUTURO: { id: "profuturo", nombre: "AFP Profuturo" },
};

const NEWS_PAGES = [
  { source: "MEF", url: "https://www.gob.pe/institucion/mef/noticias" },
  { source: "MTPE", url: "https://www.gob.pe/institucion/mtpe/noticias" },
  { source: "SUNAT", url: "https://www.gob.pe/institucion/sunat/noticias" },
  { source: "SBS", url: "https://www.gob.pe/institucion/sbs/noticias" },
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function periodKeys(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const prev2 = prev.m === 1 ? { y: prev.y - 1, m: 12 } : { y: prev.y, m: prev.m - 1 };
  return [
    `${y}-${pad(m)}`,
    `${prev.y}-${pad(prev.m)}`,
    `${prev2.y}-${pad(prev2.m)}`,
  ];
}

async function fetchText(url, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json, text/html, */*",
        "User-Agent": "Mozilla/5.0 (compatible; MikelvraOpenData/1.0; +https://mikelvra.com)",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function slugToTitle(slug) {
  return slug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => (w.length <= 3 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAfpRows(data, periodo) {
  const rows = Array.isArray(data) ? data : data.data || data.comisiones || data.results || [];
  const byAfp = {};
  for (const row of rows) {
    const name = String(row.Afp?.name || row.afp || row.nombre || row.name || "").toUpperCase();
    const meta = AFP_NAME_MAP[name];
    if (!meta) continue;
    if (row.Period) {
      const rp = `${row.Period.year}-${pad(row.Period.month)}`;
      if (periodo && rp !== periodo) continue;
    } else if (row.periodo && periodo && String(row.periodo).slice(0, 7) !== periodo) {
      continue;
    }
    const aporte = Number(row.aporte_obligatorio ?? row.aporte ?? 10);
    const comision = Number(
      row.comision_flujo_variable ?? row.comision_flujo ?? row.comision ?? 0
    );
    const prima = Number(row.prima_seguros ?? row.prima_de_seguro ?? row.prima ?? 0);
    const tasa = (aporte + comision + prima) / 100;
    if (!(tasa > 0.05 && tasa < 0.25)) continue;
    byAfp[meta.id] = {
      id: meta.id,
      nombre: meta.nombre,
      tasa: Math.round(tasa * 10000) / 10000,
    };
  }
  return Object.values(byAfp);
}

async function fetchAfpRates(previousPension) {
  // Override opcional: AFP_JSON_URL apuntando a un JSON propio/mirror
  if (process.env.AFP_JSON_URL) {
    try {
      const text = await fetchText(process.env.AFP_JSON_URL);
      const data = JSON.parse(text);
      const afps = parseAfpRows(data, null);
      if (afps.length >= 3) {
        const onp = (previousPension || []).find((s) => s.id === "onp") || {
          id: "onp",
          nombre: "ONP",
          tasa: 0.13,
        };
        console.log(`[ok] AFP vía AFP_JSON_URL (${afps.length})`);
        return { sistemas: [onp, ...afps], periodo: data.periodo || null };
      }
    } catch (err) {
      console.warn("[warn] AFP_JSON_URL:", err.message || err);
    }
  }

  const periods = periodKeys();
  const endpoints = [];
  for (const periodo of periods) {
    const [y, m] = periodo.split("-");
    endpoints.push(
      { periodo, url: `https://afp.cjjc.pe/api/comisiones/?year=${y}&month=${Number(m)}` },
      { periodo, url: `https://afp.cjjc.pe/api/comisiones/${periodo}` },
      { periodo, url: `https://afp.cjjc.pe/api/comisiones/${y}/${Number(m)}` }
    );
  }

  for (const ep of endpoints) {
    try {
      const text = await fetchText(ep.url);
      if (text.trim().startsWith("<")) continue;
      const data = JSON.parse(text);
      const afps = parseAfpRows(data, ep.periodo);
      if (afps.length >= 3) {
        const onp = (previousPension || []).find((s) => s.id === "onp") || {
          id: "onp",
          nombre: "ONP",
          tasa: 0.13,
        };
        console.log(`[ok] AFP periodo ${ep.periodo}: ${afps.map((a) => a.id).join(", ")}`);
        return { sistemas: [onp, ...afps], periodo: ep.periodo };
      }
    } catch (err) {
      console.warn(`[warn] AFP ${ep.periodo}:`, err.message || err);
    }
  }

  console.warn("[warn] AFP: se conservan tasas del seed/previas (API abierta no disponible)");
  return { sistemas: previousPension, periodo: null };
}

function parseGobPeNewsHtml(html, source) {
  const items = [];
  const re =
    /href="(\/institucion\/[a-z0-9-]+\/noticias\/(\d+)-([a-z0-9-]+))"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const pathUrl = m[1];
    const id = m[2];
    const slug = m[3];
    let title = String(m[4] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 12) title = slugToTitle(slug);
    if (title.length < 12) continue;
    items.push({
      title,
      url: "https://www.gob.pe" + pathUrl,
      source,
      publishedAt: "",
      summary: "",
      _id: id,
    });
  }

  // Fallback: solo paths únicos
  if (!items.length) {
    const pathRe = /\/institucion\/[a-z0-9-]+\/noticias\/(\d+)-([a-z0-9-]+)/gi;
    const seen = new Set();
    while ((m = pathRe.exec(html))) {
      const full = m[0];
      if (seen.has(full)) continue;
      seen.add(full);
      items.push({
        title: slugToTitle(m[2]),
        url: "https://www.gob.pe" + full,
        source,
        publishedAt: "",
        summary: "",
        _id: m[1],
      });
    }
  }

  // Deduplicar por id
  const byId = new Map();
  for (const it of items) {
    if (!byId.has(it._id)) byId.set(it._id, it);
  }
  return Array.from(byId.values()).map(({ _id, ...rest }) => rest);
}

async function fetchNews(previousItems) {
  const all = [];
  for (const page of NEWS_PAGES) {
    try {
      const html = await fetchText(page.url);
      const parsed = parseGobPeNewsHtml(html, page.source).slice(0, 10);
      console.log(`[ok] noticias ${page.source}: ${parsed.length}`);
      all.push(...parsed);
    } catch (err) {
      console.warn(`[warn] noticias ${page.source}:`, err.message || err);
    }
  }
  const seen = new Set();
  const merged = [...all, ...(previousItems || [])].filter((it) => {
    const key = it.url || it.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Priorizar ítems recién scrapeados (sin fecha) al inicio; luego por publishedAt
  merged.sort((a, b) => {
    if (!!a.publishedAt !== !!b.publishedAt) return a.publishedAt ? 1 : -1;
    return String(b.publishedAt).localeCompare(String(a.publishedAt));
  });
  return merged.slice(0, 30);
}

function buildCalendario(year) {
  const events = [];
  for (const y of [year, year + 1]) {
    events.push(
      { id: `cts-may-${y}`, tipo: "cts", label: "Depósito CTS (mayo)", date: `${y}-05-15` },
      { id: `grat-jul-${y}`, tipo: "grat", label: "Gratificación de julio", date: `${y}-07-15` },
      { id: `cts-nov-${y}`, tipo: "cts", label: "Depósito CTS (noviembre)", date: `${y}-11-15` },
      { id: `grat-dic-${y}`, tipo: "grat", label: "Gratificación de diciembre", date: `${y}-12-15` }
    );
  }
  return events;
}

async function main() {
  const now = new Date().toISOString();
  const seed = readJson(SEED, null);
  if (!seed) {
    console.error("Falta data/seed/normativa.base.json");
    process.exit(1);
  }
  const prevNorm = readJson(path.join(DATA, "normativa.json"), seed);
  const prevNews = readJson(path.join(DATA, "noticias.json"), { items: [] });

  const afp = await fetchAfpRates(prevNorm.sistemasPension || seed.sistemasPension);
  const sistemas = afp.sistemas && afp.sistemas.length ? afp.sistemas : seed.sistemasPension;

  const normativa = {
    ...seed,
    sistemasPension: sistemas,
    afpPeriodo: afp.periodo || prevNorm.afpPeriodo || null,
    tramosRenta: seed.tramosRenta,
    updatedAt: now,
    sources: seed.sources,
  };

  const newsItems = await fetchNews(prevNews.items || []);
  const noticias = {
    updatedAt: now,
    items: newsItems.length ? newsItems : prevNews.items || [],
  };

  const year = seed.year || new Date().getUTCFullYear();
  const calendario = { updatedAt: now, year, events: buildCalendario(year) };

  writeJson(path.join(DATA, "normativa.json"), normativa);
  writeJson(path.join(DATA, "noticias.json"), noticias);
  writeJson(path.join(DATA, "calendario.json"), calendario);

  console.log("[done] data/*.json actualizados", now);
  console.log(`       noticias=${noticias.items.length} afpPeriodo=${normativa.afpPeriodo || "seed"}`);
}

main().catch((err) => {
  console.error(err);
  try {
    const seed = readJson(SEED, null);
    const now = new Date().toISOString();
    if (seed) {
      writeJson(path.join(DATA, "normativa.json"), { ...seed, updatedAt: now, afpPeriodo: null });
      writeJson(path.join(DATA, "calendario.json"), {
        updatedAt: now,
        year: seed.year,
        events: buildCalendario(seed.year),
      });
    }
  } catch (_) {}
  process.exit(0);
});
