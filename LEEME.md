# Sitio web — Colegio Gimnasio Real de la Sabana

Sitio estático (HTML + CSS + JS, sin framework), listo para GitHub Pages.

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | Página principal (una sola página con menú) |
| `politica-datos.html` | Política de tratamiento de datos (Ley 1581 de 2012) |
| `js/config.js` | **Links y contacto**: formulario de inscripciones, WhatsApp, teléfono, redes |
| `data/noticias.js` | **Noticias y eventos**: copiar un bloque y cambiar textos |
| `css/styles.css`, `js/main.js` | Diseño y comportamiento |
| `img/` | Escudo, bandera, imagen para WhatsApp (`og-image.jpg`) y fotos reales del colegio (recortadas, livianas y sin datos de ubicación) |
| `prompts-imagenes.md` | Prompts para crear imágenes fotográficas con IA (ChatGPT, Gemini, Ideogram) |
| `herramientas/ilustraciones.py` | Script (Python + Pillow) que dibuja las ilustraciones actuales de `img/`. Uso: `python herramientas/ilustraciones.py` |

## Tareas frecuentes
- **Cambiar el link de Inscripciones 2027**: `js/config.js` → `URL_INSCRIPCIONES`.
- **Publicar una noticia**: `data/noticias.js` → copiar un bloque `{ ... }` al inicio de la lista.
- **Reemplazar una imagen**: guardar la nueva en `img/` con el mismo nombre.
- **Agregar redes sociales**: `js/config.js` → `REDES`.
- **Datos pendientes**: buscar `[POR CONFIRMAR]` en `index.html` y `politica-datos.html`.

## Ver en el computador
Servidor `gimnasio-real-sabana-web` en `.claude/launch.json` (puerto 5691). El formulario de inscripciones corre aparte en el puerto 5690.

## Inscripciones (carpeta `inscripciones/`)
- Formulario para padres: https://gimnasiorealdelasabana.github.io/inscripciones/
- Panel del colegio: https://gimnasiorealdelasabana.github.io/inscripciones/admin.html (solo grs.madrid2026@gmail.com y g.realdelasabana@gmail.com)
- Base de datos: Firebase, proyecto `gimnasio-real-sabana` (cuenta de Google del colegio). Reglas en `herramientas/firestore.rules`: si se cambian aquí, hay que pegarlas también en Firestore → Reglas → Publicar.
- Para agregar otra persona al panel: crear el usuario en Authentication y agregar su correo a la lista de `esColegio()` en las reglas.

## Matrícula 2027 (misma carpeta `inscripciones/`)
- Página para la familia: `matricula.html?c=CÓDIGO&d=DOCUMENTO` (también desde «Consultar mi inscripción» → «Ver factura y matricular»). Carné: `carnet.html?id=GRS-2027-0001`.
- Flujo: cupo guardado → factura (FM27-0001…) → pago (la familia sube soporte, o secretaría registra efectivo con recibo) → folio (N.° 0001…) con documentos y firmas → el colegio confirma → carné digital + registro en la cartera (💰 en el panel).
- **Todo se configura en el panel → ⚙️ Configuración → Matrícula**: valores de matrícula y pensión por grado, otros cobros, fecha máxima, medios de pago, día de pago de la pensión, documentos exigidos, datos legales (razón social, NIT, resolución, rectoría) y textos del contrato y del pagaré del Gimnasio. Mientras un grado tenga matrícula en $0, la familia no ve factura.
- Colecciones de Firestore: `matriculas` (lo que llena la familia), `matriculas_admin` (lo que decide el colegio), `matriculas_docs` (un archivo por documento), `contadores`, `carnets`, `cartera`.
- Probar sin tocar la base real: agregar `?demo` a cualquier página (PIN del panel: 2027).

## Publicación
- Página: https://gimnasiorealdelasabana.github.io
- Repositorio: https://github.com/gimnasiorealdelasabana/gimnasiorealdelasabana.github.io (cuenta del colegio, separada de CORPOSEPI)
- Cada `git push` a `main` publica los cambios en 1–2 minutos.
- Este repositorio sube siempre con la cuenta `gimnasiorealdelasabana` (configurado en `.git/config`), aunque `gh` esté activo con otra cuenta.
- Si se compra un dominio propio, cambiar `canonical`, `og:url`, `og:image`, el JSON-LD, `robots.txt` y `sitemap.xml`.
