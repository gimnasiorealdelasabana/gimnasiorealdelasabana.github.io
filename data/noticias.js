// ============================================================
//  NOTICIAS Y EVENTOS — para publicar una nueva, copia un bloque
//  { ... }, pégalo al inicio de la lista y cambia los textos.
//  La página muestra las 6 más recientes (ordenadas por fecha).
//
//  fecha:       "AAAA-MM-DD" (ordena las noticias)
//  fechaTexto:  opcional, texto que se muestra en vez de la fecha
//  tipo:        "Noticia", "Evento" o "Proyecto" (cambia el color)
//  imagen:      ruta en la carpeta img/ (opcional)
//  alt:         descripción de la imagen para accesibilidad
//  enlace:      URL completa, "inscripciones" (formulario) o "" (sin botón)
// ============================================================
window.GRS_NOTICIAS = [
  {
    fecha: "2026-10-19",
    tipo: "Noticia",
    titulo: "¡Abrimos las inscripciones 2027!",
    resumen: "Ya puedes diligenciar el formulario en línea. Recuerda: el cupo queda guardado al pagar la inscripción en efectivo en el colegio dentro del plazo.",
    imagen: "img/noticia-inscripciones.jpg",
    alt: "Estudiantes del colegio reunidos frente a la fachada decorada",
    enlace: "inscripciones",
    textoEnlace: "Inscribirme"
  },
  {
    fecha: "2026-10-18",
    fechaTexto: "[POR CONFIRMAR fecha]",
    tipo: "Evento",
    titulo: "Celebramos el Día del Chef GRS",
    resumen: "Estudiantes, docentes y directivos nos vestimos de chef para preparar y compartir recetas. Aprendimos a medir, organizar y trabajar en equipo.",
    imagen: "img/noticia-chef.jpg",
    alt: "Estudiantes con gorro y delantal de chef frente al mural del Día del Chef",
    enlace: "",
    textoEnlace: ""
  },
  {
    fecha: "2026-10-17",
    fechaTexto: "[POR CONFIRMAR fecha]",
    tipo: "Proyecto",
    titulo: "Feria de proyectos",
    resumen: "Nuestros estudiantes presentaron a las familias las construcciones y experimentos que diseñaron en clase.",
    imagen: "img/noticia-feria.jpg",
    alt: "Estudiantes y familias en la feria de proyectos del colegio",
    enlace: "",
    textoEnlace: ""
  }
];
