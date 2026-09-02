# 📒 Cuaderno de Gastos

Aplicación de finanzas personales (ingresos, egresos, compras en cuotas) hecha con HTML/CSS/JS como PWA. Se instala en el celular desde el navegador, funciona offline.

## Características

- 💰 Registrar **ingresos** y **egresos** por categoría.
- 💳 Compras **en cuotas** (ej: silla gamer 9 cuotas de $20.000). Se restan automáticamente cada mes según la fecha.
- 💳💰 **Diferencia entre Débito y Crédito**:
  - **Débito**: el monto total se descuenta **inmediatamente** en el mes de compra.
  - **Crédito**: el monto total **NO** se descuenta; solo se resta cada cuota **en el mes que corresponde** (auto-sugiere el mes siguiente).
- 📊 **Resumen** con balance total y del mes.
- 📅 **Cuotas pendientes** con barra de progreso.
- 🗂 **Historial** filtrable por tipo y categoría.
- 💾 Los datos se guardan **localmente** (localStorage, funciona offline).
- 📱 **PWA**: se instala como app en el celular (ícono en home), funciona sin conexión.

## Probar en el navegador (sin instalar nada)

```bash
npm install
npm start
```

Luego abrí `http://localhost:3000` en el navegador.

## Instalar en el celular (PWA)

1. Abrí la URL en **Google Chrome** (Android) o **Safari** (iPhone):
   ```
   https://tu-usuario.github.io/cuaderno-de-gastos/
   ```
2. Toquí el menú (⋮ o ↗) → **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.
3. Listo: el ícono aparece en tu home como cualquier app nativa. Funciona offline.

## Desplegar en GitHub Pages (1 vez)

1. Subí tu código a `https://github.com/Alejandracordoba/Cuaderno-de-gastos`.
2. En el repo: **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save**.
3. Esperá 1-2 minutos. La app estará en:
   ```
   https://alejandracordoba.github.io/cuaderno-de-gastos/
   ```

> **Nota:** GitHub Pages sirve los archivos desde la raíz del repo. Asegurate que `index.html`, `css/`, `js/`, `manifest.json` y `sw.js` estén directamente en la carpeta que Pages sirve (la raíz del repo o la carpeta `www/` según configures). Si usás la carpeta `www/`, en Settings → Pages poní el origen como la rama `main` y la carpeta `/root` y move los archivos a la raíz del repo.

## Cómo funciona lo de las cuotas

Ejemplo: comprás una silla gamer a **9 cuotas de $20.000**.
- Agregás el egreso y marcás *"Sí, es en cuotas"*.
- Indicás 9 cuotas, $20.000 por cuota y el mes de inicio (ej: `2026-09`).
- Cada mes, mientras la fecha esté dentro del período, se resta automáticamente **$20.000** del balance mensual.
- En la pestaña *Cuotas* ves cuántas pagaste y cuántas faltan.

## Estructura del proyecto

```
cuaderno de gastos/
├── www/                    # La app web (lo principal)
│   ├── index.html          # Estructura / pantallas
│   ├── css/style.css       # Diseño
│   ├── js/app.js           # Lógica (gastos, cuotas, resumen)
│   ├── manifest.json       # Config PWA (nombre, icono, colores)
│   └── sw.js               # Service worker (cacheo offline)
├── capacitor.config.json   # Config de Capacitor (legacy)
├── package.json            # Dependencias y scripts
└── README.md               # Este archivo
```

## Instalación local

```bash
npm install
npm start
```

La app corre en `http://localhost:3000`.

## Nota

- Los datos se guardan en localStorage del navegador. Si limpiás datos del navegador, se pierden.
- No hay nube ni backup. Si querés a futuro, se puede agregar exportación a CSV/PDF o sincronización.
- Capacitor/Android queda como referencia legacy; la app principal es PWA.
