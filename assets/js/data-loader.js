/* =========================================================
   Mikelvra — carga open data (/data/*.json)
   Expone window.MikelvraData con ready Promise + caches.
   ========================================================= */
(function (global) {
  "use strict";

  var CACHE_KEY = "mikelvra_data_v1";
  var CACHE_MS = 6 * 60 * 60 * 1000;

  var state = {
    normativa: null,
    noticias: null,
    calendario: null,
    fromCache: false,
    error: null,
  };

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || Date.now() - parsed.ts > CACHE_MS) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCache(payload) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          ts: Date.now(),
          normativa: payload.normativa,
          noticias: payload.noticias,
          calendario: payload.calendario,
        })
      );
    } catch (_) {}
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
      return res.json();
    });
  }

  function applyToCalc(normativa) {
    if (normativa && global.Calc && typeof global.Calc.applyNormativa === "function") {
      global.Calc.applyNormativa(normativa);
    }
  }

  function fillDataStamp(normativa) {
    var el = document.getElementById("data-stamp");
    if (!el || !normativa || !normativa.updatedAt) return;
    var d = new Date(normativa.updatedAt);
    var label = Number.isNaN(d.getTime())
      ? normativa.updatedAt
      : d.toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "numeric" });
    el.textContent = "Datos al " + label + " · fuentes MEF / SBS / MTPE";
  }

  function fillPensionSelects() {
    if (!global.Calc || !Calc.SISTEMAS_PENSION_2026) return;
    document.querySelectorAll("select[data-open-pension], select#sistemaPension, select#pension").forEach(function (sel) {
      var current = sel.value;
      var opts = Calc.SISTEMAS_PENSION_2026.map(function (s) {
        var pct = (s.tasa * 100).toFixed(2).replace(/\.?0+$/, "");
        return (
          '<option value="' +
          s.id +
          '" data-tasa="' +
          s.tasa +
          '">' +
          s.nombre +
          " (" +
          pct +
          "%)</option>"
        );
      });
      sel.innerHTML = opts.join("");
      if (current && sel.querySelector('option[value="' + current + '"]')) sel.value = current;
    });
  }

  function fillUitHints() {
    if (!global.Calc) return;
    document.querySelectorAll("[data-uit-value]").forEach(function (el) {
      el.textContent = "S/ " + Number(Calc.UIT_2026).toLocaleString("es-PE");
    });
    document.querySelectorAll("[data-rmv-value]").forEach(function (el) {
      el.textContent = "S/ " + Number(Calc.RMV_2026).toLocaleString("es-PE");
    });
    document.querySelectorAll("[data-af-value]").forEach(function (el) {
      el.textContent = "S/ " + Number(Calc.ASIGNACION_FAMILIAR_2026).toLocaleString("es-PE");
    });
  }

  function renderProximosPagos(calendario, mountId) {
    var mount = document.getElementById(mountId || "proximos-pagos-open");
    if (!mount || !calendario || !calendario.events) return;
    var today = new Date();
    var todayISO = today.toISOString().slice(0, 10);
    var next = calendario.events
      .filter(function (e) {
        return e.date >= todayISO;
      })
      .slice(0, 4);
    if (!next.length) {
      mount.innerHTML = "<p class=\"story-sub\">Sin eventos próximos en el calendario.</p>";
      return;
    }
    mount.innerHTML =
      '<ul class="open-data-list">' +
      next
        .map(function (e) {
          return (
            "<li><strong>" +
            e.label +
            "</strong><span>" +
            e.date +
            "</span></li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function renderNoticias(noticias, mountId) {
    var mount = document.getElementById(mountId || "noticias-list");
    if (!mount || !noticias || !noticias.items) return;
    var items = noticias.items.slice(0, 12);
    mount.innerHTML = items
      .map(function (it) {
        return (
          '<article class="news-card">' +
          '<p class="news-meta">' +
          (it.source || "") +
          (it.publishedAt ? " · " + it.publishedAt : "") +
          "</p>" +
          '<a href="' +
          it.url +
          '" target="_blank" rel="noopener noreferrer"><strong>' +
          it.title +
          "</strong></a>" +
          (it.summary ? "<p>" + it.summary + "</p>" : "") +
          "</article>"
        );
      })
      .join("");
  }

  function hydrateUi() {
    fillDataStamp(state.normativa);
    fillPensionSelects();
    fillUitHints();
    renderProximosPagos(state.calendario);
    renderNoticias(state.noticias);
    document.dispatchEvent(new CustomEvent("mikelvra:data", { detail: state }));
    // Recalcular herramientas cableadas con live inputs
    var firstNum = document.querySelector('.calc-card input[type="number"]');
    if (firstNum) {
      firstNum.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  var ready = (function load() {
    var cached = readCache();
    if (cached && cached.normativa) {
      state.normativa = cached.normativa;
      state.noticias = cached.noticias;
      state.calendario = cached.calendario;
      state.fromCache = true;
      applyToCalc(state.normativa);
    }

    return Promise.all([
      fetchJson("/data/normativa.json"),
      fetchJson("/data/noticias.json").catch(function () {
        return cached && cached.noticias ? cached.noticias : { items: [] };
      }),
      fetchJson("/data/calendario.json").catch(function () {
        return cached && cached.calendario ? cached.calendario : { events: [] };
      }),
    ])
      .then(function (parts) {
        state.normativa = parts[0];
        state.noticias = parts[1];
        state.calendario = parts[2];
        state.fromCache = false;
        applyToCalc(state.normativa);
        writeCache(state);
        hydrateUi();
        return state;
      })
      .catch(function (err) {
        state.error = String(err && err.message ? err.message : err);
        console.warn("[MikelvraData]", state.error);
        if (state.normativa) {
          applyToCalc(state.normativa);
          hydrateUi();
        } else {
          hydrateUi();
        }
        return state;
      });
  })();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ready.then(hydrateUi);
    });
  } else {
    ready.then(hydrateUi);
  }

  global.MikelvraData = {
    ready: ready,
    getState: function () {
      return state;
    },
    renderNoticias: renderNoticias,
    renderProximosPagos: renderProximosPagos,
  };
})(window);
