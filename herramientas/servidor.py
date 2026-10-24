"""Servidor local para revisar el sitio: igual a `python -m http.server`, pero sin caché,
para que el navegador y el celular siempre muestren la última versión.
Uso: python herramientas/servidor.py 5691
"""
import os, sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5691
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Sitio en http://localhost:{port}")
    ThreadingHTTPServer(("", port), partial(SinCache, directory=raiz)).serve_forever()
