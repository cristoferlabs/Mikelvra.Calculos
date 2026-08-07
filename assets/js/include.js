/* =========================================================
   Mikelvra — carga de navbar/footer compartidos + ad rails + open data
   ========================================================= */

(function () {
  function markActiveLink(root) {
    var current = window.location.pathname.replace(/\/$/, "") || "/index.html";
    if (current === "" || current === "/") current = "/index.html";
    var links = root.querySelectorAll("a.nav-link, a.mega-link");
    links.forEach(function (link) {
      var path = link.getAttribute("data-path");
      if (path === current) {
        link.classList.add("active");
        var parentItem = link.closest(".nav-item.has-mega");
        if (parentItem) parentItem.querySelector(".nav-trigger").classList.add("active");
      }
    });
  }

  function loadPartial(mountId, url, afterInject) {
    var mount = document.getElementById(mountId);
    if (!mount) return Promise.resolve();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("No se pudo cargar " + url);
        return res.text();
      })
      .then(function (html) {
        mount.innerHTML = html;
        if (afterInject) afterInject(mount);
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        resolve();
      };
      document.head.appendChild(s);
    });
  }

  function loadAdSenseClient() {
    var src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7737636856013405";
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }

  // Carga temprana del cliente AdSense (verificación / anuncios)
  loadAdSenseClient();

  function ensureAdRails() {
    // Slots manuales desactivados: usa Anuncios automáticos en AdSense cuando aprueben.
    // No insertar placeholders vacíos (perjudica la revisión).
    return;

    if (
      document.body.classList.contains("page-home") ||
      document.body.classList.contains("page-noticias") ||
      document.body.classList.contains("page-generator")
    ) {
      return;
    }

    var main = document.querySelector(".main-area");
    var content = main && main.querySelector(":scope > .content, :scope > main.content");
    if (!main || !content) {
      content = document.querySelector("main.content");
      main = content && content.parentElement;
    }
    if (!main || !content) return;
    if (main.querySelector(".ad-rail")) return;

    var wrapper = document.createElement("div");
    wrapper.className = "page-with-rails";

    var left = document.createElement("aside");
    left.className = "ad-rail ad-rail-left";
    left.setAttribute("aria-label", "Publicidad");
    left.innerHTML = '<div class="ad-slot rail-ad" aria-hidden="true">Espacio reservado<br/>160 × 600</div>';

    var right = document.createElement("aside");
    right.className = "ad-rail ad-rail-right";
    right.setAttribute("aria-label", "Publicidad");
    right.innerHTML = '<div class="ad-slot rail-ad" aria-hidden="true">Espacio reservado<br/>160 × 600</div>';

    content.parentNode.insertBefore(wrapper, content);
    wrapper.appendChild(left);
    wrapper.appendChild(content);
    wrapper.appendChild(right);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // ensureAdRails(); // reactivar tras aprobación AdSense

    var boot = Promise.resolve();
    if (!window.Calc) {
      boot = boot.then(function () {
        return loadScript("/assets/js/calculadoras.js");
      });
    }
    boot = boot.then(function () {
      return loadScript("/assets/js/data-loader.js");
    });

    boot.then(function () {
      return Promise.all([
        loadPartial("site-header", "/partials/navbar.html", function (mount) {
          ["bottomDock", "navDrawer", "navBackdrop"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el && el.parentElement !== document.body) {
              document.body.appendChild(el);
            }
          });
          markActiveLink(mount);
          if (window.Navbar) window.Navbar.init(mount);
        }),
        loadPartial("site-footer", "/partials/footer.html", function (mount) {
          var yearEl = mount.querySelector("#footer-year");
          if (yearEl) yearEl.textContent = new Date().getFullYear();
          if (window.MikelvraData && MikelvraData.ready) {
            MikelvraData.ready.then(function (state) {
              var stamp = mount.querySelector("#data-stamp");
              if (stamp && state && state.normativa && state.normativa.updatedAt) {
                var d = new Date(state.normativa.updatedAt);
                var label = Number.isNaN(d.getTime())
                  ? state.normativa.updatedAt
                  : d.toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "numeric" });
                stamp.textContent = "Datos al " + label + " · fuentes MEF / SBS / MTPE";
              }
            });
          }
        }),
      ]);
    });
  });
})();
