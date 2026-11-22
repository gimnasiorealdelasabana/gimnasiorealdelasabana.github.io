// ============================================================
//  Documentos de matrícula — Colegio Gimnasio Real de la Sabana
//  Factura de matrícula, folio, contrato educativo por grado, carta de
//  compromiso familiar, pagaré con carta de instrucciones y carné digital.
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
  // La firma escaneada de rectoría se pone sola cuando la familia ya firmó el documento
  const familiaFirmo = m => !!(m && m.firmas && Object.keys(m.firmas).length);
  const imgRector = (cfg, m) => {
    const src = legal(cfg).firmaImg;
    return src && (/^data:image\/png;base64,/.test(src) || src === "firma-rector.png") && familiaFirmo(m) ? `<img src="${esc(src)}" alt="Firma rectoría">` : `<div style="height:52px"></div>`;
  };
  function firmaRectoria(cfg, m) {
    const g = legal(cfg);
    return `<div class="firma-doc">${imgRector(cfg, m)}<div class="linea"><b>${esc(g.rector || PC)}</b><br>${esc(g.cargoRector || "Rectoría")} — Gimnasio Real de la Sabana</div></div>`;
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
  // Responsable financiero: a su nombre va la factura y su firma es obligatoria.
  // Se guarda en m.factura.responsable = { k, nombre, cc, tel, correo }.
  const responsable = m => (m && m.factura && m.factura.responsable) || null;
  function datosDe(i, k) {
    if (k === "madre") return { cc: i.madreCC, tel: i.madreCel || i.madreTel, correo: i.madreCorreo };
    if (k === "padre") return { cc: i.padreCC, tel: i.padreCel || i.padreTel, correo: i.padreCorreo };
    return { cc: i.acuCC, tel: i.acuTel, correo: i.acuCorreo };
  }
  // Personas que pueden ser responsable financiero (padres y acudiente, sin repetir)
  function opcionesResponsable(i) {
    return firmantes(i).filter(f => f.k !== "estudiante").map(f => Object.assign({ k: f.k, rol: f.rol, nombre: f.nombre }, datosDe(i, f.k)));
  }
  function firmantes(i, m) {
    const r = [];
    if (anios(i.fechaNacimiento) >= 7) r.push({ k: "estudiante", rol: "Estudiante", nombre: nombreEst(i), doc: (i.tipoDoc || "") + " " + (i.numDoc || ""), req: false });
    r.push({ k: "acudiente", rol: "Acudiente (" + (i.acuParentesco || "") + ")", nombre: i.acuNombre, doc: "C.C. " + (i.acuCC || ""), req: true });
    const n = s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
    const d = s => String(s || "").replace(/\D/g, "");
    const mismo = (cc, nom) => (d(cc) && d(cc) === d(i.acuCC)) || (!d(cc) && n(nom) === n(i.acuNombre));
    if (i.madreNombre && !mismo(i.madreCC, i.madreNombre)) r.push({ k: "madre", rol: "Madre", nombre: i.madreNombre, doc: "C.C. " + (i.madreCC || ""), req: false });
    if (i.padreNombre && !mismo(i.padreCC, i.padreNombre)) r.push({ k: "padre", rol: "Padre", nombre: i.padreNombre, doc: "C.C. " + (i.padreCC || ""), req: false });
    const rf = responsable(m), x = rf && r.find(f => f.k === rf.k);
    if (x) { x.req = true; x.rol += " · Responsable financiero"; if (rf.cc) x.doc = "C.C. " + rf.cc; }
    return r;
  }

  // ---------- FACTURA DE MATRÍCULA (documento de cobro interno) ----------
  function factura(i, cfg, m, a) {
    const f = (m && m.factura) || {}, k = calcFactura(i, cfg, a), mt = cfg.matricula;
    const rf = responsable(m) || Object.assign({ nombre: i.acuNombre }, datosDe(i, "acudiente"));
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
      <h3>ADQUIRIENTE — RESPONSABLE FINANCIERO</h3>
      <table><tr><td><b>Nombre</b>${esc(rf.nombre)}</td><td><b>C.C.</b>${esc(rf.cc)}</td><td><b>Teléfono</b>${esc(rf.tel)}</td><td><b>Correo</b>${esc(rf.correo) || "—"}</td></tr>
        <tr><td colspan="2"><b>Dirección</b>${esc(i.direccion)} · ${esc(i.barrio)}</td><td colspan="2"><b>Estudiante</b>${esc(nombreEst(i))} · ${esc(i.tipoDoc)} ${esc(i.numDoc)}</td></tr></table>
      <h3>DETALLE</h3>
      <table class="fx-items"><tr class="th"><td>Descripción</td><td>Cant.</td><td class="num">Valor unitario</td><td class="num">Total</td></tr>
        ${k.items.map(x => `<tr><td>${esc(x.desc)}${x.det ? `<br><small>${esc(x.det)}</small>` : ""}</td><td>1</td><td class="num">${pesos(x.valor)}</td><td class="num">${pesos(x.valor)}</td></tr>`).join("")}
        <tr><td colspan="3" class="num">Subtotal</td><td class="num">${pesos(k.total)}</td></tr>
        <tr><td colspan="3" class="num">IVA (servicio educativo excluido, Art. 476 E.T.)</td><td class="num">$ 0</td></tr>
        <tr class="tot"><td colspan="3" class="num">TOTAL A PAGAR</td><td class="num">${pesos(k.total)}</td></tr></table>
      <p class="legal">Son: <b>${esc(enLetras(k.total).toLowerCase())}</b> m/cte.</p>
      <h3>PENSIONES ${C.anio}</h3>
      <p class="legal">Pensión mensual: <b>${k.pension ? pesos(k.pension) : PC}</b>. ${k.febreroAparte ? `<b>Por autorización de rectoría, la pensión de febrero no se incluye en esta factura</b>: se paga aparte dentro de los primeros ${k.diaPension || 5} días de febrero. Las` : "La pensión de febrero se paga con la matrícula; las"} de marzo a noviembre (${mesesRest} meses) se pagan ${k.diaPension ? `dentro de los primeros <b>${k.diaPension} días</b> de cada mes` : "en las fechas que indique el colegio"}.</p>
      <h3>MEDIOS DE PAGO</h3>
      <p class="legal">${esc(mt.mediosPago || PC)}</p>
      <p class="legal"><i>Documento de cobro interno del Colegio Gimnasio Real de la Sabana. No reemplaza la factura electrónica ante la DIAN.</i></p>
    </div>`;
  }

  // ---------- FOLIO DE MATRÍCULA ----------
  function folio(i, m, a, cfg) {
    const td = (t, v, cs) => `<td${cs ? ` colspan="${cs}"` : ""}><b>${t}</b>${esc(v) || "&nbsp;"}</td>`;
    const fs = firmantes(i, m), p = a && a.pago;
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
      <div class="firmas-doc">${fs.map(x => firma((m.firmas || {})[x.k], x.rol, x.doc)).join("")}${firmaRectoria(cfg, m)}</div>
    </div>`;
  }

  // ============================================================
  //  CONTRATO EDUCATIVO, CARTA DE COMPROMISO Y PAGARÉ 2027
  //  Textos de los documentos del Gimnasio (Downloads\Gimnasio real de la
  //  sabana\contratos y otros), con todos los espacios llenos desde la
  //  inscripción, el folio y la configuración. La familia solo firma.
  // ============================================================
  const B = v => `<b>${L(v)}</b>`;
  const numPal = n => enLetras(n).replace(/ (DE )?PESOS$/, "");          // 5 → CINCO
  const dosDig = n => String(n).padStart(2, "0");
  const valorLetras = n => `${enLetras(n)} MCTE (${pesos(n)})`;
  // Padres y/o acudientes que intervienen (sin el estudiante)
  const partes = (i, m) => firmantes(i, m).filter(f => f.k !== "estudiante");
  // Fecha de la firma: la del acudiente, o la de envío, o hoy
  function fFirma(m) { const f = (m && m.firmas) || {}; return (f.acudiente && f.acudiente.fecha) || (m && m.enviada) || new Date().toISOString(); }
  function enConstancia(m, lugar) {
    const d = new Date(fFirma(m));
    return `${lugar}, a los ${B(numPal(d.getDate()).toLowerCase() + " (" + d.getDate() + ")")} días del mes de ${B(d.toLocaleDateString("es-CO", { month: "long" }))} de ${B(d.getFullYear())}`;
  }
  function firmaRector(cfg, m) {
    const g = legal(cfg);
    return `<div class="firma-doc">${imgRector(cfg, m)}<div class="linea"><b>${esc(g.rector || PC)}</b><br>C.C. ${esc(g.ccRector || PC)}<br>${esc(g.cargoRector || "Rector")}<br>Colegio Gimnasio Real de la Sabana${g.telefono ? "<br>Cel. " + esc(g.telefono) : ""}${g.correo ? "<br>" + esc(g.correo) : ""}</div></div>`;
  }
  const firmasDe = (lista, m) => lista.map(x => firma(((m && m.firmas) || {})[x.k], x.rol, x.doc)).join("");
  const nombres = lista => lista.map(p => `${B(p.nombre)}`).join(" y ");
  const tituloGrado = g => GRS.PREESCOLAR.includes(g) ? "PARA GRADO " + g.toUpperCase() : "PARA GRADOS DE PRIMARIA — GRADO " + g.toUpperCase();

  function contrato(i, m, cfg) {
    m = m || {};
    const g = legal(cfg), mt = cfg.matricula, k = calcFactura(i, cfg), meses = GRS.MESES.length;
    const dia = Number(mt.diaPension) || 5, mora = Number(g.moraPct) || 10;
    const otros = GRS.cobrosPara(i.grado, cfg), vOtros = otros.reduce((s, o) => s + (Number(o.valor) || 0), 0);
    const ps = partes(i, m);
    const p = ps.map(x => `${B(x.nombre)}, mayor de edad, identificado(a) con ${esc(x.doc.replace("C.C.", "C.C. Número"))}`).join(" y ");
    const custodia = m.custodia ? (m.custodia === "Otro" ? "Otro: " + (m.custodiaOtro || "") : m.custodia) : "";
    return `<div class="hoja">
      ${encabezado(cfg, "CONTRATO DE SERVICIO PRIVADO EDUCATIVO — MATRÍCULA " + C.anio, tituloGrado(i.grado) + (m.folio ? " · Folio de matrícula N.° " + esc(m.folio) : ""))}
      <p class="legal">Entre, por una parte ${p}, en calidad de Padres y/o Acudientes del (a) beneficiario (a) estudiante ${B(nombreEst(i))}, identificado(a) con ${B(i.tipoDoc)} Número ${B(i.numDoc)}, matriculado(a) en el curso ${B(i.grado)}, y de la otra ${esc(g.razonSocial || "GIMNASIO REAL DE LA SABANA S.A.")}, representado legalmente por el señor ${esc(g.rector || PC)}, identificado como aparece al pie de su firma, quien obra como director y representante legal del establecimiento educativo de carácter privado, debidamente aprobado para los niveles de educación que ofrece, por medio de la presente celebramos de mutuo acuerdo el contrato de servicio privado educativo que se regirá por las siguientes cláusulas:</p>
      <p class="legal"><b>PRIMERA – DEFINICIÓN.</b> El presente contrato obedece a las disposiciones constitucionales establecidas en los Artículos 26, 27, 67, 68 y 70 de la Constitución Política, la Ley 115 de 1994, Decreto 1860 de 1994 y demás normas concordantes, para asegurar el Derecho a la Educación del Estudiante bajo una responsabilidad compartida en la Educación, donde concurren obligaciones de Educadores, Estudiantes y Padres de Familia, tendientes a hacer efectiva la prestación del Servicio Educativo en función social por parte de Colegios Privados. Obligaciones que son correlativas y esenciales para la consecución del objeto y de los fines comunes que para la educación se consideran DERECHO – DEBER. El incumplimiento de las obligaciones adquiridas por los contratantes hace imposible la consecución del fin común.</p>
      <p class="legal"><b>SEGUNDA – OBJETO.</b> Conseguir la recíproca complementación de esfuerzos entre Padres, Estudiantes y el Colegio, para obtener un rendimiento académico satisfactorio según el Plan de Estudios correspondiente a los grados aprobados por el MEN en orden a adquirir una educación íntegra, bajo la responsabilidad recíproca y la participación activa del (la) estudiante, teniendo como fin la formación del alumno, de tal forma que se favorezca el desarrollo de su personalidad, preservando siempre los valores éticos y morales que deben orientar su futuro como ciudadano.</p>
      <p class="legal"><b>TERCERA – OBLIGACIONES ESENCIALES DEL CONTRATO.</b> Por ser este contrato de cooperación educativa, tendiente al cumplimiento del fin común, en la educación del estudiante son obligaciones de la esencia del presente contrato:</p>
      <p class="legal"><b>A. OBLIGACIONES DEL COLEGIO "GIMNASIO REAL DE LA SABANA S.A."</b> Constituyen obligaciones del Colegio, inherentes al cumplimiento del presente pacto a favor del ESTUDIANTE y de los PADRES y/o ACUDIENTES, las de: 1. Prestar en forma regular el servicio educativo contratado y servicios complementarios dentro de las prescripciones legales y exigencias de las autoridades competentes; adicionalmente el Colegio debe cumplir con la normatividad pautada en la Constitución Nacional, así como lo establecido por el Ministerio de Educación Nacional de Colombia y en el Manual de Convivencia Institucional. 2. Informar a los padres cualquier dificultad importante concerniente al alumno. 3. Mantener el diálogo con las familias en lo relacionado con el seguimiento de los alumnos. 4. Velar por la existencia de un respeto mutuo entre todos los miembros de la comunidad escolar (directivos, docentes, administrativos y alumnos). 5. Certificar cuando le sea solicitado, sobre el cumplimiento académico del alumno, indicando grado aprobado. El colegio no se hace responsable del bajo rendimiento académico del estudiante cuando éste sea resultado del incumplimiento de los deberes pautados en los apartados B y C de la tercera cláusula del presente documento.</p>
      <p class="legal"><b>B. POR PARTE DE LOS PADRES O ACUDIENTES.</b> Serán tenidas como obligaciones esenciales de los RESPONSABLES LEGALES Y/O FINANCIEROS del (a) estudiante, las siguientes: 1. Ser los primeros educadores y orientadores para sus hijos. 2. Pagar los gastos de escolaridad, validados por la Secretaría de Educación (matrícula, pensión y demás costos escolares), dentro de los plazos establecidos. Deberán cancelarse así: ${esc(mt.mediosPago || PC)} 3. Cumplir puntualmente con los compromisos económicos adquiridos con el colegio en la firma de la Matrícula, cancelando la Matrícula anual y las pensiones mensuales dentro de los ${numPal(dia)} (${dosDig(dia)}) primeros días calendario de cada mes. 4. Leer con atención el Proyecto Educativo Institucional, el Manual de Convivencia y el Cronograma de Actividades educativas del colegio. 5. Asistir con responsabilidad y puntualidad a las reuniones periódicas de información, talleres de padres y citaciones de parte del área psicosocial. 6. Velar por el progreso del estudiante, estando en contacto permanente con el colegio y asistiendo a las jornadas de entrega de informes académicos. 7. Aceptar los errores cometidos por los niños, orientándolos y corrigiéndolos sin ningún tipo de maltrato físico, verbal o psicológico. 8. Proporcionar al estudiante el ambiente adecuado para su desarrollo integral; educar a su hijo en ambientes de afecto, solución pacífica de conflictos, autonomía y responsabilidad, preocupándose por su desarrollo moral e intelectual. 9. Velar por la seguridad y bienestar de los estudiantes, retirándolos del Colegio en el horario indicado y en caso de enfermedad. 10. Seguir los conductos regulares y dirigirse a la persona indicada con el debido respeto, claridad y objetividad cuando se vayan a hacer reclamos, observaciones o sugerencias respecto a cualquier situación relacionada con el colegio y/o su hijo. 11. Informar al colegio sobre situaciones que pudieran estar impidiendo el buen desempeño escolar del alumno (enfermedad, accidente, problemas familiares graves). 12. Comunicar por escrito con 30 días de anticipación el retiro del educando del Colegio. 13. Informar al colegio todo cambio de dirección y/o número telefónico. 14. Dar buen ejemplo con su conducta y vocabulario para que los niños lo puedan proyectar en la institución educativa. 15. Apoyar a la institución en la realización de sus proyectos. 16. Acatar e incentivar los protocolos de bioseguridad implementados por el colegio, el Ministerio de Educación y el Gobierno Nacional.</p>
      <p class="legal"><b>C. POR PARTE DEL ESTUDIANTE.</b> 1. Participar activamente de todos los procesos que programe el Colegio. 2. Conocer, analizar y cumplir lo convenido en el PEI y en el Manual de Convivencia con el propósito de hacer agradable y productiva la vida escolar. 3. Cumplir todas las normas y disposiciones académicas, disciplinarias y de comportamiento dentro y fuera de la institución. 4. Asistir al Colegio puntualmente, cumpliendo los horarios establecidos y las actividades correspondientes. 5. Tener y traer los materiales, textos, útiles e implementos debidamente marcados, para garantizar el desarrollo normal de las actividades académicas. 6. Responder por el desarrollo de las tareas, trabajos y actividades de cada una de las áreas, ya sea en forma individual, grupal o familiar según el objetivo de éstas. 7. En caso de quedar con desempeños pendientes, desarrollar o asistir a las actividades de recuperación y refuerzo programadas por el colegio, según corresponda. 8. Responsabilizarse de su rendimiento académico, cumpliendo con sus tareas, actividades y preparándose para las evaluaciones. 9. Tratar con respeto y tolerancia a sus compañeros y a las personas que integran la Comunidad Educativa. 10. Abstenerse de realizar alguna agresión de tipo física y/o verbal que afecte la integridad de sus compañeros (acoso escolar o bullying). 11. Aceptar y ejecutar las normas básicas de convivencia y disciplina. 12. Cuidar y hacer buen uso de los implementos y artículos prestos a su desarrollo académico y de recreación (computadores, pupitres, balones, etc.) y respetar las instalaciones del colegio. 13. Enaltecer con sus actitudes el buen nombre de la Institución.</p>
      <p class="legal"><b>CUARTA – DERECHOS.</b> DE LOS PADRES O ACUDIENTES Y DEL ESTUDIANTE: 1. Exigir la regular prestación de los Servicios Educativos Contratados, que éstos se ajusten a los programas oficiales y tengan el nivel académico prescrito por la Ley, desarrollando la capacidad crítica y analítica según el nivel y el grado demostrados en las evaluaciones que realicen las autoridades competentes. 2. Obtener información suficiente sobre los avances y resultados del proceso pedagógico del alumno. 3. Ser informado cuando el alumno no respeta el Manual de Convivencia u otras normas internas. 4. Elegir y ser elegidos como representantes de los padres en los consejos de curso, de conformidad con la reglamentación expedida para tal efecto por el Colegio. DEL COLEGIO: 1. Exigir el cumplimiento de este contrato, el Manual de Convivencia y demás normas internas del colegio. 2. Recomendar a los responsables legales la reorientación del alumno hacia otro tipo de escolaridad, cuando determine que al mismo se le dificulta el aprendizaje ofrecido por el colegio. 3. Abstenerse de renovar el presente contrato cuando el alumno no alcance los objetivos propuestos para el nivel correspondiente, o cancelarlo de manera unilateral cuando sobrevengan actos de indisciplina o incumplimiento reiterado del Manual de Convivencia. 4. Abstenerse de renovar el presente contrato, o de suscribir uno nuevo para el siguiente año escolar, cuando los Padres y/o responsables financieros no se encuentren a paz y salvo en el pago de las mensualidades de pensión, pues así se evidencia una ruptura en el compromiso de los Padres en cuanto al reglamento interno, este contrato y/o el Manual de Convivencia.</p>
      <p class="legal"><b>QUINTA – MANUAL DE CONVIVENCIA.</b> Al momento de firmar el presente documento, el Manual de Convivencia del COLEGIO GIMNASIO REAL DE LA SABANA se considera incorporado al presente contrato y, por tanto, aceptado en todas sus partes por los padres y/o acudientes y por el estudiante, quienes manifiestan conocerlo en su integridad.</p>
      <p class="legal"><b>SEXTA – DURACIÓN.</b> Este contrato tiene vigencia de un (1) año lectivo o académico, contado a partir del primero (1) de febrero hasta el treinta (30) de noviembre de ${C.anio}, pero su ejecución será sucesiva por periodos mensuales.</p>
      <p class="legal"><b>SÉPTIMA – COSTOS DEL CONTRATO.</b> Los costos educativos son aprobados por el Consejo Directivo del Colegio Gimnasio Real de la Sabana, en cumplimiento de la ${esc(g.resolucion || PC)}.
        El Padre de Familia o Acudiente del beneficiario se compromete al pago de una matrícula de ${B(valorLetras(k.matricula))}, que se cancela en la fecha de la firma del presente contrato.
        Al pago de una pensión anual de ${B(valorLetras(k.pension * meses))}, pagaderos en ${numPal(meses).toLowerCase()} (${meses}) cuotas anticipadas de ${B(valorLetras(k.pension))} cada una, dentro de los ${numPal(dia)} (${dosDig(dia)}) primeros días calendario de cada periodo mensual, como retribución y colaboración pecuniaria del financiamiento del objeto propuesto en la cláusula segunda.
        ${vOtros ? `Con la Matrícula se cancelará el pago de los demás costos educativos (${esc(otros.map(o => o.nombre).join("; "))}) por valor de ${B(valorLetras(vOtros))}, Decreto 2253 de 1995; igualmente por lo establecido en la Ley 115 de 1994, capítulo tercero, derechos académicos, artículos 201 y 202 y demás normas y decretos reglamentarios.` : ""}</p>
      <p class="legal"><b>OCTAVA – INCUMPLIMIENTO.</b> Incurrir en mora en el pago de las cuotas mensuales causará una sanción de recargo del ${mora}% sobre el valor de la pensión a partir del vencimiento del término de pago, es decir, a partir del día ${numPal(dia + 1).toLowerCase()} (${dosDig(dia + 1)}) y por cada uno de los meses acumulados. En caso de incumplimiento en el pago de la pensión de 2 o más meses, EL GIMNASIO SE RESERVA EL DERECHO DE ADMISIÓN para el siguiente año lectivo.</p>
      <p class="legal"><b>NOVENA – COBRANZA PREJURÍDICA Y JURÍDICA.</b> El "GIMNASIO REAL DE LA SABANA S.A." se reserva el derecho de contratar los servicios de alguna firma de cobranzas prejurídicas y jurídicas para hacer efectivo el pago de las obligaciones económicas aquí contraídas, cuando la morosidad sea de sesenta (60) días o superior a ella, siendo conscientes los suscritos padres y/o acudientes del estudiante de que esto les acarreará pagos de honorarios a favor de la persona contratada.</p>
      <p class="legal"><b>DÉCIMA – TERMINACIÓN DEL CONTRATO.</b> 1. Por expiración del término fijado, o sea el año escolar. 2. Por mutuo consentimiento de las partes. 3. Por fallecimiento del educando. 4. Por retraso en el pago de pensiones por dos o más meses. 5. Por suspensión de actividades del colegio por más de sesenta (60) días o por clausura definitiva del establecimiento. 6. Por las causas determinadas en el Manual de Convivencia.</p>
      <p class="legal"><b>NOTA:</b> En caso de separación, quien tiene la custodia es: ${B(custodia)}.</p>
      <p class="legal"><b>USO DE FOTOGRAFÍAS, IMÁGENES Y/O VIDEOS PARA PUBLICIDAD INSTITUCIONAL, REDES SOCIALES, CELEBRACIONES Y CÁMARAS DE SEGURIDAD Y VIGILANCIA DEL GIMNASIO REAL DE LA SABANA.</b> Con la firma del presente contrato: ${B(m.autorizaImagen === "SI" ? "SÍ AUTORIZAMOS" : m.autorizaImagen === "NO" ? "NO AUTORIZAMOS" : "")}${m.autorizaImagen === "NO" ? "" : ` y emitimos AUTORIZACIÓN EXPRESA E INEQUÍVOCA al GIMNASIO para usar, publicar, exponer, producir, distribuir reproducciones, fotografías, grabaciones en video o en audio en las que participe mi hijo (a). Esta autorización se entiende concedida para la utilización de la imagen del estudiante, siempre y cuando esté directa o indirectamente relacionada con alguna de las actividades en desarrollo del objeto social del GIMNASIO. De manera expresa manifiesto que no recibiré ningún pago monetario ni ningún otro trato especial a cambio del derecho que otorgo a utilizar dichas fotografías, de igual manera las que sean recopiladas por las cámaras de seguridad y vigilancia del Gimnasio`}.</p>
      <p class="legal"><b>TRATAMIENTO DE DATOS PERSONALES.</b> Autorizo con la firma de este documento al Gimnasio Real de la Sabana, de manera expresa y consciente, para que de conformidad con la Ley 1581 de 2012 y sus decretos reglamentarios trate, almacene y transmita nuestros datos personales, incluidos los de mi hijo (a), aquí consignados, en la carta de compromiso y demás documentos y bases de datos, con fines de recolección, análisis de información, sugerencias, desarrollo y ejecución administrativa educativa. Todos los datos se mantendrán protegidos según las políticas y procedimientos establecidos por el Gimnasio Real de la Sabana y se protegerán los datos sensibles de los menores de edad según lo estipulado en el Marco Legal.</p>
      <p class="legal"><b>ACEPTAMOS EL CONTRATO DE MATRÍCULA, EL MANUAL DE CONVIVENCIA, LA CARTA DE COMPROMISO Y DEMÁS LINEAMIENTOS DEL COLEGIO GIMNASIO REAL DE LA SABANA.</b></p>
      <p class="legal">En constancia se firma el presente contrato, una vez leído y aprobado en todas sus partes por quienes en él hemos intervenido, en el Municipio de ${enConstancia(m, "Madrid, Cundinamarca")}.</p>
      <div class="firmas-doc">${firmasDe(ps, m)}${firmaRector(cfg, m)}</div>
    </div>`;
  }

  function carta(i, m, cfg) {
    m = m || {};
    const ps = partes(i, m), est = firmantes(i, m).filter(f => f.k === "estudiante");
    return `<div class="hoja">
      ${encabezado(cfg, "CARTA DE COMPROMISO FAMILIAR " + C.anio, m.folio ? "Folio de matrícula N.° " + esc(m.folio) : "")}
      <p class="legal">El aceptar la permanencia de su hijo (a) en el Colegio supone asumir el compromiso conjunto de formar personas íntegras, responsables, respetuosas y con capacidades afectivas, espirituales e intelectuales que les permitan ser agentes competentes para la sociedad. Esto solo es posible con el trabajo vinculado de familia y Colegio. Estar en nuestra institución requiere de la aceptación de principios y valores recogidos en el PEI y el Manual de Convivencia, los cuales justifican nuestra tarea educativa, que se logra y fortalece solo con una actitud positiva de las familias, que no descarta el diálogo y la crítica constructiva, pero supone el acuerdo en lo fundamental y el respeto mutuo. Por lo cual es importante aclarar que:</p>
      <ul class="legal">
        <li>La comunicación familia – Colegio se realiza a través de la Plataforma Institucional, reuniones con padres, talleres, circulares, tareas y actividades académicas.</li>
        <li>El diálogo cercano con docentes se realiza mediante la Agenda virtual, temas diarios de la jornada académica. Se debe revisar y leer diariamente.</li>
        <li>Es deber de los acudientes revisar diariamente la plataforma para estar informados oportunamente de compromisos y situaciones de la vida escolar.</li>
        <li>Las fechas de las actividades generales del colegio quedan recogidas en el Cronograma Institucional, que se comparte a principio del nuevo año. La asistencia y acompañamiento de los padres o acudientes es un compromiso moral con la formación de sus propios hijos.</li>
        <li>Es importante utilizar las fuentes de información propias del colegio para la aclaración y búsqueda de soluciones ante las dificultades que se presenten. Esta tarea conjunta requiere también el conocimiento y aceptación de los acuerdos, derechos y deberes contenidos en el Contrato de Matrícula y en el Manual de Convivencia, documento de carácter legal que facilita unas relaciones "de vida" coherentes y asertivas propias del Colegio Gimnasio Real de la Sabana.</li>
      </ul>
      <p class="legal">A continuación, relacionamos algunos aspectos que ayudan a una mejor organización:</p>
      <p class="legal"><b>Puntualidad:</b> Es importante y necesaria la puntualidad a la hora de entrada al colegio, ya que la impuntualidad supone desorganización y perjuicio para todos; recordemos que debemos generar hábitos de responsabilidad y respeto. De igual forma, los estudiantes deben ser recogidos con puntualidad tanto al finalizar la jornada escolar como los que se encuentren inscritos en extracurriculares o en el servicio de guardería.<br>
      <b>Uniforme:</b> Es necesario que cada prenda del uniforme vaya marcada con nombre, apellido y curso; también es importante el buen estado y el aseo diario de las prendas.<br>
      <b>Útiles:</b> Proporcionar al estudiante los implementos necesarios de trabajo diario.<br>
      <b>Permisos:</b> Para entrar o salir del colegio en diferente horario, por cita médica o por algún asunto especial, debe informarse con antelación a la secretaría enviando el respectivo soporte si amerita; presentar el carné de acudientes y confirmar los datos personales y el parentesco con el menor de la persona encargada de recoger al estudiante.<br>
      <b>Ausentismos:</b> Justificar oportunamente y por escrito las ausencias y retardos de sus hijos. Si es por enfermedad, enviar incapacidad médica. Prestar la mayor colaboración para que ellos adelanten las actividades que se realizaron en las clases a las que no asistieron.<br>
      <b>Responsabilidad y autonomía:</b> Como estrategia para afianzar la formación de los estudiantes en estos valores, el Colegio no recibe dentro del horario escolar ningún implemento (materiales, trabajos, lonchera, etc.) que el alumno haya olvidado.<br>
      <b>Reuniones:</b> Presentarse al colegio en el día y hora acordados. En caso de no poder asistir por fuerza mayor, deben comunicarse con el Colegio para concertar una nueva cita. Tener en cuenta el horario previamente establecido por los docentes para la atención a Padres de Familia.<br>
      <b>Citaciones por Psicología:</b> El Colegio Gimnasio Real de la Sabana brinda apoyo psicológico buscando garantizar en los estudiantes un proceso escolar óptimo. Cada padre de familia o acudiente debe estar presto a acudir a la citación si es considerado por Psicología, ya que son el agente activo y cercano al menor. Al NO contar con el apoyo y acompañamiento del acudiente, el Colegio se verá en la obligación de hacer reporte a Bienestar Familiar y/o entidades competentes.</p>
      <p class="legal">Para la conservación de la Matrícula, tal como se explica en el Manual de Convivencia, es imprescindible tener actitudes de respeto y de buena educación con todos los integrantes de la Comunidad Educativa, pues lo contrario contradice la formación que ofrece el Colegio Gimnasio Real de la Sabana.</p>
      <p class="legal">La formalización del contrato de Matrícula con el Colegio afirma que se ha aceptado todo lo anteriormente expresado y que el Gimnasio Real de la Sabana considera básico para hacer posible su tarea educativa. Yo (nosotros) ${nombres(ps)}, Padres y/o Acudientes del (a) estudiante ${B(nombreEst(i))} del grado ${B(i.grado)}, ACEPTAMOS EL CONTRATO DE MATRÍCULA, EL MANUAL DE CONVIVENCIA, LA CARTA DE COMPROMISO Y LOS LINEAMIENTOS DEL COLEGIO GIMNASIO REAL DE LA SABANA, QUE NOS HAN DADO A CONOCER CON EL CONTRATO DE MATRÍCULA.</p>
      <p class="legal">En constancia firman en el Municipio de ${enConstancia(m, "Madrid, Cundinamarca")}.</p>
      <div class="firmas-doc">${firmasDe(est, m)}${firmasDe(ps, m)}</div>
    </div>`;
  }

  function pagare(i, m, cfg) {
    m = m || {};
    const g = legal(cfg), f = m.firmas || {};
    // Otorgantes: el responsable financiero, el acudiente y quienes firmen junto con ellos
    const ot = partes(i, m).filter(x => x.req || f[x.k]);
    const nit = esc(g.nit || PC);
    return `<div class="hoja">
      ${encabezado(cfg, "PAGARÉ EN BLANCO CON CARTA DE INSTRUCCIONES", "Garantía del contrato de matrícula " + C.anio + (m.folio ? " · Folio N.° " + esc(m.folio) : ""))}
      <p class="legal"><i>ESPACIO EN BLANCO</i></p>
      <p class="legal">Yo (Nosotros) ${ot.map(x => `${B(x.nombre)} (${esc(x.doc)})`).join(" y ")}, vecino(s) de ${B("Madrid, Cundinamarca")}, identificado(s) como aparece al pie de mi (nuestras) firma(s), por el presente título valor manifiesto (manifestamos) que pagaré (pagaremos) incondicionalmente al COLEGIO GIMNASIO REAL DE LA SABANA, identificado con NIT ${nit}, o a su orden, el día ____________ (_____) del mes de __________________ de ________ la suma de ______________________________________________________ ($_____________________). En caso de mora cancelaré (mos) intereses a la tasa máxima legal permitida sobre el valor de esta obligación.</p>
      <p class="legal">Se firma en el Municipio de ${enConstancia(m, "Madrid, Cundinamarca")}.</p>
      <p class="legal"><b>INSTRUCCIONES PARA EL DILIGENCIAMIENTO DEL PAGARÉ.</b> Los espacios en blanco dejados en el presente título valor podrán ser diligenciados por el GIMNASIO REAL DE LA SABANA para que, en ejercicio de las facultades conferidas en el artículo 622 del Código de Comercio y sin previo aviso, lo haga en la siguiente forma: 1. Los obligados seremos los otorgantes o suscriptores del documento. 2. La fecha de vencimiento será aquella que corresponda al día inmediatamente siguiente a aquel en que el pagaré sea diligenciado por el acreedor (a). 3. El valor o cuantía en pesos de este pagaré será el monto de la suma que conjunta o separadamente adeude (mos) por cualquier concepto, la cual comprenderá capital, intereses y gastos de cobranza en que haya incurrido el COLEGIO GIMNASIO REAL DE LA SABANA y cualquier otro concepto exigible a mi (nuestra) costa y que se llegue a deber a dicho acreedor (a) el día que sea diligenciado. 4. La tasa del interés moratorio será la máxima legal permitida conforme lo certifica la Superintendencia Financiera o la entidad que legalmente corresponda. 5. La fecha de otorgamiento será el día que el COLEGIO GIMNASIO REAL DE LA SABANA diligencie el presente pagaré.</p>
      <p class="legal"><b>MANIFESTACIONES DEL (LOS) OTORGANTE (S) Y AUTORIZACIONES AL ACREEDOR (A).</b> 1. La mora en el pago de una (1) o más cuotas mensuales de la obligación garantizada con el presente título valor dará lugar a la exigencia total de la misma sin necesidad de requerimiento alguno. 2. Me (nos) obligo (amos) a notificar de inmediato al COLEGIO GIMNASIO REAL DE LA SABANA cualquier cambio de domicilio. 3. Manifiesto (amos) que he (mos) recibido a entera satisfacción la copia del presente documento, contentivo del Pagaré, instrucciones para su diligenciamiento, manifestaciones y autorizaciones.</p>
      <div class="firmas-doc">${firmasDe(ot, m)}</div>
    </div>
    <div class="hoja salto">
      ${encabezado(cfg, "CARTA DE INSTRUCCIONES — PAGARÉ")}
      <p class="legal">Señores<br>GIMNASIO REAL DE LA SABANA<br>Madrid</p>
      <p class="legal">Yo (nosotros) ${nombres(ot)}, identificado(s) como aparece al pie de mi (nuestras) firma(s), obrando en mi propio nombre, por medio de la presente y de conformidad con lo establecido en el artículo 622 del Código de Comercio, me (nos) permito (mos) manifestar que autorizo (amos) de forma irrevocable al COLEGIO GIMNASIO REAL DE LA SABANA, establecimiento educativo con domicilio en la ciudad de Madrid, Cundinamarca, o a quien represente sus intereses o al tenedor legítimo de este instrumento, para diligenciar y llenar sin previo aviso los espacios en blanco en el presente título valor que he suscrito a su favor, conforme a las siguientes instrucciones:</p>
      <p class="legal">1) Los espacios en blanco del pagaré podrán ser diligenciados por el COLEGIO GIMNASIO REAL DE LA SABANA sin necesidad de requerimiento alguno, a partir de cualquiera de los siguientes eventos: a) Incumplimiento en el pago de dos o más cuotas de mensualidad académica o de cualquier otra clase de obligación existente con el COLEGIO GIMNASIO REAL DE LA SABANA. b) Incumplimiento de los compromisos adquiridos en el Acuerdo de voluntades, si llegase a ser firmado entre las partes. c) Cuando se presente algún tipo de situación que amerite la cancelación de matrícula y me (nos) encuentre (mos) en mora o con saldo pendiente de pago por cualquier concepto. d) Cuando por mi (nuestra) voluntad tome (mos) la decisión de retirar del COLEGIO GIMNASIO REAL DE LA SABANA a mi (nuestro) (s) hijo (s), sea durante el periodo académico ${C.anio}, antes de finalizar el año escolar, o al momento de no renovar el Contrato de Matrícula para el siguiente año o periodo académico. 2) El valor del Pagaré será igual al monto de las sumas que le adeude al COLEGIO GIMNASIO REAL DE LA SABANA, y las que resulten de la suma del capital, intereses, gastos, honorarios, costas judiciales o cualquier otro concepto que tenga el deber de pagar al COLEGIO GIMNASIO REAL DE LA SABANA. 3) El lugar de pago del Pagaré será la ciudad donde se efectúe el cobro. 4) La fecha de vencimiento será aquella que corresponda al día inmediatamente siguiente a aquel en que el pagaré sea diligenciado por EL COLEGIO GIMNASIO REAL DE LA SABANA, y serán exigibles inmediatamente todas las obligaciones en él contenidas a mi (nuestro) cargo, sin necesidad de que se me requiera judicial o extrajudicialmente en tal sentido. 5) Las presentes instrucciones las imparto de conformidad con lo dispuesto en el artículo 622, inciso 2, del Código de Comercio para todos los efectos allí previstos.</p>
      <p class="legal">En constancia de lo anterior, se firma en el Municipio de ${enConstancia(m, "Madrid, Cundinamarca")}.</p>
      <div class="firmas-doc">${firmasDe(ot, m)}</div>
      <p class="legal"><i>Con la firma del presente documento autoriza de manera libre y voluntaria al COLEGIO GIMNASIO REAL DE LA SABANA el tratamiento de los datos personales aquí recolectados. Sus datos personales serán tratados y protegidos según lo dispuesto por la normativa colombiana, Ley 1581 de 2012, y las políticas y procedimientos establecidos por el COLEGIO GIMNASIO REAL DE LA SABANA.</i></p>
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

  window.DOCS = { responsable, opcionesResponsable, factura, folio, contrato, carta, pagare, carne, pintarQR, firmantes, anios };
})();
