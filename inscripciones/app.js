// ============================================================
//  Capa de datos compartida (Firebase Firestore o modo demo local)
// ============================================================
(function () {
  const C = window.GRS_CONFIG;

  const GRADOS = ["Prejardín", "Jardín", "Transición",
    "Primero", "Segundo", "Tercero", "Cuarto", "Quinto"];

  const ESTADOS = {
    pendiente: { txt: "Pendiente de pago", cls: "st-pend" },
    guardado:  { txt: "Cupo guardado",     cls: "st-ok" },
    vencido:   { txt: "Plazo vencido",     cls: "st-venc" },
    liberado:  { txt: "Cupo liberado",     cls: "st-lib" },
    anulado:   { txt: "Anulada",           cls: "st-lib" }
  };

  const CONFIG_BASE = {
    abierto: true,
    valorNuevo: 55000,        // estudiantes nuevos
    valorContinuidad: 50000,  // estudiantes que ya estudian en el colegio
    diasPlazo: 8,
    fechaCierre: "",
    whatsappSecretaria: "",
    horario: "Lunes a viernes de 7:00 a.m. a 3:00 p.m.",
    lugarPago: "Secretaría del colegio",
    cupos: { "Prejardín": 15, "Jardín": 20, "Transición": 20,
      "Primero": 25, "Segundo": 25, "Tercero": 25, "Cuarto": 25, "Quinto": 25 },
    ocupados: {},
    matricula: null   // se completa abajo (MATRICULA_BASE)
  };

  // ---------- Matrícula 2027: todo editable en el panel → Configuración → Matrícula ----------
  // Valores iniciales tomados de los contratos educativos 2027 del Gimnasio
  // (Downloads\Gimnasio real de la sabana\contratos y otros).
  const MESES = ["Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre"];
  const VALORES_BASE = {
    "Prejardín": { matricula: 360000, pension: 360000 },
    "Jardín": { matricula: 358128, pension: 358128 },
    "Transición": { matricula: 355183, pension: 355183 }
  };
  ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"].forEach(g => VALORES_BASE[g] = { matricula: 299147, pension: 299147 });
  const MATRICULA_BASE = {
    abierta: false,                 // se activa en el panel cuando las reglas de Firebase estén publicadas
    valores: VALORES_BASE,          // { grado: { matricula, pension } }
    // [{ nombre, valor, periodicidad, aplica: "todos"|"preescolar"|"primaria"|<grado> }]
    otrosCobros: [{ nombre: "Otros costos educativos: plataforma, guías, libro, ABC, carné, seguro estudiantil y escuela de padres", valor: 570450, periodicidad: "Anual", aplica: "todos" }],
    fechaLimite: "",                // fecha máxima para pagar y matricular
    mediosPago: "Pago virtual a la cuenta corriente del Banco Caja Social N.° 21003894458, o en cualquiera de los corresponsales autorizados con el convenio N.° 15758743, a nombre de Gimnasio Real de la Sabana.",
    diaPension: 5,                  // la pensión se paga dentro de los primeros N días de cada mes
    // Lista sugerida, se edita en el panel
    documentos: [
      { titulo: "Registro civil de nacimiento del estudiante", para: "todos" },
      { titulo: "Documento de identidad del acudiente", para: "todos" },
      { titulo: "Certificado de afiliación a EPS", para: "todos" },
      { titulo: "Carné de vacunas", para: "todos" },
      { titulo: "Certificado del grado anterior", para: "nuevo" }
    ],
    // Datos legales de los contratos 2027 del Gimnasio
    legal: { razonSocial: "GIMNASIO REAL DE LA SABANA S.A.", nit: "900.757.003-6",
      resolucion: "Resolución N.° 020309 del 31 de julio de 2026 del MEN",
      rector: "DESIDERIO PERDOMO ÁVILA", ccRector: "3.150.943 de Ricaurte", cargoRector: "Rector y Representante Legal",
      direccion: "Carrera 6 No. 5-05, Centro, Madrid, Cundinamarca", telefono: "300 215 3138", correo: "g.realdelasabana@gmail.com",
      moraPct: 10 }
  };
  CONFIG_BASE.matricula = MATRICULA_BASE;
  const PREESCOLAR = ["Prejardín", "Jardín", "Transición"];
  function nivelDe(g) { return PREESCOLAR.includes(g) ? "Preescolar" : "Básica Primaria"; }

  // ---------- utilidades ----------
  const ALFA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function genCodigo() {
    const a = crypto.getRandomValues(new Uint8Array(8));
    let s = "";
    for (const b of a) s += ALFA[b % 32];
    return "RS" + String(C.anio).slice(2) + "-" + s.slice(0, 4) + "-" + s.slice(4);
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function pesos(n) {
    return "$ " + Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  }
  function fecha(iso, conHora) {
    if (!iso) return "—";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00" : iso);
    const o = { day: "2-digit", month: "short", year: "numeric" };
    if (conHora) { o.hour = "2-digit"; o.minute = "2-digit"; }
    return d.toLocaleString("es-CO", o);
  }
  function hoyISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function edad(fn) {
    if (!fn) return "";
    const n = new Date(fn + "T00:00:00"), h = new Date();
    let a = h.getFullYear() - n.getFullYear();
    let m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) { a--; m += 12; }
    if (h.getDate() < n.getDate()) m = (m + 11) % 12;
    return a + " años" + (m ? " " + m + (m === 1 ? " mes" : " meses") : "");
  }
  function nombreEst(i) {
    return [i.nombre1, i.nombre2, i.apellido1, i.apellido2].filter(Boolean).join(" ");
  }
  function estadoReal(i) {
    if (i.estado === "pendiente" && i.venceEl && new Date() > new Date(i.venceEl)) return "vencido";
    return i.estado;
  }
  // Valor de la inscripción según el tipo de estudiante
  function valorPara(tipo, cfg) {
    return Number(tipo === "continuidad" ? cfg.valorContinuidad : cfg.valorNuevo) || 0;
  }
  const TIPOS = { nuevo: "Estudiante nuevo", continuidad: "Continuidad (ya estudia en el colegio)" };

  // Reduce la foto a 300×400 px en JPEG (~25 KB) para guardarla dentro de la inscripción
  function fotoReducida(file) {
    return new Promise((ok, fail) => {
      if (!file || !/^image\//.test(file.type)) return fail(new Error("El archivo no es una imagen"));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const W = 300, H = 400, c = document.createElement("canvas");
        c.width = W; c.height = H;
        // recorte centrado tipo foto documento (3:4)
        const r = Math.max(W / img.width, H / img.height);
        const w = img.width * r, h = img.height * r;
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
        g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }
  function telWa(t) {
    let d = String(t || "").replace(/\D/g, "");
    if (d.length === 10) d = "57" + d;
    return d;
  }
  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error("No cargó " + src));
      document.head.appendChild(s);
    });
  }

  // ---------- almacenamiento ----------
  let fs = null, auth = null;
  const LK = "grs" + C.anio + "_" + (window.GRS_DEMO ? "demo_" : "");
  const local = {
    all() { try { return JSON.parse(localStorage.getItem(LK + "insc") || "{}"); } catch (e) { return {}; } },
    put(map) { localStorage.setItem(LK + "insc", JSON.stringify(map)); }
  };
  // Modo demo: cada colección es un objeto { id: datos } en el navegador
  const coleccion = {
    all(c) { try { return JSON.parse(localStorage.getItem(LK + "col_" + c) || "{}"); } catch (e) { return {}; } },
    put(c, m) {
      try { localStorage.setItem(LK + "col_" + c, JSON.stringify(m)); }
      catch (e) { throw new Error("El navegador se quedó sin espacio para la prueba (modo demo). Use archivos más livianos."); }
    }
  };
  // Firestore no acepta "undefined"
  function limpio(o) {
    const r = {};
    Object.entries(o).forEach(([k, v]) => { if (v !== undefined) r[k] = v; });
    return r;
  }

  const Store = {
    modo: "local",

    async init() {
      if (C.firebase && C.firebase.apiKey) {
        const v = "10.12.2", base = "https://www.gstatic.com/firebasejs/" + v + "/";
        await loadScript(base + "firebase-app-compat.js");
        await Promise.all([loadScript(base + "firebase-firestore-compat.js"),
          loadScript(base + "firebase-auth-compat.js")]);
        firebase.initializeApp(C.firebase);
        fs = firebase.firestore();
        auth = firebase.auth();
        this.modo = "firebase";
      }
    },

    async getConfig() {
      let c = {};
      if (fs) {
        const d = await fs.collection("config").doc("inscripciones" + C.anio).get();
        if (d.exists) c = d.data();
      } else {
        try { c = JSON.parse(localStorage.getItem(LK + "config") || "{}"); } catch (e) {}
      }
      const r = Object.assign({}, CONFIG_BASE, c);
      r.cupos = Object.assign({}, CONFIG_BASE.cupos, c.cupos || {});
      r.ocupados = Object.assign({}, c.ocupados || {});
      const m = c.matricula || {};
      r.matricula = Object.assign({}, MATRICULA_BASE, m);
      r.matricula.valores = {};
      GRADOS.forEach(g => r.matricula.valores[g] = Object.assign({}, VALORES_BASE[g], (m.valores || {})[g] || {}));
      r.matricula.legal = Object.assign({}, MATRICULA_BASE.legal, m.legal || {});
      r.matricula.otrosCobros = Array.isArray(m.otrosCobros) ? m.otrosCobros : MATRICULA_BASE.otrosCobros;
      r.matricula.documentos = Array.isArray(m.documentos) ? m.documentos : MATRICULA_BASE.documentos;
      return r;
    },

    // ---- documentos genéricos (matrícula, soportes, carnés, cartera) ----
    // Cada colección vive aparte para no inflar la inscripción (límite 1 MB por documento).
    async doc(col, id) {
      if (fs) { const d = await fs.collection(col).doc(id).get(); return d.exists ? d.data() : null; }
      return coleccion.all(col)[id] || null;
    },
    async poner(col, id, data) {
      data = limpio(data);
      if (fs) return fs.collection(col).doc(id).set(data);
      const m = coleccion.all(col); m[id] = data; coleccion.put(col, m);
    },
    // Reemplaza solo los campos de primer nivel que se envían (los demás se conservan)
    async campos(col, id, patch) {
      patch = limpio(patch);
      if (fs) return fs.collection(col).doc(id).set(patch, { mergeFields: Object.keys(patch) });
      const m = coleccion.all(col); m[id] = Object.assign(m[id] || {}, patch);
      Object.keys(patch).forEach(k => { if (patch[k] === null) delete m[id][k]; });
      coleccion.put(col, m);
    },
    async todos(col) {
      if (fs) { const q = await fs.collection(col).where("anio", "==", C.anio).get(); return q.docs.map(d => d.data()); }
      return Object.values(coleccion.all(col));
    },
    // Consecutivo seguro (factura, folio, carné): devuelve el siguiente número
    async siguiente(nombre) {
      if (fs) {
        const ref = fs.collection("contadores").doc(nombre);
        return fs.runTransaction(async t => {
          const d = await t.get(ref), n = (d.exists ? Number(d.data().n) || 0 : 0) + 1;
          t.set(ref, { n });
          return n;
        });
      }
      const m = coleccion.all("contadores"), n = ((m[nombre] && m[nombre].n) || 0) + 1;
      m[nombre] = { n }; coleccion.put("contadores", m); return n;
    },

    async saveConfig(cfg) {
      if (fs) await fs.collection("config").doc("inscripciones" + C.anio).set(cfg);
      else localStorage.setItem(LK + "config", JSON.stringify(cfg));
    },

    async crear(data, cfg) {
      const codigo = genCodigo();
      const ahora = new Date();
      let vence = new Date(ahora.getTime() + (Number(cfg.diasPlazo) || 8) * 864e5);
      vence.setHours(23, 59, 0, 0);
      if (cfg.fechaCierre) {
        const fc = new Date(cfg.fechaCierre + "T23:59:00");
        if (fc < vence) vence = fc;
      }
      const doc = Object.assign({}, data, {
        codigo, anio: C.anio, estado: "pendiente",
        creado: ahora.toISOString(), venceEl: vence.toISOString(),
        valorInscripcion: valorPara(data.tipoEstudiante, cfg)
      });
      if (fs) await fs.collection("inscripciones").doc(codigo).set(doc);
      else { const m = local.all(); m[codigo] = doc; local.put(m); }
      return doc;
    },

    async obtener(codigo) {
      codigo = String(codigo || "").trim().toUpperCase();
      if (!codigo) return null;
      if (fs) {
        const d = await fs.collection("inscripciones").doc(codigo).get();
        return d.exists ? d.data() : null;
      }
      return local.all()[codigo] || null;
    },

    async listar() {
      if (fs) {
        const q = await fs.collection("inscripciones").where("anio", "==", C.anio).get();
        return q.docs.map(d => d.data());
      }
      return Object.values(local.all());
    },

    async actualizar(codigo, patch) {
      patch.modificado = new Date().toISOString();
      if (fs) await fs.collection("inscripciones").doc(codigo).update(patch);
      else {
        const m = local.all();
        if (!m[codigo]) throw new Error("No existe " + codigo);
        Object.assign(m[codigo], patch); local.put(m);
      }
    },

    // Recalcula los cupos ocupados (público) a partir de las inscripciones con pago
    async recalcularOcupados(lista) {
      const cfg = await this.getConfig();
      const oc = {};
      lista.forEach(i => { if (i.estado === "guardado") oc[i.grado] = (oc[i.grado] || 0) + 1; });
      cfg.ocupados = oc;
      await this.saveConfig(cfg);
      return cfg;
    },

    // ---- sesión de administración ----
    onAuth(cb) {
      if (auth) auth.onAuthStateChanged(u => cb(u ? (u.email || "admin") : null));
      else cb(sessionStorage.getItem(LK + "admin"));
    },
    async login(usuario, clave) {
      if (auth) { await auth.signInWithEmailAndPassword(usuario, clave); return; }
      if (clave !== C.pinDemo) throw new Error("PIN incorrecto");
      sessionStorage.setItem(LK + "admin", usuario || "admin");
    },
    async logout() {
      if (auth) await auth.signOut();
      sessionStorage.removeItem(LK + "admin");
    },
    usuario() {
      return (auth && auth.currentUser && auth.currentUser.email) || sessionStorage.getItem(LK + "admin") || "admin";
    }
  };

  // ---------- matrícula: factura, pagos, archivos ----------
  // Otros cobros que aplican a un grado
  function cobrosPara(grado, cfg) {
    return (cfg.matricula.otrosCobros || []).filter(o => Number(o.valor) > 0 && (
      !o.aplica || o.aplica === "todos" || o.aplica === grado ||
      (o.aplica === "preescolar" && PREESCOLAR.includes(grado)) || (o.aplica === "primaria" && !PREESCOLAR.includes(grado))));
  }
  // Factura de matrícula: matrícula + otros cobros + pensión de febrero
  function calcFactura(i, cfg) {
    const mt = cfg.matricula, v = mt.valores[i.grado] || { matricula: 0, pension: 0 };
    const matricula = Number(v.matricula) || 0, pension = Number(v.pension) || 0;
    const items = [{ desc: "Matrícula " + C.anio, det: "Grado " + i.grado + " · " + nivelDe(i.grado), valor: matricula }];
    cobrosPara(i.grado, cfg).forEach(o => items.push({ desc: o.nombre, det: o.periodicidad || "", valor: Number(o.valor) || 0 }));
    if (pension) items.push({ desc: "Pensión de febrero " + C.anio, det: "Se paga junto con la matrícula", valor: pension });
    const total = items.reduce((s, x) => s + x.valor, 0);
    return { items, matricula, pension, total, listo: matricula > 0, fechaLimite: mt.fechaLimite, diaPension: Number(mt.diaPension) || 0 };
  }
  // Estado del pago de matrícula según lo reportado por la familia (m) y lo decidido por el colegio (a)
  function estadoPagoMat(m, a) {
    const p = a && a.pago, r = m && m.pagoReportado;
    if (p && p.estado === "aprobado") return "aprobado";
    if (r) return p && p.estado === "rechazado" && p.reporte === r.enviado ? "rechazado" : "revision";
    return "ninguno";
  }
  // Estado del folio de matrícula
  function estadoFolio(m, a) {
    if (a && a.confirmada) return "confirmada";
    if (!m || !m.enviada) return "pendiente";
    if (a && a.correccion && a.correccion.enviada === m.enviada) return "correccion";
    return "enviada";
  }
  // Número a letras (pesos colombianos)
  function enLetras(n) {
    n = Math.round(Number(n) || 0);
    if (n === 0) return "CERO PESOS";
    const U = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
    const D = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const CEN = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
    const tres = x => {
      if (x === 100) return "CIEN";
      const c = Math.floor(x / 100), r = x % 100;
      const dd = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " Y " + U[r % 10] : "");
      return [CEN[c], dd].filter(Boolean).join(" ");
    };
    const mill = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
    const p = [];
    if (mill) p.push(mill === 1 ? "UN MILLÓN" : tres(mill).replace(/UNO$/, "UN") + " MILLONES");
    if (miles) p.push(miles === 1 ? "MIL" : tres(miles).replace(/UNO$/, "UN") + " MIL");
    if (resto) p.push(tres(resto));
    return p.join(" ") + ((!miles && !resto && mill) ? " DE PESOS" : " PESOS");
  }
  // Documentos y soportes: imágenes a JPEG ≤1400 px; PDF tal cual si pesa ≤ 700 KB
  // (cada archivo se guarda en su propio documento de Firestore, máximo 1 MB)
  function archivoReducido(file) {
    return new Promise((ok, fail) => {
      if (!file) return fail(new Error("Sin archivo"));
      if (file.type === "application/pdf") {
        if (file.size > 700 * 1024) return fail(new Error("El PDF pesa más de 700 KB. Tómele una foto al documento o redúzcalo."));
        const fr = new FileReader(); fr.onload = () => ok({ data: fr.result, tipo: "pdf", nombre: file.name }); fr.onerror = () => fail(new Error("No se pudo leer el PDF")); fr.readAsDataURL(file); return;
      }
      if (!/^image\//.test(file.type)) return fail(new Error("Use una foto (JPG/PNG) o un PDF."));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        let M = 1400, q = 0.72, data;
        for (let k = 0; k < 4; k++) {   // baja tamaño/calidad hasta que quepa
          const r = Math.min(1, M / Math.max(img.width, img.height));
          const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          data = c.toDataURL("image/jpeg", q);
          if (data.length < 900000) break;
          M = Math.round(M * 0.75); q = Math.max(0.5, q - 0.08);
        }
        URL.revokeObjectURL(url); ok({ data, tipo: "img", nombre: file.name });
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }
  // Abre un archivo guardado (data:…) en otra pestaña
  function verArchivo(a) {
    if (!a || !a.data) { alert("No se encontró el archivo."); return; }
    if (!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(a.data)) return;
    const w = window.open("", "_blank");
    if (!w) { alert("Permita ventanas emergentes para ver el documento."); return; }
    w.document.write(a.tipo === "pdf"
      ? `<title>${esc(a.nombre || "Documento")}</title><iframe src="${a.data}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`
      : `<title>${esc(a.nombre || "Documento")}</title><body style="margin:0;background:#333"><img src="${a.data}" style="max-width:100%;display:block;margin:auto"></body>`);
  }
  function hoyLargo(iso) {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  }
  // Sufijo para conservar el modo demo en los enlaces
  const DEMO_Q = window.GRS_DEMO ? "&demo" : "";

  // Solo se muestran fotos guardadas como imagen embebida (data:image/…)
  function fotoSrc(i) {
    return typeof i.foto === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(i.foto) ? i.foto : "";
  }

  // ---------- hoja imprimible (formato del formulario en papel) ----------
  function hoja(i) {
    const e = esc, st = ESTADOS[estadoReal(i)] || ESTADOS.pendiente;
    const td = (t, v, cs) => `<td${cs ? ` colspan="${cs}"` : ""}><b>${t}</b>${e(v) || "&nbsp;"}</td>`;
    const pago = i.pago ? `Recibo No. ${e(i.pago.recibo)} · ${pesos(i.pago.valor)} · ${fecha(i.pago.fecha)}` : "Sin pago registrado";
    return `<div class="hoja">
      <div class="enc"><img src="logo.jpeg" alt="">
        <div><h1>FORMULARIO DE INSCRIPCIÓN ${C.anio}</h1><p>${e(C.colegio).toUpperCase()} · ${e(C.ciudad)}</p></div>
        <div class="estado-imp"><b>Código: ${e(i.codigo)}</b><br>Estado: <b>${st.txt}</b><br>${pago}<br>Diligenciado: ${fecha(i.creado, true)}</div>
        ${fotoSrc(i) ? `<img class="foto-imp" src="${e(fotoSrc(i))}" alt="Foto">` : `<div class="foto-imp">FOTO</div>`}
      </div>
      <p class="legal">Apreciados Padres de Familia: para nuestra Institución es muy gratificante ser elegidos como educadores y formadores de su(s) hijo(a). Por favor tener en cuenta las fechas de Matrícula para evitar que su cupo sea asignado a otro Estudiante.</p>
      <h3>DATOS DEL ESTUDIANTE</h3>
      <table>
        <tr>${td("1er. Nombre", i.nombre1)}${td("2do. Nombre", i.nombre2)}${td("1er. Apellido", i.apellido1)}${td("2do. Apellido", i.apellido2)}</tr>
        <tr>${td("Documento", (i.tipoDoc || "") + " " + (i.numDoc || ""))}${td("Expedido en", i.expedidoEn)}${td("Nacionalidad", i.nacionalidad)}${td("Lugar de nacimiento", i.lugarNacimiento)}</tr>
        <tr>${td("Fecha de nacimiento", i.fechaNacimiento)}${td("Edad", i.edad)}${td("EPS", i.eps)}${td("RH / Sisbén", (i.rh || "") + " / " + (i.sisben || ""))}</tr>
        <tr>${td("Dirección", i.direccion, 2)}${td("Torre/bloque · Casa/Apto", [i.torre, i.apto].filter(Boolean).join(" · "))}${td("Conjunto", i.conjunto)}</tr>
        <tr>${td("Barrio", i.barrio)}${td("Estrato", i.estrato)}${td("Institución anterior", i.institucionAnterior)}${td("Grado al que ingresa", i.grado)}</tr>
        <tr>${td("Tipo de estudiante", TIPOS[i.tipoEstudiante] || "", 2)}${td("Valor inscripción", i.valorInscripcion ? pesos(i.valorInscripcion) : "", 2)}</tr>
        <tr>${td("Alergias", i.alergias, 2)}${td("Enfermedades", i.enfermedades, 2)}</tr>
        <tr>${td("Cuidados especiales", i.cuidados, 2)}${td("Rechazo algún alimento", i.rechazoAlimento, 2)}</tr>
        <tr>${td("El estudiante vive con", i.viveCon + (i.viveConOtro ? ": " + i.viveConOtro : ""), 4)}</tr>
      </table>
      <h3>DATOS DE LOS PADRES</h3>
      <table>
        <tr>${td("Nombre de la madre", i.madreNombre, 2)}${td("Nombre del padre", i.padreNombre, 2)}</tr>
        <tr>${td("C.C. No.", i.madreCC)}${td("Celular", i.madreCel)}${td("C.C. No.", i.padreCC)}${td("Celular", i.padreCel)}</tr>
        <tr>${td("Dirección", i.madreDir)}${td("Correo", i.madreCorreo)}${td("Dirección", i.padreDir)}${td("Correo", i.padreCorreo)}</tr>
        <tr>${td("Lugar de trabajo", i.madreTrabajo)}${td("Teléfono", i.madreTel)}${td("Lugar de trabajo", i.padreTrabajo)}${td("Teléfono", i.padreTel)}</tr>
      </table>
      <h3>ACUDIENTE Y EMERGENCIA</h3>
      <table>
        <tr>${td("Acudiente", i.acuNombre)}${td("C.C.", i.acuCC)}${td("Teléfono", i.acuTel)}${td("Parentesco", i.acuParentesco)}</tr>
        <tr>${td("En caso de emergencia llamar a", i.emeNombre, 2)}${td("Teléfono", i.emeTel)}${td("Correo acudiente", i.acuCorreo)}</tr>
      </table>
      <p class="legal"><b>Aceptamos</b> el Proyecto Educativo Institucional PEI, el Manual de Convivencia, el sistema de Matrícula, pensión y las normas establecidas en la Ley General de Educación.
      Diligenciando el presente documento <b>autorizamos</b> al ${e(C.colegio).toUpperCase()} de manera expresa y consciente para que, de conformidad con la Ley 1581 de 2012 y sus decretos reglamentarios, trate, almacene y transmita los datos aquí consignados con fines de recolección, análisis de información, sugerencias, desarrollo y ejecución administrativa – educativa.
      <i>Todos sus datos se mantendrán protegidos según las políticas y procedimientos establecidos por el ${e(C.colegio).toUpperCase()} y se protegerán los datos sensibles de los menores de edad según lo estipulado en el Marco Legal.</i><br>
      Aceptado en línea por <b>${e(i.firmaNombre)}</b> (${e(i.firmaParentesco)}) el ${fecha(i.creado, true)}.</p>
      <div class="firmas"><div>ESTUDIANTE</div><div>MADRE / PADRE</div><div>ACUDIENTE</div><div>RECTORA</div></div>
    </div>`;
  }
  function imprimir(html) {
    let z = document.getElementById("imprimir");
    if (!z) { z = document.createElement("div"); z.id = "imprimir"; document.body.appendChild(z); }
    z.innerHTML = html;
    const img = z.querySelector("img");
    if (img && !img.complete) img.onload = () => window.print(); else window.print();
  }

  window.GRS = { C, GRADOS, ESTADOS, Store, esc, pesos, fecha, edad, nombreEst, estadoReal, telWa, hoja, imprimir, hoyISO, valorPara, TIPOS, fotoReducida, fotoSrc,
    MESES, PREESCOLAR, nivelDe, cobrosPara, calcFactura, estadoPagoMat, estadoFolio, enLetras, archivoReducido, verArchivo, hoyLargo, DEMO_Q };
})();
