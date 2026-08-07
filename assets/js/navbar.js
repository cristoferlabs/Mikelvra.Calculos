/* =========================================================
   Mikelvra — navbar flotante + dock móvil + drawer
   ========================================================= */
(function () {
  "use strict";

  function initMegaMenus(scope) {
    var items = scope.querySelectorAll(".nav-item.has-mega");

    function closeItem(item) {
      item.classList.remove("open");
      var t = item.querySelector(".nav-trigger");
      if (t) t.setAttribute("aria-expanded", "false");
    }

    function closeAll(except) {
      items.forEach(function (i) {
        if (i !== except) closeItem(i);
      });
    }

    function openItem(item) {
      closeAll(item);
      item.classList.add("open");
      item.querySelector(".nav-trigger").setAttribute("aria-expanded", "true");
    }

    items.forEach(function (item) {
      var trigger = item.querySelector(".nav-trigger");
      trigger.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 980px)").matches) return;
        if (item.classList.contains("open")) closeItem(item);
        else openItem(item);
      });
      item.addEventListener("mouseenter", function () {
        if (window.matchMedia("(min-width: 981px)").matches) openItem(item);
      });
      item.addEventListener("mouseleave", function () {
        if (window.matchMedia("(min-width: 981px)").matches) closeItem(item);
      });
      item.addEventListener("focusout", function (e) {
        if (!item.contains(e.relatedTarget)) closeItem(item);
      });
    });

    document.addEventListener("click", function (e) {
      items.forEach(function (item) {
        if (!item.contains(e.target)) closeItem(item);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        items.forEach(function (item) {
          if (item.classList.contains("open")) {
            closeItem(item);
            item.querySelector(".nav-trigger").focus();
          }
        });
        closeDrawer();
      }
    });
  }

  function buildDrawerLinks(scope) {
    var body = document.getElementById("navDrawerBody");
    if (!body || !scope) return;
    var html = "";
    scope.querySelectorAll(".nav-item.has-mega").forEach(function (item) {
      var title = item.querySelector(".nav-trigger");
      var label = title ? title.childNodes[0].textContent.trim() : "Menú";
      html += '<p class="drawer-section">' + label + "</p>";
      item.querySelectorAll(".mega-link").forEach(function (a) {
        var strong = a.querySelector("strong");
        var sub = a.querySelector(".mega-text span, span:last-child");
        html +=
          '<a class="drawer-link" href="' +
          a.getAttribute("href") +
          '"><strong>' +
          (strong ? strong.textContent : a.textContent) +
          "</strong><span>" +
          (sub && sub !== strong ? sub.textContent : "") +
          "</span></a>";
      });
    });
    html +=
      '<p class="drawer-section">Destacado</p>' +
      '<a class="drawer-link" href="/herramientas/cuanto-me-deben.html"><strong>Mi panorama</strong><span>Todo tu año laboral en una vista</span></a>' +
      '<a class="drawer-link" href="/noticias.html"><strong>Novedades</strong><span>MEF, MTPE, SUNAT, SBS</span></a>' +
      '<p class="drawer-section">Legal</p>' +
      '<a class="drawer-link" href="/legal/acerca-de.html"><strong>Acerca de</strong><span></span></a>' +
      '<a class="drawer-link" href="/legal/contacto.html"><strong>Contacto</strong><span></span></a>';
    body.innerHTML = html;
  }

  function openDrawer() {
    var drawer = document.getElementById("navDrawer");
    var backdrop = document.getElementById("navBackdrop");
    if (!drawer) return;
    drawer.hidden = false;
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.classList.add("visible");
    }
    document.body.classList.add("drawer-open");
    var toggle = document.getElementById("menuToggle");
    if (toggle) {
      toggle.classList.add("active");
      toggle.setAttribute("aria-expanded", "true");
    }
  }

  function closeDrawer() {
    var drawer = document.getElementById("navDrawer");
    var backdrop = document.getElementById("navBackdrop");
    if (drawer) drawer.hidden = true;
    if (backdrop) {
      backdrop.classList.remove("visible");
      backdrop.hidden = true;
    }
    document.body.classList.remove("drawer-open");
    var toggle = document.getElementById("menuToggle");
    if (toggle) {
      toggle.classList.remove("active");
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function initMobileChrome(scope) {
    var toggle = document.getElementById("menuToggle");
    var closeBtn = document.getElementById("drawerClose");
    var backdrop = document.getElementById("navBackdrop");
    var explore = document.getElementById("dockExplore");

    buildDrawerLinks(scope);

    if (toggle) toggle.addEventListener("click", function () {
      var drawer = document.getElementById("navDrawer");
      if (drawer && !drawer.hidden) closeDrawer();
      else openDrawer();
    });
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    if (explore) explore.addEventListener("click", openDrawer);

    var dock = document.getElementById("bottomDock");
    if (dock) {
      var current = window.location.pathname.replace(/\/$/, "") || "/index.html";
      if (current === "" || current === "/") current = "/index.html";
      dock.querySelectorAll("a.dock-item").forEach(function (a) {
        if (a.getAttribute("data-path") === current) a.classList.add("active");
      });
    }

    document.body.classList.add("has-bottom-dock");
  }

  window.Navbar = {
    init: function (root) {
      initMegaMenus(root);
      initMobileChrome(root);
    },
  };
})();
