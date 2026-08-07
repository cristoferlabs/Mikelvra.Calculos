/* =========================================================
   Mikelvra — funciones puras de cálculo (Perú, laboral/tributario)
   No tocan el DOM. Se cargan como <script> plano (sin bundler),
   por eso se exponen bajo el namespace global window.Calc.
   ========================================================= */
(function (global) {
  "use strict";

  // Valores por defecto (fallback offline). Se sobrescriben con Calc.applyNormativa()
  // desde /data/normativa.json (open data + CI diario).
  var ASIGNACION_FAMILIAR_2026 = 113.0;
  var UIT_2026 = 5500;
  var RMV_2026 = 1130;
  var IGV_TASA = 0.18;
  var RETENCION_4TA = 0.08;
  var DEDUCCION_4TA_PCT = 0.2;
  var ESSALUD_TASA = 0.09;
  var HE_PCT_25 = 1.25;
  var HE_PCT_35 = 1.35;
  var DEDUCCION_RENTA_UIT = 7;
  var DEDUCCION_RENTA_2026 = DEDUCCION_RENTA_UIT * UIT_2026;

  var TRAMOS_RENTA_2026 = [
    { limite: 5 * UIT_2026, tasa: 0.08 },
    { limite: 20 * UIT_2026, tasa: 0.14 },
    { limite: 35 * UIT_2026, tasa: 0.17 },
    { limite: 45 * UIT_2026, tasa: 0.20 },
    { limite: Infinity, tasa: 0.30 },
  ];

  var SISTEMAS_PENSION_2026 = [
    { id: "onp", nombre: "ONP", tasa: 0.13 },
    { id: "habitat", nombre: "AFP Habitat", tasa: 0.1284 },
    { id: "integra", nombre: "AFP Integra", tasa: 0.1292 },
    { id: "prima", nombre: "AFP Prima", tasa: 0.1297 },
    { id: "profuturo", nombre: "AFP Profuturo", tasa: 0.1306 },
  ];

  function rebuildTramos(uit, tramosSeed) {
    if (tramosSeed && tramosSeed.length) {
      return tramosSeed.map(function (t) {
        return {
          limite: t.hastaUit == null ? Infinity : t.hastaUit * uit,
          tasa: t.tasa,
        };
      });
    }
    return [
      { limite: 5 * uit, tasa: 0.08 },
      { limite: 20 * uit, tasa: 0.14 },
      { limite: 35 * uit, tasa: 0.17 },
      { limite: 45 * uit, tasa: 0.20 },
      { limite: Infinity, tasa: 0.30 },
    ];
  }

  function applyNormativa(data) {
    if (!data) return;
    if (data.asignacionFamiliar != null) ASIGNACION_FAMILIAR_2026 = Number(data.asignacionFamiliar);
    if (data.uit != null) UIT_2026 = Number(data.uit);
    if (data.rmv != null) RMV_2026 = Number(data.rmv);
    if (data.igv != null) IGV_TASA = Number(data.igv);
    if (data.retencion4ta != null) RETENCION_4TA = Number(data.retencion4ta);
    if (data.deduccion4taPct != null) DEDUCCION_4TA_PCT = Number(data.deduccion4taPct);
    if (data.essalud != null) ESSALUD_TASA = Number(data.essalud);
    if (data.horasExtras) {
      if (data.horasExtras.pct25 != null) HE_PCT_25 = Number(data.horasExtras.pct25);
      if (data.horasExtras.pct35 != null) HE_PCT_35 = Number(data.horasExtras.pct35);
    }
    if (data.deduccionRentaUit != null) DEDUCCION_RENTA_UIT = Number(data.deduccionRentaUit);
    DEDUCCION_RENTA_2026 = DEDUCCION_RENTA_UIT * UIT_2026;
    TRAMOS_RENTA_2026 = rebuildTramos(UIT_2026, data.tramosRenta);
    if (data.sistemasPension && data.sistemasPension.length) {
      SISTEMAS_PENSION_2026 = data.sistemasPension.map(function (s) {
        return { id: s.id, nombre: s.nombre, tasa: Number(s.tasa) };
      });
    }
    syncExports();
  }

  function syncExports() {
    if (!global.Calc) return;
    global.Calc.ASIGNACION_FAMILIAR_2026 = ASIGNACION_FAMILIAR_2026;
    global.Calc.UIT_2026 = UIT_2026;
    global.Calc.RMV_2026 = RMV_2026;
    global.Calc.IGV_TASA = IGV_TASA;
    global.Calc.DEDUCCION_RENTA_2026 = DEDUCCION_RENTA_2026;
    global.Calc.TRAMOS_RENTA_2026 = TRAMOS_RENTA_2026;
    global.Calc.SISTEMAS_PENSION_2026 = SISTEMAS_PENSION_2026;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // ---------- Gratificación (Ley N.° 27735) ----------
  function calcularGratificacion(input) {
    var sueldo = input.sueldo || 0;
    var remuneracionComputable = sueldo + (input.tieneAsignacion ? ASIGNACION_FAMILIAR_2026 : 0);
    var meses = clamp(input.mesesCompletos || 0, 0, 6);
    var tasaBono = input.tasaBono != null ? input.tasaBono : 0.09;
    var gratBase = (remuneracionComputable / 6) * meses;
    var bono = gratBase * tasaBono;
    return {
      remuneracionComputable: remuneracionComputable,
      mesesCompletos: meses,
      gratBase: gratBase,
      bono: bono,
      total: gratBase + bono,
    };
  }

  // ---------- CTS (TUO del D. Leg. 650, D.S. N.° 001-97-TR) ----------
  function calcularCTS(input) {
    var sueldo = input.sueldo || 0;
    var remuneracionComputable = sueldo + (input.tieneAsignacion ? ASIGNACION_FAMILIAR_2026 : 0);
    var ultimaGratificacion = input.ultimaGratificacion || 0;
    var meses = clamp(input.mesesCompletos || 0, 0, 6);
    var dias = clamp(input.diasAdicionales || 0, 0, 29);
    var sexto = ultimaGratificacion / 6;
    var base = remuneracionComputable + sexto;
    var porMeses = (base / 12) * meses;
    var porDias = (base / 360) * dias;
    return {
      remuneracionComputable: remuneracionComputable,
      sexto: sexto,
      base: base,
      mesesCompletos: meses,
      diasAdicionales: dias,
      porMeses: porMeses,
      porDias: porDias,
      total: porMeses + porDias,
    };
  }

  // ---------- Vacaciones (Decreto Legislativo N.° 713) ----------
  function calcularVacaciones(input) {
    var sueldo = input.sueldo || 0;
    var remuneracionComputable = sueldo + (input.tieneAsignacion ? ASIGNACION_FAMILIAR_2026 : 0);
    var meses = clamp(input.mesesCompletos || 0, 0, 12);
    var dias = clamp(input.diasAdicionales || 0, 0, 29);
    var esAnioCompleto = meses >= 12;
    var porMeses = (remuneracionComputable / 12) * meses;
    var porDias = (remuneracionComputable / 360) * dias;
    var total = esAnioCompleto ? remuneracionComputable : porMeses + porDias;
    return {
      remuneracionComputable: remuneracionComputable,
      mesesCompletos: meses,
      diasAdicionales: dias,
      esAnioCompleto: esAnioCompleto,
      porMeses: porMeses,
      porDias: porDias,
      total: total,
    };
  }

  // ---------- AFP vs ONP (Ley N.° 25897 / Decreto Ley N.° 19990) ----------
  function compararPensiones(sueldoBruto) {
    var bruto = sueldoBruto || 0;
    var filas = SISTEMAS_PENSION_2026.map(function (s) {
      var descuento = bruto * s.tasa;
      return { id: s.id, nombre: s.nombre, tasa: s.tasa, descuento: descuento, neto: bruto - descuento };
    });
    var mejor = filas.reduce(function (a, b) {
      return b.descuento < a.descuento ? b : a;
    });
    return { filas: filas, mejor: mejor };
  }

  // ---------- Impuesto a la Renta 5ta categoría (D.S. N.° 179-2004-EF, art. 34) ----------
  function calcularImpuestoProgresivo(rentaNeta) {
    var impuesto = 0;
    var anterior = 0;
    for (var i = 0; i < TRAMOS_RENTA_2026.length; i++) {
      var tramo = TRAMOS_RENTA_2026[i];
      if (rentaNeta > anterior) {
        var baseTramo = Math.min(rentaNeta, tramo.limite) - anterior;
        impuesto += baseTramo * tramo.tasa;
        anterior = tramo.limite;
      } else {
        break;
      }
    }
    return impuesto;
  }

  function calcularImpuestoRenta(input) {
    var sueldo = input.sueldoBrutoMensual || 0;
    var meses = input.mesesTrabajados || 12;
    var ingresoAnual = sueldo * meses;
    var rentaNeta = Math.max(0, ingresoAnual - DEDUCCION_RENTA_2026);
    var impuesto = calcularImpuestoProgresivo(rentaNeta);
    return {
      ingresoAnual: ingresoAnual,
      deduccion: DEDUCCION_RENTA_2026,
      rentaNeta: rentaNeta,
      impuesto: impuesto,
      tasaEfectiva: ingresoAnual > 0 ? (impuesto / ingresoAnual) * 100 : 0,
      mensual: impuesto / 12,
    };
  }

  // ---------- Sueldo Neto (composición AFP/ONP + Impuesto a la Renta 5ta) ----------
  function calcularSueldoNeto(input) {
    var bruto = input.sueldoBruto || 0;
    var tasa = input.tasaPension || 0;
    var descuentoPension = bruto * tasa;
    var renta = calcularImpuestoRenta({ sueldoBrutoMensual: bruto, mesesTrabajados: 12 });
    return {
      sueldoBruto: bruto,
      tasaPension: tasa,
      descuentoPension: descuentoPension,
      retencionRenta: renta.mensual,
      neto: bruto - descuentoPension - renta.mensual,
    };
  }

  // Neto→Bruto: sin fórmula cerrada (el impuesto es progresivo). calcularSueldoNeto
  // es monótona creciente en bruto, así que basta una bisección simple.
  function sueldoBrutoDesdeNeto(input) {
    var netoDeseado = input.netoDeseado || 0;
    var tasa = input.tasaPension || 0;
    var tolerancia = 0.005;
    var iterMax = 60;

    var lo = netoDeseado;
    var hi = netoDeseado * 2 + 1000;
    while (calcularSueldoNeto({ sueldoBruto: hi, tasaPension: tasa }).neto < netoDeseado) {
      hi *= 2;
    }

    var mid = (lo + hi) / 2;
    for (var i = 0; i < iterMax; i++) {
      mid = (lo + hi) / 2;
      var netoCalculado = calcularSueldoNeto({ sueldoBruto: mid, tasaPension: tasa }).neto;
      if (Math.abs(netoCalculado - netoDeseado) < tolerancia) break;
      if (netoCalculado < netoDeseado) lo = mid; else hi = mid;
    }
    return calcularSueldoNeto({ sueldoBruto: mid, tasaPension: tasa });
  }

  // ---------- Utilidades de fechas (convención 30/360) ----------
  // Convención comercial 30/360 (mes=30 días, año=360): coherente con que las
  // fórmulas de arriba ya dividen entre 6/12/360, y es el método habitual en
  // los sistemas de planillas peruanos para beneficios truncos.
  function diasEntre360(f1, f2) {
    var d1 = f1.getUTCDate();
    var d2 = f2.getUTCDate();
    if (d1 === 31) d1 = 30;
    if (d2 === 31 && d1 === 30) d2 = 30;
    return (f2.getUTCFullYear() - f1.getUTCFullYear()) * 360
      + (f2.getUTCMonth() - f1.getUTCMonth()) * 30
      + (d2 - d1);
  }

  function mesesYDiasDesde30360(f1, f2) {
    var total = Math.max(0, diasEntre360(f1, f2));
    return { meses: Math.floor(total / 30), dias: total % 30, totalDias: total };
  }

  function maxFecha(a, b) {
    return a > b ? a : b;
  }

  // Corte de semestre CTS: 1-mayo / 1-noviembre.
  function inicioSemestreCTS(fecha) {
    var y = fecha.getUTCFullYear();
    var m = fecha.getUTCMonth();
    if (m >= 4 && m <= 9) return new Date(Date.UTC(y, 4, 1));
    if (m >= 10) return new Date(Date.UTC(y, 10, 1));
    return new Date(Date.UTC(y - 1, 10, 1));
  }

  // Corte de semestre Gratificación: 1-enero / 1-julio.
  function inicioSemestreGratificacion(fecha) {
    var y = fecha.getUTCFullYear();
    var m = fecha.getUTCMonth();
    return m <= 5 ? new Date(Date.UTC(y, 0, 1)) : new Date(Date.UTC(y, 6, 1));
  }

  // Último aniversario de ingreso (para vacaciones), respecto a una fecha de referencia.
  function ultimoAniversario(fechaIngreso, fechaReferencia) {
    var aniv = new Date(Date.UTC(fechaReferencia.getUTCFullYear(), fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate()));
    if (aniv > fechaReferencia) {
      aniv = new Date(Date.UTC(aniv.getUTCFullYear() - 1, fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate()));
    }
    return aniv;
  }

  function parseFechaISO(str) {
    return new Date(str + "T00:00:00Z");
  }

  // ---------- Liquidación de beneficios sociales (composición) ----------
  function calcularLiquidacion(input) {
    var sueldo = input.sueldo || 0;
    var tieneAsignacion = !!input.tieneAsignacion;
    var tasaBono = input.tasaBono != null ? input.tasaBono : 0.09;
    var ingreso = input.fechaIngreso;
    var cese = input.fechaCese;

    var inicioGrat = maxFecha(inicioSemestreGratificacion(cese), ingreso);
    var pGrat = mesesYDiasDesde30360(inicioGrat, cese);
    var grat = calcularGratificacion({ sueldo: sueldo, tieneAsignacion: tieneAsignacion, mesesCompletos: pGrat.meses, tasaBono: tasaBono });

    var inicioCTS = maxFecha(inicioSemestreCTS(cese), ingreso);
    var pCTS = mesesYDiasDesde30360(inicioCTS, cese);
    var ultimaGrat = input.ultimaGratificacionManual != null ? input.ultimaGratificacionManual : grat.total;
    var cts = calcularCTS({ sueldo: sueldo, tieneAsignacion: tieneAsignacion, ultimaGratificacion: ultimaGrat, mesesCompletos: pCTS.meses, diasAdicionales: pCTS.dias });

    var inicioVac = maxFecha(ultimoAniversario(ingreso, cese), ingreso);
    var pVac = mesesYDiasDesde30360(inicioVac, cese);
    var vac = calcularVacaciones({ sueldo: sueldo, tieneAsignacion: tieneAsignacion, mesesCompletos: pVac.meses, diasAdicionales: pVac.dias });

    return { gratificacion: grat, cts: cts, vacaciones: vac, total: grat.total + cts.total + vac.total };
  }

  // ---------- "¿Cuánto me deben?" — resumen para trabajador activo ----------
  function calcularResumenActivo(input) {
    var sueldo = input.sueldo || 0;
    var tieneAsignacion = !!input.tieneAsignacion;
    var tasaBono = input.tasaBono != null ? input.tasaBono : 0.09;
    var tasaPension = input.tasaPension != null ? input.tasaPension : 0.13;
    var ingreso = input.fechaIngreso;
    if (!ingreso) return null;

    var hoy = input.hoy || new Date();
    var hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));

    var inicioGrat = maxFecha(inicioSemestreGratificacion(hoyUTC), ingreso);
    var pGrat = mesesYDiasDesde30360(inicioGrat, hoyUTC);
    var grat = calcularGratificacion({ sueldo: sueldo, tieneAsignacion: tieneAsignacion, mesesCompletos: pGrat.meses, tasaBono: tasaBono });

    var inicioCTS = maxFecha(inicioSemestreCTS(hoyUTC), ingreso);
    var pCTS = mesesYDiasDesde30360(inicioCTS, hoyUTC);
    var ultimaGrat = input.ultimaGratificacionManual > 0 ? input.ultimaGratificacionManual : grat.total;
    var cts = calcularCTS({
      sueldo: sueldo, tieneAsignacion: tieneAsignacion,
      ultimaGratificacion: ultimaGrat,
      mesesCompletos: pCTS.meses, diasAdicionales: pCTS.dias,
    });

    var inicioVac = maxFecha(ultimoAniversario(ingreso, hoyUTC), ingreso);
    var pVac = mesesYDiasDesde30360(inicioVac, hoyUTC);
    var vac = calcularVacaciones({ sueldo: sueldo, tieneAsignacion: tieneAsignacion, mesesCompletos: pVac.meses, diasAdicionales: pVac.dias });

    var brutoMensual = sueldo + (tieneAsignacion ? ASIGNACION_FAMILIAR_2026 : 0);
    var neto = calcularSueldoNeto({ sueldoBruto: brutoMensual, tasaPension: tasaPension });

    return {
      cts: cts,
      gratificacion: grat,
      vacaciones: vac,
      neto: neto,
      totalSiRenunciaraHoy: cts.total + grat.total + vac.total,
    };
  }

  // ---------- Mi situación laboral — proyección anual completa ----------
  function calcularSituacionAnual(input) {
    var sueldo = input.sueldo || 0;
    var tieneAsignacion = !!input.tieneAsignacion;
    var tasaBono = input.tasaBono != null ? input.tasaBono : 0.09;
    var tasaPension = input.tasaPension != null ? input.tasaPension : 0.13;
    var tasaEssalud = input.tasaEssalud != null ? input.tasaEssalud : ESSALUD_TASA;
    var af = tieneAsignacion ? ASIGNACION_FAMILIAR_2026 : 0;
    var brutoMensual = sueldo + af;

    var gratSemestral = calcularGratificacion({
      sueldo: sueldo, tieneAsignacion: tieneAsignacion, mesesCompletos: 6, tasaBono: tasaBono,
    });
    var ultimaGrat = input.ultimaGratificacionManual > 0 ? input.ultimaGratificacionManual : gratSemestral.total;
    var ctsSemestral = calcularCTS({
      sueldo: sueldo, tieneAsignacion: tieneAsignacion,
      ultimaGratificacion: ultimaGrat, mesesCompletos: 6, diasAdicionales: 0,
    });
    var vacacionesAnuales = calcularVacaciones({
      sueldo: sueldo, tieneAsignacion: tieneAsignacion, mesesCompletos: 12, diasAdicionales: 0,
    });

    var neto = calcularSueldoNeto({ sueldoBruto: brutoMensual, tasaPension: tasaPension });
    var comparacion = compararPensiones(brutoMensual);

    var ctsAnual = ctsSemestral.total * 2;
    var gratAnual = gratSemestral.total * 2;
    var sueldosNetosAnuales = neto.neto * 12;
    var beneficiosAnuales = ctsAnual + gratAnual + vacacionesAnuales.total;
    var ingresoTotalAnual = sueldosNetosAnuales + beneficiosAnuales;

    var planillaAnual = brutoMensual * 12;
    var essaludAnual = planillaAnual * tasaEssalud;
    var costoEmpleadorAnual = planillaAnual + gratAnual + ctsAnual + vacacionesAnuales.total + essaludAnual;

    return {
      brutoMensual: brutoMensual,
      asignacionFamiliar: af,
      neto: neto,
      ctsSemestral: ctsSemestral,
      gratificacionSemestral: gratSemestral,
      vacaciones: vacacionesAnuales,
      ctsAnual: ctsAnual,
      gratificacionAnual: gratAnual,
      sueldosNetosAnuales: sueldosNetosAnuales,
      beneficiosAnuales: beneficiosAnuales,
      ingresoTotalAnual: ingresoTotalAnual,
      essaludAnual: essaludAnual,
      costoEmpleadorAnual: costoEmpleadorAnual,
      comparacionPensiones: comparacion,
      desglosePorcentaje: {
        netos: ingresoTotalAnual > 0 ? (sueldosNetosAnuales / ingresoTotalAnual) * 100 : 0,
        cts: ingresoTotalAnual > 0 ? (ctsAnual / ingresoTotalAnual) * 100 : 0,
        gratificacion: ingresoTotalAnual > 0 ? (gratAnual / ingresoTotalAnual) * 100 : 0,
        vacaciones: ingresoTotalAnual > 0 ? (vacacionesAnuales.total / ingresoTotalAnual) * 100 : 0,
      },
    };
  }

  // Próximos cobros legales (fechas referenciales).
  function proximosPagos(hoy, fechaIngreso) {
    var ref = hoy || new Date();
    var hoyUTC = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var y = hoyUTC.getUTCFullYear();
    var candidatos = [
      { tipo: "cts", label: "Depósito CTS (mayo)", fecha: new Date(Date.UTC(y, 4, 15)) },
      { tipo: "grat", label: "Gratificación de julio", fecha: new Date(Date.UTC(y, 6, 15)) },
      { tipo: "cts", label: "Depósito CTS (noviembre)", fecha: new Date(Date.UTC(y, 10, 15)) },
      { tipo: "grat", label: "Gratificación de diciembre", fecha: new Date(Date.UTC(y, 11, 15)) },
      { tipo: "cts", label: "Depósito CTS (mayo)", fecha: new Date(Date.UTC(y + 1, 4, 15)) },
      { tipo: "grat", label: "Gratificación de julio", fecha: new Date(Date.UTC(y + 1, 6, 15)) },
      { tipo: "cts", label: "Depósito CTS (noviembre)", fecha: new Date(Date.UTC(y + 1, 10, 15)) },
      { tipo: "grat", label: "Gratificación de diciembre", fecha: new Date(Date.UTC(y + 1, 11, 15)) },
    ];

    if (fechaIngreso) {
      var anivEste = new Date(Date.UTC(y, fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate()));
      var anivProx = anivEste > hoyUTC
        ? anivEste
        : new Date(Date.UTC(y + 1, fechaIngreso.getUTCMonth(), fechaIngreso.getUTCDate()));
      candidatos.push({ tipo: "vac", label: "Aniversario de vacaciones", fecha: anivProx });
    }

    return candidatos
      .filter(function (e) { return e.fecha > hoyUTC; })
      .sort(function (a, b) { return a.fecha - b.fecha; })
      .slice(0, 5);
  }

  // ---------- Horas extras (D.S. 007-2002-TR) ----------
  function calcularHorasExtras(input) {
    var sueldo = input.sueldo || 0;
    var horas25 = Math.max(0, input.horas25 || 0);
    var horas35 = Math.max(0, input.horas35 || 0);
    var valorHora = sueldo / 30 / 8;
    var monto25 = valorHora * HE_PCT_25 * horas25;
    var monto35 = valorHora * HE_PCT_35 * horas35;
    return {
      valorHora: valorHora,
      horas25: horas25,
      horas35: horas35,
      monto25: monto25,
      monto35: monto35,
      total: monto25 + monto35,
    };
  }

  // ---------- UIT ----------
  function convertirUIT(input) {
    var uit = UIT_2026;
    if (input.modo === "uit-a-soles") {
      var uitVal = input.valor || 0;
      return { modo: input.modo, uit: uit, valor: uitVal, resultado: uitVal * uit };
    }
    var soles = input.valor || 0;
    return { modo: "soles-a-uit", uit: uit, valor: soles, resultado: uit > 0 ? soles / uit : 0 };
  }

  // ---------- IGV ----------
  function calcularIGV(input) {
    var tasa = IGV_TASA;
    var monto = input.monto || 0;
    if (input.modo === "agregar") {
      var igvAdd = monto * tasa;
      return { modo: "agregar", base: monto, igv: igvAdd, total: monto + igvAdd, tasa: tasa };
    }
    var base = monto / (1 + tasa);
    var igvQuitar = monto - base;
    return { modo: "quitar", base: base, igv: igvQuitar, total: monto, tasa: tasa };
  }

  // ---------- Recibo por honorarios ----------
  function calcularReciboHonorarios(input) {
    var bruto = input.montoBruto || 0;
    var retencion = input.conRetencion !== false ? bruto * RETENCION_4TA : 0;
    return {
      bruto: bruto,
      retencion: retencion,
      neto: bruto - retencion,
      tasaRetencion: input.conRetencion !== false ? RETENCION_4TA : 0,
    };
  }

  // ---------- Utilidades (D.Leg. 892) — estimación orientativa ----------
  function calcularUtilidades(input) {
    var utilidadDistribuible = input.utilidadDistribuible || 0;
    var diasTrabajador = Math.max(0, input.diasTrabajador || 0);
    var diasTotales = Math.max(1, input.diasTotalesEmpresa || 1);
    var remuneracionTrabajador = input.remuneracionAnual || 0;
    var remuneracionTotal = Math.max(1, input.remuneracionTotalEmpresa || 1);
    var porDias = utilidadDistribuible * 0.5 * (diasTrabajador / diasTotales);
    var porRemuneracion = utilidadDistribuible * 0.5 * (remuneracionTrabajador / remuneracionTotal);
    return {
      utilidadDistribuible: utilidadDistribuible,
      porDias: porDias,
      porRemuneracion: porRemuneracion,
      total: porDias + porRemuneracion,
      porcentajeSector: input.porcentajeSector || 0,
    };
  }

  // ---------- Renta 4ta categoría (independientes) ----------
  function calcularRenta4ta(input) {
    var ingresoAnual = input.ingresoAnual || 0;
    var deduccion20 = ingresoAnual * DEDUCCION_4TA_PCT;
    var rentaNeta = Math.max(0, ingresoAnual - deduccion20 - DEDUCCION_RENTA_2026);
    var impuesto = calcularImpuestoProgresivo(rentaNeta);
    var umbralSuspension = DEDUCCION_RENTA_UIT * UIT_2026;
    return {
      ingresoAnual: ingresoAnual,
      deduccion20: deduccion20,
      deduccion7UIT: DEDUCCION_RENTA_2026,
      rentaNeta: rentaNeta,
      impuesto: impuesto,
      umbralSuspension: umbralSuspension,
      superaUmbral: ingresoAnual > umbralSuspension,
      mensual: impuesto / 12,
    };
  }

  global.Calc = {
    ASIGNACION_FAMILIAR_2026: ASIGNACION_FAMILIAR_2026,
    UIT_2026: UIT_2026,
    RMV_2026: RMV_2026,
    IGV_TASA: IGV_TASA,
    DEDUCCION_RENTA_2026: DEDUCCION_RENTA_2026,
    TRAMOS_RENTA_2026: TRAMOS_RENTA_2026,
    SISTEMAS_PENSION_2026: SISTEMAS_PENSION_2026,
    applyNormativa: applyNormativa,
    calcularGratificacion: calcularGratificacion,
    calcularCTS: calcularCTS,
    calcularVacaciones: calcularVacaciones,
    compararPensiones: compararPensiones,
    calcularImpuestoProgresivo: calcularImpuestoProgresivo,
    calcularImpuestoRenta: calcularImpuestoRenta,
    calcularSueldoNeto: calcularSueldoNeto,
    sueldoBrutoDesdeNeto: sueldoBrutoDesdeNeto,
    calcularLiquidacion: calcularLiquidacion,
    calcularResumenActivo: calcularResumenActivo,
    calcularSituacionAnual: calcularSituacionAnual,
    proximosPagos: proximosPagos,
    calcularHorasExtras: calcularHorasExtras,
    convertirUIT: convertirUIT,
    calcularIGV: calcularIGV,
    calcularReciboHonorarios: calcularReciboHonorarios,
    calcularUtilidades: calcularUtilidades,
    calcularRenta4ta: calcularRenta4ta,
    diasEntre360: diasEntre360,
    mesesYDiasDesde30360: mesesYDiasDesde30360,
    inicioSemestreCTS: inicioSemestreCTS,
    inicioSemestreGratificacion: inicioSemestreGratificacion,
    ultimoAniversario: ultimoAniversario,
    parseFechaISO: parseFechaISO,
    maxFecha: maxFecha,
  };
})(window);
