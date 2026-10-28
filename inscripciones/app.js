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
    ocupados: {}
  };

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
  const LK = "grs" + C.anio + "_";
  const local = {
    all() { try { return JSON.parse(localStorage.getItem(LK + "insc") || "{}"); } catch (e) { return {}; } },
    put(map) { localStorage.setItem(LK + "insc", JSON.stringify(map)); }
  };

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
      return r;
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
    }
  };

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

  window.GRS = { C, GRADOS, ESTADOS, Store, esc, pesos, fecha, edad, nombreEst, estadoReal, telWa, hoja, imprimir, hoyISO, valorPara, TIPOS, fotoReducida, fotoSrc };
})();
