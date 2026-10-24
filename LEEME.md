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

## Publicación
- Página: https://gimnasiorealdelasabana.github.io
- Repositorio: https://github.com/gimnasiorealdelasabana/gimnasiorealdelasabana.github.io (cuenta del colegio, separada de CORPOSEPI)
- Cada `git push` a `main` publica los cambios en 1–2 minutos.
- Este repositorio sube siempre con la cuenta `gimnasiorealdelasabana` (configurado en `.git/config`), aunque `gh` esté activo con otra cuenta.
- Si se compra un dominio propio, cambiar `canonical`, `og:url`, `og:image`, el JSON-LD, `robots.txt` y `sitemap.xml`.
