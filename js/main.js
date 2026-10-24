// Colegio Gimnasio Real de la Sabana — comportamiento del sitio
(function () {
  "use strict";
  var C = window.GRS_SITE || {};
  var root = document.documentElement;
  root.classList.add("js");

  function wa(msg) { return "https://wa.me/" + C.WHATSAPP + "?text=" + encodeURIComponent(msg); }

  // ---- Enlaces centralizados (config.js) ----
  // Si el formulario aún vive solo en el computador (localhost) y el sitio ya está en
  // internet, "Inscripciones 2027" lleva a WhatsApp para no mostrar un enlace roto.
  var local = /^(localhost|127\.|192\.168\.)/.test(location.hostname);
  var inscripciones = (/localhost|127\.0\.0\.1/.test(C.URL_INSCRIPCIONES || "") && !local) || !C.URL_INSCRIPCIONES
    ? wa(C.MENSAJE_INSCRIPCION) : C.URL_INSCRIPCIONES;
  C.URL_INSCRIPCIONES = inscripciones;
  var links = {
    inscripciones: inscripciones,
    visita: wa(C.MENSAJE_VISITA),
    whatsapp: wa(C.MENSAJE_GENERAL)
  };
  document.querySelectorAll("[data-link]").forEach(function (a) {
    var url = links[a.dataset.link];
    if (!url) return;
    a.href = url;
    if (a.dataset.link === "inscripciones") { a.target = "_blank"; a.rel = "noopener"; }
  });
  document.querySelectorAll('[data-text="whatsapp-visible"]').forEach(function (el) { el.textContent = C.WHATSAPP_VISIBLE; });
  // ---- Redes sociales (vacías = "Próximamente") ----
  var toast = document.getElementById("toast"), toastT;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }
  document.querySelectorAll("[data-red]").forEach(function (a) {
    var url = (C.REDES || {})[a.dataset.red];
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
    else a.addEventListener("click", function (e) { e.preventDefault(); showToast("Muy pronto en " + a.getAttribute("aria-label") + " 🎉"); });
  });

  // ---- Menú móvil ----
  var burger = document.getElementById("burger"), nav = document.getElementById("nav");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  burger.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  // ---- Sombra del encabezado al bajar ----
  var bar = document.getElementById("topbar");
  function onScroll() { bar.classList.toggle("is-scrolled", window.scrollY > 10); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // ---- Pestañas de niveles ----
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
    });
    t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        selectTab(tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]);
      }
    });
  });

  // ---- Video: carga YouTube solo cuando el visitante oprime reproducir ----
  document.querySelectorAll("[data-video]").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + b.dataset.video + "?autoplay=1&rel=0&start=" + (b.dataset.start || 0);
      f.title = b.getAttribute("aria-label");
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      b.replaceWith(f);
    });
  });

  // ---- Noticias (data/noticias.js) ----
  var grid = document.getElementById("news-grid");
  var meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function fecha(iso) { var p = iso.split("-"); return +p[2] + " de " + meses[+p[1] - 1] + " de " + p[0]; }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  var items = (window.GRS_NOTICIAS || []).slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }).slice(0, 6);
  grid.innerHTML = items.map(function (n) {
    var tipo = (n.tipo || "noticia").toLowerCase();
    var link = n.enlace === "inscripciones" ? C.URL_INSCRIPCIONES : n.enlace;
    return '<article class="post reveal">' +
      (n.imagen ? '<img src="' + esc(n.imagen) + '" alt="' + esc(n.alt || "Imagen ilustrativa") + '" loading="lazy" width="1200" height="800">' : "") +
      '<div class="post__body"><span class="post__tag post__tag--' + esc(tipo) + '">' + esc(n.tipo || "Noticia") + '</span>' +
      '<time datetime="' + esc(n.fecha) + '">' + esc(n.fechaTexto || fecha(n.fecha)) + '</time>' +
      '<h3>' + esc(n.titulo) + '</h3><p>' + esc(n.resumen) + '</p>' +
      (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(n.textoEnlace || "Ver más") + ' →</a>' : "") +
      '</div></article>';
  }).join("") || "<p>Pronto publicaremos novedades.</p>";

  // ---- Animaciones suaves al hacer scroll ----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("is-in"); });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
