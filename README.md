# ✓ Anotado

**Anotado** es una aplicación web progresiva (**PWA**) *100% Offline-First* diseñada con foco en la simplicidad y legibilidad para público adulto. Funciona en **cualquier celular (iPhone / Android), tablet o computador**, sin necesidad de instalación desde tiendas.

## Características principales

* **🏠 Menú Principal Claro:** Acceso directo con botones grandes a **Supermercado**, **Recordatorios** y **Notas**.
* **🛒 Lista de Supermercado & Modo Góndola:**
  * Cálculo automático en vivo ($\text{Cantidad} \times \text{Precio Unitario}$).
  * Seguimiento separado entre **En el Carro** y **Total Proyectado**.
  * Barra de **Presupuesto** con alerta visual si se supera el límite fijado.
  * Sugerencia automática de últimos precios registrados y exportación a WhatsApp.
  * **Compartir entre dispositivos:** Envío de listas por enlace directo (`#import/...`) o archivo `.anotado.json` e importación directa desde **Mis Listas**.
* **⏰ Recordatorios Independientes con Enlace Inteligente:**
  * Al crear un recordatorio de categoría *Compras / Supermercado*, ofrece crear y enlazar automáticamente una lista de compras con su presupuesto estimado.
* **📝 Notas Rápidas y Checklists:**
  * Notas de texto libre o listas con casillas, independientes de los recordatorios, con opción de crear una alarma vinculada en un toque.
* **🎨 Personalización & Accesibilidad:**
  * **Temas:** Automático del Sistema, Modo Claro (alto contraste) y Modo Oscuro.
  * **Idiomas:** Español neutro e Inglés (`es` / `en`).
  * **Multimoneda:** `CLP` (Peso Chileno), `USD`, `EUR`, `ARS`, `MXN`.

## Arquitectura Modular

```text
anotado/
├── index.html              # Shell principal de la PWA
├── manifest.json           # Configuración instalable en iPhone y Android
├── sw.js                   # Service Worker para uso 100% sin conexión
├── css/styles.css          # Sistema de diseño accesible y responsive (Master-Detail en Tablet)
├── assets/                 # Isotipo oficial (check verde)
├── js/
│   ├── app.js              # Router y orquestador principal
│   ├── core/               # Módulo 0: IndexedDB, i18n, Multimoneda, Temas y UI
│   └── modules/            # Módulos desacoplados: Home, Recordatorios, Notas, Supermercado
└── tests/
    └── module-tests.html   # Suite de pruebas modulares en navegador
```

## Cómo activar GitHub Pages (uso en celulares)

1. Ve a **Settings → Pages** en tu repositorio de GitHub.
2. En **Branch**, selecciona **`main`** y carpeta **`/ (root)`**, luego presiona **Save**.
3. En ~1 minuto la app estará disponible por HTTPS en `https://<tu-usuario>.github.io/anotado/`.

## Cómo instalar en el celular

1. Abre la URL de **GitHub Pages** del proyecto en **Safari (iPhone)** o **Chrome (Android)**.
2. En iPhone: toca el botón **Compartir** y selecciona **"Agregar a pantalla de inicio"**.
3. En Android: toca el menú **⋮** y selecciona **"Instalar aplicación"** o **"Agregar a pantalla principal"**.

## Cómo ejecutar pruebas localmente

Dado que la app usa módulos ES nativos (`type="module"`), requiere servirse por HTTP local:

```bash
python3 -m http.server 4173
```

Luego abre en tu navegador:
- App: `http://127.0.0.1:4173/index.html`
- Suite de pruebas (base aislada `AnotadoDB_test`): `http://127.0.0.1:4173/tests/module-tests.html`
