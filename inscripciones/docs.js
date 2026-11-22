// ============================================================
//  Documentos de matrícula — Colegio Gimnasio Real de la Sabana
//  Factura de matrícula, folio, contrato / pagaré (texto que pega
//  el colegio en el panel) y carné digital.
//  Los datos legales (razón social, NIT, resolución, rectoría) se
//  llenan en el panel → Configuración → Matrícula. Si faltan, salen
//  como [POR CONFIRMAR].
// ============================================================
(function () {
  const { C, esc, pesos, fecha, nombreEst, enLetras, hoyLargo, nivelDe, TIPOS, fotoSrc, calcFactura, estadoPagoMat } = GRS;
  const PC = "[POR CONFIRMAR]";
  const L = v => esc(v) || "_______________";

  function legal(cfg) { return (cfg && cfg.matricula && cfg.matricula.legal) || {}; }
  function encabezado(cfg, titulo, sub) {
    const g = legal(cfg);
    return `<div class="enc"><img src="logo.jpeg" alt="">
      <div><h1>${titulo}</h1><p><b>${esc(g.razonSocial || "COLEGIO GIMNASIO REAL DE LA SABANA")}</b><br>
      NIT ${esc(g.nit || PC)}${g.resolucion ? " · " + esc(g.resolucion) : ""}<br>${esc(g.direccion || C.ciudad)}${g.telefono ? " · Tel. " + esc(g.telefono) : ""}</p>${sub ? `<p><b>${sub}</b></p>` : ""}</div></div>`;
  }
  function firma(f, rol, extra) {
    return `<div class="firma-doc">${f && f.img ? `<img src="${esc(f.img)}" alt="Firma">` : `<div style="height:52px"></div>`}
      <div class="linea"><b>${esc(f && f.nombre) || rol}</b><br>${rol}${extra ? "<br>" + extra : ""}${f && f.fecha ? `<br><small>Firmado en línea: ${fecha(f.fecha, true)}</small>` : ""}</div></div>`;
  }
  function firmaRectoria(cfg) {
    const g = legal(cfg);
    return firma({ nombre: g.rector || PC }, esc(g.cargoRector || "Rectoría") + " — Gimnasio Real de la Sabana");
  }
  // Edad en años cumplidos
  function anios(fn) {
    if (!fn) return 0;
    const n = new Date(fn + "T00:00:00"), h = new Date();
    let a = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
    return a;
  }
  // Quién firma: acudiente siempre; madre/padre si son distintos del acudiente;
  // el estudiante solo desde los 7 años y de forma opcional.
  function firmantes(i) {
    const r = [];
    if (anios(i.fechaNacimiento) >= 7) r.push({ k: "estudiante", rol: "Estudiante", nombre: nombreEst(i), doc: (i.tipoDoc || "") + " " + (i.numDoc || ""), req: false });
    r.push({ k: "acudiente", rol: "Acudiente (" + (i.acuParentesco || "") + ")", nombre: i.acuNombre, doc: "C.C. " + (i.acuCC || ""), req: true });
    const n = s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
    const d = s => String(s || "").replace(/\D/g, "");
    const mismo = (cc, nom) => (d(cc) && d(cc) === d(i.acuCC)) || (!d(cc) && n(nom) === n(i.acuNombre));
    if (i.madreNombre && !mismo(i.madreCC, i.madreNombre)) r.push({ k: "madre", rol: "Madre", nombre: i.madreNombre, doc: "C.C. " + (i.madreCC || ""), req: false });
    if (i.padreNombre && !mismo(i.padreCC, i.padreNombre)) r.push({ k: "padre", rol: "Padre", nombre: i.padreNombre, doc: "C.C. " + (i.padreCC || ""), req: false });
    return r;
  }

  // ---------- FACTURA DE MATRÍCULA (documento de cobro interno) ----------
  function factura(i, cfg, m, a) {
    const f = (m && m.factura) || {}, k = calcFactura(i, cfg), mt = cfg.matricula;
    const ep = estadoPagoMat(m, a), pagado = ep === "aprobado" ? Number(a.pago.valor) || 0 : 0;
    const estado = ep === "aprobado" ? (pagado >= k.total ? "PAGADA" : "Abono " + pesos(pagado)) : ep === "revision" ? "Pago en revisión" : "Pendiente de pago";
    const mesesRest = GRS.MESES.length - 1;
    return `<div class="hoja factura">
      ${encabezado(cfg, "FACTURA DE MATRÍCULA " + C.anio, "N.° " + esc(f.numero || "—"))}
      <table class="fx-meta"><tr>
        <td><b>Fecha de expedición</b>${fecha(f.fecha || new Date().toISOString())}</td>
        <td><b>Fecha máxima de pago</b>${k.fechaLimite ? fecha(k.fechaLimite) : PC}</td>
        <td><b>Código de inscripción</b>${esc(i.codigo)}</td>
        <td><b>Estado</b>${estado}</td></tr></table>
      <h3>ADQUIRIENTE</h3>
      <table><tr><td><b>Nombre</b>${esc(i.acuNombre)}</td><td><b>C.C.</b>${esc(i.acuCC)}</td><td><b>Teléfono</b>${esc(i.acuTel)}</td><td><b>Correo</b>${esc(i.acuCorreo) || "—"}</td></tr>
        <tr><td colspan="2"><b>Dirección</b>${esc(i.direccion)} · ${esc(i.barrio)}</td><td colspan="2"><b>Estudiante</b>${esc(nombreEst(i))} · ${esc(i.tipoDoc)} ${esc(i.numDoc)}</td></tr></table>
      <h3>DETALLE</h3>
      <table class="fx-items"><tr class="th"><td>Descripción</td><td>Cant.</td><td class="num">Valor unitario</td><td class="num">Total</td></tr>
        ${k.items.map(x => `<tr><td>${esc(x.desc)}${x.det ? `<br><small>${esc(x.det)}</small>` : ""}</td><td>1</td><td class="num">${pesos(x.valor)}</td><td class="num">${pesos(x.valor)}</td></tr>`).join("")}
        <tr><td colspan="3" class="num">Subtotal</td><td class="num">${pesos(k.total)}</td></tr>
        <tr><td colspan="3" class="num">IVA (servicio educativo excluido, Art. 476 E.T.)</td><td class="num">$ 0</td></tr>
        <tr class="tot"><td colspan="3" class="num">TOTAL A PAGAR</td><td class="num">${pesos(k.total)}</td></tr></table>
      <p class="legal">Son: <b>${esc(enLetras(k.total).toLowerCase())}</b> m/cte.</p>
      <h3>PENSIONES ${C.anio}</h3>
      <p class="legal">Pensión mensual: <b>${k.pension ? pesos(k.pension) : PC}</b>. La pensión de febrero se paga con la matrícula; las de marzo a noviembre (${mesesRest} meses) se pagan ${k.diaPension ? `dentro de los primeros <b>${k.diaPension} días</b> de cada mes` : "en las fechas que indique el colegio"}.</p>
      <h3>MEDIOS DE PAGO</h3>
      <p class="legal">${esc(mt.mediosPago || PC)}</p>
      <p class="legal"><i>Documento de cobro interno del Colegio Gimnasio Real de la Sabana. No reemplaza la factura electrónica ante la DIAN.</i></p>
    </div>`;
  }

  // ---------- FOLIO DE MATRÍCULA ----------
  function folio(i, m, a, cfg) {
    const td = (t, v, cs) => `<td${cs ? ` colspan="${cs}"` : ""}><b>${t}</b>${esc(v) || "&nbsp;"}</td>`;
    const fs = firmantes(i), p = a && a.pago;
    const conf = a && a.confirmada;
    return `<div class="hoja">
      <div class="enc"><img src="logo.jpeg" alt="">
        <div><h1>FOLIO DE MATRÍCULA N.° ${esc(m.folio || "—")}</h1><p>COLEGIO GIMNASIO REAL DE LA SABANA · ${esc(C.ciudad)}<br>Preescolar y Básica Primaria · Año lectivo ${C.anio}</p></div>
        <div class="estado-imp"><b>Folio ${esc(m.folio || "—")}</b><br>Inscripción ${esc(i.codigo)}<br>Matrícula: ${conf ? "<b>CONFIRMADA</b>" : "En revisión"}<br>${fecha(m.enviada, true)}</div>
        ${fotoSrc(i) ? `<img class="foto-imp" src="${esc(fotoSrc(i))}" alt="Foto">` : `<div class="foto-imp">FOTO</div>`}
      </div>
      <h3>DATOS DEL ESTUDIANTE</h3>
      <table>
        <tr>${td("Nombres", [i.nombre1, i.nombre2].filter(Boolean).join(" "), 2)}${td("Apellidos", [i.apellido1, i.apellido2].filter(Boolean).join(" "), 2)}</tr>
        <tr>${td("Documento", (i.tipoDoc || "") + " " + (i.numDoc || ""))}${td("Fecha de nacimiento", i.fechaNacimiento)}${td("EPS", i.eps)}${td("RH", i.rh)}</tr>
        <tr>${td("Grado " + C.anio, i.grado)}${td("Nivel", nivelDe(i.grado))}${td("Tipo", TIPOS[i.tipoEstudiante])}${td("Vive con", i.viveCon)}</tr>
        <tr>${td("Dirección", i.direccion, 2)}${td("Barrio", i.barrio)}${td("Institución anterior", i.institucionAnterior)}</tr>
        <tr>${td("Alergias", i.alergias, 2)}${td("Cuidados especiales", i.cuidados, 2)}</tr>
      </table>
      <h3>FAMILIA Y ACUDIENTE</h3>
      <table>
        <tr>${td("Madre", i.madreNombre, 2)}${td("C.C.", i.madreCC)}${td("Celular", i.madreCel)}</tr>
        <tr>${td("Padre", i.padreNombre, 2)}${td("C.C.", i.padreCC)}${td("Celular", i.padreCel)}</tr>
        <tr>${td("Acudiente", i.acuNombre + " (" + (i.acuParentesco || "") + ")", 2)}${td("C.C.", (i.acuCC || "") + (m.acuExpedida ? " de " + m.acuExpedida : ""))}${td("Celular", i.acuTel)}</tr>
        <tr>${td("Emergencia", i.emeNombre, 2)}${td("Teléfono", i.emeTel)}${td("Correo", m.acuCorreo || i.acuCorreo)}</tr>
      </table>
      <h3>DOCUMENTOS ENTREGADOS</h3>
      <table>${Object.values(m.docs || {}).map(d => `<tr><td>${esc(d.titulo)}</td><td>✔ Adjuntado</td></tr>`).join("") || "<tr><td>—</td></tr>"}</table>
      <h3>PAGO DE MATRÍCULA</h3>
      <table><tr>${td("Factura", (m.factura && m.factura.numero) || "")}${td("Valor", p && p.valor ? pesos(p.valor) : "")}${td("Fecha", p && p.fecha)}${td("Estado", p && p.estado === "aprobado" ? "Aprobado" + (p.recibo ? " · Recibo " + p.recibo : "") : "Pendiente")}</tr></table>
      <p class="legal">Con la firma de este folio, el estudiante y su familia formalizan la matrícula ${C.anio} en el Colegio Gimnasio Real de la Sabana, aceptan el Proyecto Educativo Institucional (PEI), el Manual de Convivencia y el sistema de matrícula y pensiones del colegio, y declaran que la información suministrada es veraz. Datos tratados conforme a la Ley 1581 de 2012.</p>
      <div class="firmas-doc">${fs.map(x => firma((m.firmas || {})[x.k], x.rol, x.doc)).join("")}${firmaRectoria(cfg)}</div>
    </div>`;
  }

  // ---------- CONTRATO / PAGARÉ: texto que pega el colegio, con campos automáticos ----------
  // Campos disponibles: {acudiente} {cedula} {expedida} {direccion} {telefono} {correo}
  // {estudiante} {documento} {grado} {nivel} {anio} {matricula} {matricula_letras}
  // {pension} {pension_letras} {total} {total_letras} {folio} {fecha} {rector} {razon_social} {nit}
  function campos(i, m, cfg) {
    const k = calcFactura(i, cfg), g = legal(cfg), f = (m && m.firmas) || {};
    return {
      acudiente: i.acuNombre, cedula: i.acuCC, expedida: m && m.acuExpedida, direccion: [i.direccion, i.barrio].filter(Boolean).join(", "),
      telefono: i.acuTel, correo: (m && m.acuCorreo) || i.acuCorreo, estudiante: nombreEst(i), documento: (i.tipoDoc || "") + " " + (i.numDoc || ""),
      grado: i.grado, nivel: nivelDe(i.grado), anio: String(C.anio), matricula: pesos(k.matricula), matricula_letras: enLetras(k.matricula),
      pension: pesos(k.pension), pension_letras: enLetras(k.pension), total: pesos(k.total), total_letras: enLetras(k.total),
      folio: (m && m.folio) || "(se asigna al enviar)", fecha: hoyLargo(f.acudiente && f.acudiente.fecha),
      rector: g.rector || PC, razon_social: g.razonSocial || "COLEGIO GIMNASIO REAL DE LA SABANA", nit: g.nit || PC
    };
  }
  function textoConCampos(texto, i, m, cfg) {
    const v = campos(i, m, cfg);
    return esc(texto).replace(/\{(\w+)\}/g, (t, n) => n in v ? `<b>${L(v[n])}</b>` : t)
      .split(/\n\s*\n/).map(p => `<p class="legal">${p.replace(/\n/g, "<br>")}</p>`).join("");
  }
  function contrato(i, m, cfg) {
    const t = cfg.matricula.contratoTexto, f = (m && m.firmas) || {};
    if (!t) return "";
    return `<div class="hoja">
      ${encabezado(cfg, "CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS " + C.anio, "Anexo al folio de matrícula N.° " + esc((m && m.folio) || "—"))}
      ${textoConCampos(t, i, m, cfg)}
      <div class="firmas-doc">${firmaRectoria(cfg)}${firma(f.acudiente, "Acudiente / Contratante", "C.C. " + esc(i.acuCC))}</div>
    </div>`;
  }
  function pagare(i, m, cfg) {
    const t = cfg.matricula.pagareTexto, f = (m && m.firmas) || {};
    if (!t) return "";
    return `<div class="hoja">
      ${encabezado(cfg, "PAGARÉ Y CARTA DE INSTRUCCIONES", "Folio de matrícula N.° " + esc((m && m.folio) || "—"))}
      ${textoConCampos(t, i, m, cfg)}
      <div class="firmas-doc">${firma(f.acudiente, "Suscriptor (acudiente)", "C.C. " + esc(i.acuCC))}${firma(null, "Codeudor (si aplica)")}</div>
    </div>`;
  }

  // ---------- CARNÉ DIGITAL ----------
  function carne(c) {
    const url = location.href.replace(/[^/]*$/, "") + "carnet.html?id=" + encodeURIComponent(c.id);
    return `<div class="carne">
      <div class="carne-top"><img src="logo.jpeg" alt=""><div><b>GIMNASIO REAL<br>DE LA SABANA</b><small>Preescolar y Primaria · Madrid</small></div><span>${esc(c.ano)}</span></div>
      <div class="carne-cuerpo">
        ${c.photo ? `<img class="carne-foto" src="${esc(c.photo)}" alt="Foto">` : `<div class="carne-foto"></div>`}
        <div class="carne-datos">
          <div class="carne-nom">${esc(c.nombres)}<br>${esc(c.apellidos)}</div>
          <div><small>${esc(c.tipodoc)}</small> ${esc(c.numdoc)}</div>
          <div><small>Grado</small> ${esc(c.grado)}</div>
          <div><small>RH</small> ${esc(c.rh || "—")} · <small>EPS</small> ${esc(c.eps || "—")}</div>
          <div><small>Acudiente</small> ${esc(c.acudiente || "")}</div>
        </div>
      </div>
      <div class="carne-pie"><div><small>Carné</small> <b>${esc(c.id)}</b><br><small>Vigencia</small> <b>${esc(c.vigencia)}</b><br><small>Emergencia</small> ${esc(c.emergencia || "")}</div><div class="carne-qr" data-qr="${esc(url)}"></div></div>
      <div class="carne-estado ${c.status === "active" ? "ok" : ""}">${c.status === "active" ? "✔ ESTUDIANTE ACTIVO " + esc(c.ano) : "INACTIVO"}</div>
    </div>`;
  }
  function pintarQR(cont) {
    cont.querySelectorAll("[data-qr]").forEach(el => {
      el.innerHTML = "";
      if (window.QRCode) new QRCode(el, { text: el.dataset.qr, width: 92, height: 92, correctLevel: QRCode.CorrectLevel.M });
    });
  }

  window.DOCS = { factura, folio, contrato, pagare, carne, pintarQR, firmantes, anios };
})();
