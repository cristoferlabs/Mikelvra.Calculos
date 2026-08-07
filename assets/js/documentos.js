/* =========================================================
   Mikelvra — generadores de documentos (HTML imprimible).
   Namespace global window.Docs.
   ========================================================= */
(function (global) {
  "use strict";

  var UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  var ESPECIALES = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
  var DECENAS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  var CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function decenasALetras(n) {
    if (n < 10) return UNIDADES[n];
    if (n < 20) return ESPECIALES[n - 10];
    if (n < 30) return n === 20 ? "veinte" : "veinti" + UNIDADES[n - 20];
    var d = Math.floor(n / 10);
    var u = n % 10;
    return DECENAS[d] + (u ? " y " + UNIDADES[u] : "");
  }

  function centenasALetras(n) {
    if (n === 100) return "cien";
    if (n < 100) return decenasALetras(n);
    var c = Math.floor(n / 100);
    var r = n % 100;
    return CENTENAS[c] + (r ? " " + decenasALetras(r) : "");
  }

  function grupoALetras(n) {
    if (n === 0) return "";
    if (n === 1) return "un";
    return centenasALetras(n);
  }

  function numeroALetras(n) {
    n = Math.floor(Math.abs(n) || 0);
    if (n === 0) return "cero";
    if (n === 1) return "uno";
    var millones = Math.floor(n / 1000000);
    var miles = Math.floor((n % 1000000) / 1000);
    var resto = n % 1000;
    var parts = [];
    if (millones) {
      parts.push(millones === 1 ? "un millón" : grupoALetras(millones) + " millones");
    }
    if (miles) {
      parts.push(miles === 1 ? "mil" : grupoALetras(miles) + " mil");
    }
    if (resto) parts.push(centenasALetras(resto));
    return parts.join(" ");
  }

  function solesEnLetras(monto) {
    var entero = Math.floor(Math.abs(monto) || 0);
    var centavos = Math.round((Math.abs(monto) - entero) * 100);
    if (centavos === 100) {
      entero += 1;
      centavos = 0;
    }
    var letras = numeroALetras(entero);
    return (
      letras.charAt(0).toUpperCase() +
      letras.slice(1) +
      " con " +
      String(centavos).padStart(2, "0") +
      "/100 soles"
    );
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatFechaLarga(iso) {
    if (!iso) return "____";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    var meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    return d.getDate() + " de " + meses[d.getMonth()] + " de " + d.getFullYear();
  }

  function fmt(n) {
    return global.UI ? UI.formatSoles(n) : "S/ " + Number(n || 0).toFixed(2);
  }

  /**
   * Firma limpia al estilo MVP:
   * PNG transparente encima de la línea (sin caja/borde), luego nombre + DNI.
   */
  function bloqueFirma(d) {
    d = d || {};
    var nombre = esc(d.nombre || "");
    var dni = esc(d.dni || "");
    var caption = d.caption != null ? d.caption : "";
    var centered = d.align === "center";
    var align = centered ? "text-align:center" : "";
    var stamp =
      '<div class="doc-firma-stamp' +
      (d.firmaDataUrl ? " has-img" : "") +
      (centered ? " is-centered" : "") +
      '">' +
      (d.firmaDataUrl
        ? '<img class="doc-firma-img" src="' + d.firmaDataUrl + '" alt="" />'
        : "") +
      '<span class="doc-firma-line" aria-hidden="true"></span>' +
      "</div>";
    return (
      '<div class="doc-firma-block"' +
      (align ? ' style="' + align + '"' : "") +
      ">" +
      stamp +
      (nombre ? "<div><strong>" + nombre + "</strong></div>" : "") +
      (dni ? "<div>DNI: " + dni + "</div>" : "") +
      (caption ? '<div class="doc-firma-caption">' + esc(caption) + "</div>" : "") +
      "</div>"
    );
  }

  function cartaRenuncia(d) {
    var tipo = d.tipo || "simple";
    var preaviso = "";
    if (tipo === "exoneracion") {
      preaviso =
        "Solicito se me exonere del preaviso de treinta (30) días previsto en el artículo 18° del Texto Único Ordenado del Decreto Legislativo N.° 728 (D.S. N.° 003-97-TR).";
    } else if (tipo === "irrevocable") {
      preaviso = "Esta renuncia tiene carácter irrevocable.";
    } else {
      preaviso =
        "Cumplo con el preaviso de treinta (30) días de ley conforme al artículo 18° del Texto Único Ordenado del Decreto Legislativo N.° 728 (D.S. N.° 003-97-TR), por lo que mi último día laboral será el " +
        formatFechaLarga(d.fechaCese) +
        ".";
    }
    return (
      '<div class="doc-body doc-carta">' +
      '<p class="doc-fecha-der">' +
      esc(d.ciudad || "Lima") +
      ", " +
      formatFechaLarga(d.fechaCarta) +
      "</p>" +
      "<p><strong>Señor(a)</strong><br/>" +
      esc(d.destinatario || "Jefe(a) de Recursos Humanos") +
      '<br/><span class="doc-rule"></span><br/>Presente.-</p>' +
      "<p><strong>Asunto: Carta de renuncia voluntaria</strong></p>" +
      "<p>De mi mayor consideración:</p>" +
      "<p>Yo, <strong>" +
      esc(d.nombre) +
      "</strong>, identificado(a) con DNI N.° <strong>" +
      esc(d.dni) +
      "</strong>" +
      (d.direccion ? ", con domicilio en " + esc(d.direccion) : "") +
      ", quien labora en el cargo de <strong>" +
      esc(d.cargo) +
      "</strong>, presento mi renuncia voluntaria al puesto que desempeño en su representada.</p>" +
      "<p>" +
      preaviso +
      "</p>" +
      "<p>Solicito se sirvan liquidar mis beneficios sociales (CTS, vacaciones y demás conceptos de ley) conforme corresponda.</p>" +
      "<p>Agradezco las oportunidades brindadas durante mi permanencia en la empresa.</p>" +
      "<p>Sin otro particular, quedo de usted.<br/>Atentamente,</p>" +
      bloqueFirma({ firmaDataUrl: d.firmaDataUrl, nombre: d.nombre, dni: d.dni }) +
      "</div>"
    );
  }

  function liquidacionBeneficios(d, calc) {
    return (
      '<div class="doc-body">' +
      '<h2 class="doc-title">Liquidación de beneficios sociales</h2>' +
      '<p class="doc-sub">Documento referencial — ' +
      formatFechaLarga(d.fechaDoc) +
      "</p>" +
      "<p><strong>Trabajador:</strong> " +
      esc(d.nombre) +
      " &nbsp;|&nbsp; <strong>DNI:</strong> " +
      esc(d.dni) +
      "<br/><strong>Empresa:</strong> " +
      esc(d.empresa) +
      "<br/><strong>Ingreso:</strong> " +
      formatFechaLarga(d.fechaIngreso) +
      " &nbsp;|&nbsp; <strong>Cese:</strong> " +
      formatFechaLarga(d.fechaCese) +
      "<br/><strong>Sueldo básico:</strong> " +
      fmt(d.sueldo) +
      "</p>" +
      '<table class="doc-table">' +
      "<tr><td>Gratificación trunca + bono</td><td>" +
      fmt(calc.gratificacion.total) +
      "</td></tr>" +
      "<tr><td>CTS trunca</td><td>" +
      fmt(calc.cts.total) +
      "</td></tr>" +
      "<tr><td>Vacaciones truncas</td><td>" +
      fmt(calc.vacaciones.total) +
      "</td></tr>" +
      '<tr class="doc-total"><td>TOTAL</td><td>' +
      fmt(calc.total) +
      "</td></tr>" +
      "</table>" +
      bloqueFirma({
        firmaDataUrl: d.firmaDataUrl,
        nombre: d.nombre,
        dni: d.dni,
        caption: "Conformidad del trabajador",
      }) +
      '<p class="doc-footnote">Documento orientativo. No sustituye la liquidación oficial del empleador.</p>' +
      "</div>"
    );
  }

  function boletaPago(d, neto) {
    var af = d.tieneAsignacion ? (global.Calc ? Calc.ASIGNACION_FAMILIAR_2026 : 113) : 0;
    var sistema = d.sistemaNombre || "ONP";
    var tasaPct = d.tasaPct != null ? d.tasaPct : 13;
    var essalud = (Number(d.sueldo || 0) + af) * (d.essaludPct != null ? d.essaludPct : 0.09);
    return (
      '<div class="doc-body doc-boleta">' +
      '<p class="doc-empresa">' +
      esc(d.empresa || "Razón social") +
      "</p>" +
      '<h2 class="doc-title">BOLETA DE PAGO – ' +
      esc((d.periodo || "").toUpperCase() || "—") +
      "</h2>" +
      '<p class="doc-section">DATOS DEL TRABAJADOR</p>' +
      '<table class="doc-kv">' +
      "<tr><td>Nombre</td><td>" +
      esc(d.nombre) +
      "</td></tr>" +
      "<tr><td>DNI</td><td>" +
      esc(d.dni) +
      "</td></tr>" +
      "<tr><td>Cargo</td><td>" +
      esc(d.cargo) +
      "</td></tr>" +
      "<tr><td>Sistema</td><td>" +
      esc(sistema) +
      "</td></tr>" +
      "</table>" +
      '<p class="doc-section">INGRESOS</p>' +
      '<table class="doc-table">' +
      '<tr class="doc-th"><td></td><td>S/</td></tr>' +
      "<tr><td>Remuneración básica</td><td>" +
      Number(d.sueldo || 0).toFixed(2) +
      "</td></tr>" +
      (af
        ? "<tr><td>Asignación familiar</td><td>" + Number(af).toFixed(2) + "</td></tr>"
        : "") +
      '<tr class="doc-strong"><td>Total bruto</td><td>' +
      Number(neto.sueldoBruto || 0).toFixed(2) +
      "</td></tr>" +
      "</table>" +
      '<p class="doc-section">DESCUENTOS</p>' +
      '<table class="doc-table">' +
      '<tr class="doc-th"><td></td><td>S/</td></tr>' +
      "<tr><td>" +
      esc(sistema) +
      " (" +
      Number(tasaPct).toFixed(2) +
      "%)</td><td>" +
      Number(neto.descuentoPension || 0).toFixed(2) +
      "</td></tr>" +
      "<tr><td>Renta 5ta</td><td>" +
      Number(neto.retencionRenta || 0).toFixed(2) +
      "</td></tr>" +
      '<tr class="doc-strong"><td>Total descuentos</td><td>' +
      Number((neto.descuentoPension || 0) + (neto.retencionRenta || 0)).toFixed(2) +
      "</td></tr>" +
      "</table>" +
      '<div class="doc-neto"><span>NETO A PAGAR</span><span>S/ ' +
      Number(neto.neto || 0).toFixed(2) +
      "</span></div>" +
      '<p class="doc-footnote">EsSalud (9%, empleador): S/ ' +
      Number(essalud).toFixed(2) +
      "</p>" +
      bloqueFirma({
        firmaDataUrl: d.firmaDataUrl,
        nombre: d.nombre,
        dni: d.dni,
        caption: "Recibí conforme",
      }) +
      "</div>"
    );
  }

  function certificadoTrabajo(d) {
    return (
      '<div class="doc-body">' +
      '<h2 class="doc-title">Certificado de trabajo</h2>' +
      "<p>" +
      esc(d.ciudad || "Lima") +
      ", " +
      formatFechaLarga(d.fechaDoc) +
      "</p>" +
      "<p>Por medio del presente, <strong>" +
      esc(d.empresa) +
      "</strong> certifica que el(la) señor(a) <strong>" +
      esc(d.nombre) +
      "</strong>, identificado(a) con DNI N.° <strong>" +
      esc(d.dni) +
      "</strong>, laboró en esta empresa desempeñando el cargo de <strong>" +
      esc(d.cargo) +
      "</strong>, desde el " +
      formatFechaLarga(d.fechaIngreso) +
      " hasta el " +
      formatFechaLarga(d.fechaCese) +
      ".</p>" +
      "<p>Durante su permanencia demostró responsabilidad y buen desempeño en sus funciones.</p>" +
      "<p>Se expide el presente certificado a solicitud del interesado para los fines que estime conveniente.</p>" +
      bloqueFirma({
        firmaDataUrl: d.firmaDataUrl,
        nombre: d.firmante || d.empresa,
        dni: "",
        caption: "Firma y sello del empleador",
        align: "center",
      }) +
      "</div>"
    );
  }

  function reciboDinero(d) {
    return (
      '<div class="doc-body">' +
      '<h2 class="doc-title">Recibo de dinero</h2>' +
      "<p>Yo, <strong>" +
      esc(d.receptor) +
      "</strong>, identificado(a) con DNI N.° <strong>" +
      esc(d.dniReceptor) +
      "</strong>, declaro haber recibido de <strong>" +
      esc(d.pagador) +
      "</strong> la suma de <strong>" +
      fmt(d.monto) +
      "</strong> (" +
      solesEnLetras(d.monto) +
      "), por concepto de: <strong>" +
      esc(d.concepto) +
      "</strong>.</p>" +
      "<p>Lugar y fecha: " +
      esc(d.ciudad || "Lima") +
      ", " +
      formatFechaLarga(d.fecha) +
      ".</p>" +
      bloqueFirma({
        firmaDataUrl: d.firmaDataUrl,
        nombre: d.receptor,
        dni: d.dniReceptor,
      }) +
      "</div>"
    );
  }

  function cotizacionIGV(d, igv) {
    return (
      '<div class="doc-body">' +
      '<h2 class="doc-title">Cotización</h2>' +
      '<p class="doc-sub">N.° ' +
      esc(d.numero || "001") +
      " — " +
      formatFechaLarga(d.fecha) +
      "</p>" +
      "<p><strong>De:</strong> " +
      esc(d.emisor) +
      "<br/><strong>RUC:</strong> " +
      esc(d.ruc) +
      "<br/><strong>Para:</strong> " +
      esc(d.cliente) +
      "</p>" +
      "<p><strong>Descripción:</strong><br/>" +
      esc(d.descripcion) +
      "</p>" +
      '<table class="doc-table">' +
      "<tr><td>Valor de venta</td><td>" +
      fmt(igv.base) +
      "</td></tr>" +
      "<tr><td>IGV (" +
      Math.round((igv.tasa || 0.18) * 100) +
      "%)</td><td>" +
      fmt(igv.igv) +
      "</td></tr>" +
      '<tr class="doc-total"><td>Total</td><td>' +
      fmt(igv.total) +
      "</td></tr>" +
      "</table>" +
      "<p><strong>Validez:</strong> " +
      esc(d.validez || "15 días") +
      "<br/><strong>Condiciones:</strong> " +
      esc(d.condiciones || "Pago contra entrega / transferencia bancaria.") +
      "</p>" +
      bloqueFirma({
        firmaDataUrl: d.firmaDataUrl,
        nombre: d.emisor,
        dni: "",
        caption: "Firma del emisor",
      }) +
      "</div>"
    );
  }

  function renderPreview(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  /** Estilos mínimos del comprobante (serif solo en el papel). */
  function printDocCss() {
    return [
      "@page{margin:12mm}",
      "html,body{margin:0;padding:0}",
      "body{color:#111;font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
      ".doc-body{max-width:720px;margin:0 auto;padding:8px}",
      "h1,h2,h3,.doc-title{font-family:'Times New Roman',Georgia,serif;font-weight:700;letter-spacing:0;margin:0 0 12px;font-size:1.35em;text-align:center}",
      ".doc-sub,.doc-meta,.doc-muted,.doc-footnote{color:#555;font-size:10pt}",
      ".doc-footnote{margin-top:18px}",
      "p{margin:0 0 10px}",
      ".doc-fecha-der{text-align:right}",
      ".doc-empresa{font-weight:700;text-align:center;margin-bottom:4px}",
      "table,.doc-table{width:100%;border-collapse:collapse;margin:12px 0}",
      "th,td{border:1px solid #222;padding:6px 8px;text-align:left;vertical-align:top}",
      "tr.doc-total td,.doc-neto,.doc-total{background:#0a0a0a!important;color:#fff!important;font-weight:700}",
      ".doc-firma-block{margin-top:36px}",
      ".doc-firma-stamp{position:relative;width:240px;min-height:56px;margin:0 0 6px}",
      ".doc-firma-stamp.is-centered,.doc-firma-block[style*=\"center\"] .doc-firma-stamp{margin-left:auto;margin-right:auto}",
      ".doc-firma-img,img.doc-firma-img{display:block;position:absolute;left:50%;bottom:2px;transform:translateX(-50%);max-width:220px;max-height:72px;width:auto;height:auto;margin:0;border:0!important;outline:none!important;box-shadow:none!important;background:transparent!important;padding:0!important;border-radius:0!important;z-index:1}",
      ".doc-firma-line{display:block;position:absolute;left:0;right:0;bottom:0;width:100%;border-bottom:1px solid #222;margin:0}",
      ".doc-firma-stamp:not(.has-img){min-height:28px}",
      ".doc-firma-stamp:not(.has-img) .doc-firma-line{position:relative;margin-top:28px}",
      ".doc-firma-caption{font-size:10pt;color:#555;margin-top:4px}",
    ].join("");
  }

  /**
   * Imprime solo el HTML del .doc-preview en una ventana/iframe dedicada.
   * Evita el PDF vacío de window.print() sobre la página completa.
   */
  function printPreview(el) {
    if (!el) return false;
    var preview =
      el.classList && el.classList.contains("doc-preview")
        ? el
        : (el.querySelector && el.querySelector(".doc-preview")) || el;
    var inner = preview.innerHTML || "";
    if (!String(inner).trim()) return false;

    var docHtml =
      "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"/>" +
      "<title>Documento</title><style>" +
      printDocCss() +
      "</style></head><body><div class=\"doc-body\">" +
      inner +
      "</div></body></html>";

    function triggerPrint(win, cleanup) {
      var run = function () {
        try {
          win.focus();
          win.print();
        } catch (e) { /* ignore */ }
        if (typeof cleanup === "function") {
          setTimeout(cleanup, 400);
        }
      };
      // Esperar a que las imágenes (firma) carguen
      var imgs = win.document ? win.document.images : [];
      var pending = 0;
      var i;
      for (i = 0; i < imgs.length; i++) {
        if (!imgs[i].complete) {
          pending++;
          imgs[i].addEventListener("load", function () {
            pending--;
            if (pending <= 0) setTimeout(run, 80);
          });
          imgs[i].addEventListener("error", function () {
            pending--;
            if (pending <= 0) setTimeout(run, 80);
          });
        }
      }
      if (pending === 0) setTimeout(run, 120);
    }

    var win = null;
    try {
      win = window.open("", "_blank", "width=820,height=920");
      if (win) {
        try {
          win.opener = null;
        } catch (eOp) { /* ignore */ }
      }
    } catch (e) {
      win = null;
    }

    if (win) {
      try {
        win.document.open();
        win.document.write(docHtml);
        win.document.close();
        triggerPrint(win, function () {
          try {
            win.close();
          } catch (e2) { /* ignore */ }
        });
        return true;
      } catch (e3) {
        try {
          win.close();
        } catch (e4) { /* ignore */ }
      }
    }

    // Fallback: iframe oculto si el popup está bloqueado
    var iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("title", "Impresión");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);
    var idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(docHtml);
    idoc.close();
    triggerPrint(iframe.contentWindow, function () {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    });
    return true;
  }

  global.Docs = {
    solesEnLetras: solesEnLetras,
    numeroALetras: numeroALetras,
    formatFechaLarga: formatFechaLarga,
    bloqueFirma: bloqueFirma,
    cartaRenuncia: cartaRenuncia,
    liquidacionBeneficios: liquidacionBeneficios,
    boletaPago: boletaPago,
    certificadoTrabajo: certificadoTrabajo,
    reciboDinero: reciboDinero,
    cotizacionIGV: cotizacionIGV,
    renderPreview: renderPreview,
    printPreview: printPreview,
  };
})(window);
