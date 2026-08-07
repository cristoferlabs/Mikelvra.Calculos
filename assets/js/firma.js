/* =========================================================
   Mikelvra — firma manuscrita (móvil/desktop) sin marco en el doc
   Namespace: window.Firma
   ========================================================= */
(function (global) {
  "use strict";

  var STORAGE_KEY = "mikelvra_firma_v1";

  function createPad(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var drawing = false;
    var last = null;
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    var stroke = opts.color || "#0a0a0a";
    var lineWidth = opts.lineWidth || 2.2;
    var listeners = [];

    function notify() {
      listeners.forEach(function (fn) {
        try {
          fn();
        } catch (_) {}
      });
    }

    function resize() {
      var cssW = canvas.clientWidth || 320;
      var cssH = canvas.clientHeight || 160;
      canvas.width = Math.floor(cssW * ratio);
      canvas.height = Math.floor(cssH * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
    }

    function pos(e) {
      var rect = canvas.getBoundingClientRect();
      var t = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }

    function start(e) {
      e.preventDefault();
      drawing = true;
      last = pos(e);
    }

    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    }

    function end(e) {
      if (!drawing) return;
      e.preventDefault();
      drawing = false;
      last = null;
      notify();
    }

    resize();
    window.addEventListener("resize", resize);

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end, { passive: false });

    function isEmpty() {
      var w = canvas.width;
      var h = canvas.height;
      if (!w || !h) return true;
      var data = ctx.getImageData(0, 0, w, h).data;
      for (var i = 3; i < data.length; i += 4) {
        if (data[i] > 8) return false;
      }
      return true;
    }

    function clear() {
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      notify();
    }

    /** PNG transparente recortado al trazo — sin fondo ni marco */
    function getDataURL() {
      if (isEmpty()) return "";
      var w = canvas.width;
      var h = canvas.height;
      var img = ctx.getImageData(0, 0, w, h);
      var data = img.data;
      var minX = w;
      var minY = h;
      var maxX = 0;
      var maxY = 0;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var a = data[(y * w + x) * 4 + 3];
          if (a > 8) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX) return "";
      var pad = Math.round(6 * ratio);
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(w - 1, maxX + pad);
      maxY = Math.min(h - 1, maxY + pad);
      var cw = maxX - minX + 1;
      var ch = maxY - minY + 1;
      var out = document.createElement("canvas");
      out.width = cw;
      out.height = ch;
      var octx = out.getContext("2d");
      octx.clearRect(0, 0, cw, ch);
      octx.putImageData(ctx.getImageData(minX, minY, cw, ch), 0, 0);
      var url = out.toDataURL("image/png");
      try {
        localStorage.setItem(STORAGE_KEY, url);
      } catch (_) {}
      return url;
    }

    function loadSaved() {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        var img = new Image();
        img.onload = function () {
          var cssW = canvas.clientWidth || 320;
          var cssH = canvas.clientHeight || 160;
          var scale = Math.min(cssW / img.width, cssH / img.height, 1);
          var dw = img.width * scale;
          var dh = img.height * scale;
          ctx.clearRect(0, 0, cssW, cssH);
          ctx.drawImage(img, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
          notify();
        };
        img.src = saved;
      } catch (_) {}
    }

    loadSaved();

    return {
      clear: clear,
      isEmpty: isEmpty,
      getDataURL: getDataURL,
      onChange: function (fn) {
        listeners.push(fn);
      },
      resize: resize,
    };
  }

  function mountWizard(root, opts) {
    opts = opts || {};
    var step = 1;
    var tabs = root.querySelectorAll("[data-wizard-step]");
    var panels = root.querySelectorAll("[data-wizard-panel]");
    var btnNext = root.querySelector("[data-wizard-next]");
    var btnPrev = root.querySelector("[data-wizard-prev]");
    var canvas = root.querySelector("#sigCanvas");
    var btnClear = root.querySelector("[data-firma-clear]");
    var pad = canvas ? createPad(canvas) : null;

    function show(n) {
      step = n;
      tabs.forEach(function (t) {
        t.classList.toggle("is-active", Number(t.getAttribute("data-wizard-step")) === n);
      });
      panels.forEach(function (p) {
        var match = Number(p.getAttribute("data-wizard-panel")) === n;
        p.hidden = !match;
        p.classList.toggle("is-active", match);
      });
      if (btnPrev) btnPrev.hidden = n === 1;
      if (btnNext) {
        btnNext.hidden = n === 2;
        btnNext.textContent = opts.nextLabel || "Continuar · Firmar";
      }
      if (n === 2 && pad) {
        setTimeout(function () {
          pad.resize();
        }, 50);
      }
      if (typeof opts.onStep === "function") opts.onStep(n, pad);
    }

    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        show(Number(t.getAttribute("data-wizard-step")));
      });
    });
    if (btnNext) {
      btnNext.addEventListener("click", function () {
        if (typeof opts.beforeNext === "function" && opts.beforeNext() === false) return;
        show(2);
      });
    }
    if (btnPrev) {
      btnPrev.addEventListener("click", function () {
        show(1);
      });
    }
    if (btnClear && pad) {
      btnClear.addEventListener("click", function () {
        pad.clear();
        if (typeof opts.onFirma === "function") opts.onFirma("");
      });
    }
    if (pad && typeof opts.onFirma === "function") {
      pad.onChange(function () {
        opts.onFirma(pad.isEmpty() ? "" : pad.getDataURL());
      });
    }

    show(1);
    return {
      pad: pad,
      go: show,
      getFirma: function () {
        return pad && !pad.isEmpty() ? pad.getDataURL() : "";
      },
    };
  }

  global.Firma = {
    createPad: createPad,
    mountWizard: mountWizard,
  };
})(window);
