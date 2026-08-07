/* =========================================================
   Mikelvra — utilidades de interacción compartidas: debounce,
   formateo de soles, cálculo en vivo, validación, loading y
   exportar/compartir. Namespace global window.UI.
   ========================================================= */
(function (global) {
  "use strict";

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay);
    };
  }

  function formatSoles(n) {
    return "S/ " + (isFinite(n) ? n : 0).toFixed(2);
  }

  function formatFecha(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "—";
    var meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return date.getUTCDate() + " " + meses[date.getUTCMonth()] + " " + date.getUTCFullYear();
  }

  function clearFieldError(el) {
    if (!el) return;
    el.classList.remove("is-invalid");
    var group = el.closest(".form-group");
    if (!group) return;
    var msg = group.querySelector(".field-error");
    if (msg) msg.classList.remove("is-visible");
  }

  function showFieldError(el, message) {
    if (!el) return false;
    el.classList.add("is-invalid");
    el.classList.remove("is-valid");
    var group = el.closest(".form-group");
    if (!group) return false;
    var msg = group.querySelector(".field-error");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "field-error";
      group.appendChild(msg);
    }
    msg.textContent = message || "Revisa este campo.";
    msg.classList.add("is-visible");
    return false;
  }

  /**
   * rules: { required, min, max, message, type: 'number'|'text'|'date' }
   * returns true if valid
   */
  function validateField(el, rules) {
    rules = rules || {};
    if (!el) return false;
    clearFieldError(el);
    var raw = (el.value || "").trim();
    var type = rules.type || el.type || "text";
    var touched = el.dataset.uiTouched === "1";

    if (rules.required && raw === "") {
      // En la primera carga no pintamos error rojo; solo tras interacción.
      if (!touched) {
        el.classList.remove("is-valid");
        return false;
      }
      return showFieldError(el, rules.message || "Este campo es obligatorio.");
    }

    if (type === "number" || el.type === "number") {
      if (raw === "" && !rules.required) {
        el.classList.remove("is-valid");
        return true;
      }
      var n = parseFloat(raw);
      if (!isFinite(n)) {
        return showFieldError(el, rules.message || "Ingresa un número válido.");
      }
      if (rules.min != null && n < rules.min) {
        return showFieldError(el, rules.message || ("El valor mínimo es " + rules.min + "."));
      }
      if (rules.max != null && n > rules.max) {
        return showFieldError(el, rules.message || ("El valor máximo es " + rules.max + "."));
      }
      el.classList.add("is-valid");
      return true;
    }

    if (raw !== "") el.classList.add("is-valid");
    else el.classList.remove("is-valid");
    return true;
  }

  function setButtonState(btn, state) {
    if (!btn) return;
    state = state || {};
    if (!btn.dataset.labelOriginal) {
      btn.dataset.labelOriginal = btn.textContent.trim();
    }
    if (state.loading) {
      btn.classList.add("is-loading");
      btn.setAttribute("aria-busy", "true");
      if (state.label) btn.textContent = state.label;
    } else {
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
      if (!state.keepLabel) btn.textContent = btn.dataset.labelOriginal;
    }
    if (state.disabled != null) {
      btn.disabled = !!state.disabled;
      btn.classList.toggle("is-disabled", !!state.disabled);
    }
  }

  function flashResult(box) {
    if (!box) return;
    box.classList.remove("is-flash");
    void box.offsetWidth;
    box.classList.add("is-flash");
    setTimeout(function () {
      box.classList.remove("is-flash");
    }, 450);
  }

  function syncExportButtons(resultBoxId) {
    var box = document.getElementById(resultBoxId);
    if (!box) return;
    var ready = box.classList.contains("visible");
    var selector = '[data-action="pdf"][data-target="' + resultBoxId + '"], #' + resultBoxId + ' [data-action="pdf"],' +
      '[data-action="compartir"][data-target="' + resultBoxId + '"], #' + resultBoxId + ' [data-action="compartir"]';
    document.querySelectorAll(selector).forEach(function (btn) {
      btn.disabled = !ready;
      btn.classList.toggle("is-disabled", !ready);
    });
  }

  function setResultVisible(resultBoxId, visible) {
    var box = document.getElementById(resultBoxId);
    if (!box) return;
    box.classList.toggle("visible", !!visible);
    if (visible) flashResult(box);
    syncExportButtons(resultBoxId);
  }

  // Ata "recalcular" a todos los inputs de un contenedor
  function wireLiveInputs(container, handler, opts) {
    opts = opts || {};
    var delay = opts.delay != null ? opts.delay : 280;
    var debounced = debounce(handler, delay);
    var onInput = function (e) {
      e.target.dataset.uiTouched = "1";
      clearFieldError(e.target);
      debounced();
    };
    container.querySelectorAll('input[type="number"], input[type="text"], input[type="date"]').forEach(function (el) {
      el.addEventListener("input", onInput);
    });
    container.querySelectorAll("select, input[type=\"checkbox\"], input[type=\"radio\"]").forEach(function (el) {
      el.addEventListener("change", handler);
    });
  }

  function wireResultExport(resultBoxId) {
    var box = document.getElementById(resultBoxId);
    if (!box) return;

    var selectorFor = function (action) {
      return '#' + resultBoxId + ' [data-action="' + action + '"], [data-action="' + action + '"][data-target="' + resultBoxId + '"]';
    };

    document.querySelectorAll(selectorFor("pdf")).forEach(function (btnPdf) {
      btnPdf.addEventListener("click", function () {
        if (btnPdf.disabled || !box.classList.contains("visible")) return;
        setButtonState(btnPdf, { loading: true, label: "Preparando…" });
        var preview = box.querySelector(".doc-preview") || box;
        var printed = false;
        try {
          if (global.Docs && typeof Docs.printPreview === "function") {
            printed = !!Docs.printPreview(preview);
          } else if (typeof printDoc === "function") {
            printed = !!printDoc(resultBoxId);
          }
        } catch (e) {
          printed = false;
        }
        if (!printed) {
          // Último recurso: no usar print de página completa (sale vacío)
          alert("No se pudo abrir la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.");
        }
        setTimeout(function () {
          setButtonState(btnPdf, { loading: false });
        }, 400);
      });
    });

    document.querySelectorAll(selectorFor("compartir")).forEach(function (btnShare) {
      btnShare.addEventListener("click", function () {
        if (btnShare.disabled || !box.classList.contains("visible")) return;
        var texto = box.innerText.trim();
        var payload = { title: document.title, text: texto, url: window.location.href };
        setButtonState(btnShare, { loading: true, label: "Compartiendo…" });
        var done = function () {
          setButtonState(btnShare, { loading: false });
        };
        if (navigator.share) {
          navigator.share(payload).catch(function () {}).finally(done);
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(texto + "\n" + window.location.href).then(function () {
            setButtonState(btnShare, { loading: false, keepLabel: true });
            btnShare.textContent = "¡Copiado!";
            setTimeout(function () {
              btnShare.textContent = btnShare.dataset.labelOriginal;
            }, 2000);
          }).catch(done);
        } else {
          done();
        }
      });
    });

    syncExportButtons(resultBoxId);
    if (typeof MutationObserver !== "undefined") {
      var obs = new MutationObserver(function () {
        syncExportButtons(resultBoxId);
      });
      obs.observe(box, { attributes: true, attributeFilter: ["class"] });
    }
  }

  var STORAGE_SUELDO = "mikelvra_ultimo_sueldo";

  function saveSueldo(n) {
    try {
      if (n > 0) localStorage.setItem(STORAGE_SUELDO, String(n));
    } catch (e) { /* private mode */ }
  }

  function loadSueldo() {
    try {
      var v = parseFloat(localStorage.getItem(STORAGE_SUELDO));
      return v > 0 ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  function prefillsueldo(inputId, opts) {
    opts = opts || {};
    var el = document.getElementById(inputId || "sueldo");
    if (!el) return;
    var params = new URLSearchParams(window.location.search);
    var fromQuery = parseFloat(params.get("sueldo"));
    if (fromQuery > 0) {
      el.value = fromQuery;
    } else if (opts.useStorage !== false) {
      var saved = loadSueldo();
      if (saved > 0 && !el.value) el.value = saved;
    }
    var afEl = document.getElementById(opts.asignacionId || "tieneAsignacion");
    if (afEl && params.get("af") === "1") afEl.checked = true;
  }

  function wireExampleChips(container, inputId, onPick) {
    if (!container) return;
    container.querySelectorAll("[data-ejemplo-sueldo]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var n = parseFloat(btn.getAttribute("data-ejemplo-sueldo")) || 0;
        var el = document.getElementById(inputId || "sueldo");
        if (el) {
          el.value = n;
          el.dataset.uiTouched = "1";
          clearFieldError(el);
          el.classList.add("is-valid");
          saveSueldo(n);
        }
        if (typeof onPick === "function") onPick(n);
      });
    });
  }

  function linkConSueldo(path, sueldo, extra) {
    var q = "sueldo=" + encodeURIComponent(sueldo > 0 ? sueldo : "");
    if (extra) q += "&" + extra;
    return path + (path.indexOf("?") >= 0 ? "&" : "?") + q;
  }

  function printDoc(resultBoxId) {
    var box = document.getElementById(resultBoxId);
    if (!box) return false;
    var preview = box.querySelector(".doc-preview") || box;
    if (global.Docs && typeof Docs.printPreview === "function") {
      return !!Docs.printPreview(preview);
    }
    return false;
  }

  global.UI = {
    debounce: debounce,
    formatSoles: formatSoles,
    formatFecha: formatFecha,
    wireLiveInputs: wireLiveInputs,
    wireResultExport: wireResultExport,
    printDoc: printDoc,
    saveSueldo: saveSueldo,
    loadSueldo: loadSueldo,
    prefillsueldo: prefillsueldo,
    wireExampleChips: wireExampleChips,
    linkConSueldo: linkConSueldo,
    validateField: validateField,
    clearFieldError: clearFieldError,
    setButtonState: setButtonState,
    flashResult: flashResult,
    syncExportButtons: syncExportButtons,
    setResultVisible: setResultVisible,
  };
})(window);
