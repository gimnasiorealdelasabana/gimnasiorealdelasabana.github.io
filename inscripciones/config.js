// ============================================================
//  CONFIGURACIÓN — Gimnasio Real de la Sabana · Inscripciones
// ============================================================
//  1) Mientras "firebase" sea null, la app funciona en MODO DEMO:
//     los datos quedan SOLO en el navegador donde se diligencian.
//     Sirve para probar, NO para recibir inscripciones reales.
//  2) Para ponerla en producción: crear un proyecto en
//     https://console.firebase.google.com, activar Firestore y
//     Authentication (correo/contraseña), y pegar aquí su config.
//     Ver LEEME.md para el paso a paso.
// ============================================================
window.GRS_CONFIG = {
  anio: 2027,
  colegio: "Gimnasio Real de la Sabana",
  ciudad: "Madrid, Cundinamarca",

  // Proyecto Firebase del colegio (cuenta de Google del colegio, independiente de CORPOSEPI).
  // Estos datos no son secretos: la seguridad la dan las reglas de Firestore.
  firebase: {
    apiKey: "AIzaSyAbNm7gIh0txmQZhZOCCtvavN8wHnjDlNE",
    authDomain: "gimnasio-real-sabana.firebaseapp.com",
    projectId: "gimnasio-real-sabana",
    storageBucket: "gimnasio-real-sabana.firebasestorage.app",
    messagingSenderId: "551713525198",
    appId: "1:551713525198:web:2e9360a4f0ed31b684ef9f"
  },

  // Solo para MODO DEMO (sin Firebase). En producción el ingreso
  // al panel es con correo y contraseña de Firebase Authentication.
  pinDemo: "2027"
};
