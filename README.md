# Cartera Hipotecaria 2025–2026 · Lectura Ejecutiva

Web slider deck interactivo (12 láminas) para un caso académico de analítica y data storytelling sobre una cartera hipotecaria sintética.

> Caso académico — datos sintéticos. No representa cifras oficiales de Banco Santander ni debe usarse para decisiones financieras reales. El sistema visual sigue las guías del brand book como ejercicio docente; no incluye el logo ni la llama, que son activos de la marca.

## Ver el deck

Abre `index.html` en cualquier navegador moderno, o publícalo con GitHub Pages (Settings → Pages → Branch `main` / root).

Navegación: botones Anterior / Siguiente, los puntos inferiores (con el nombre de cada lámina al pasar el cursor), rueda del mouse o trackpad.

## Qué hay dentro

- `index.html` + `assets/deck.css` + `assets/deck.js` — versión autónoma del deck: runtime mínimo, datos agregados embebidos, CSS, SVG, GSAP (transiciones y conteo de cifras) y Three.js (constelación WebGL de fondo). Librerías cargadas desde jsDelivr.
- `source/Main.dc.html` y `source/canvas.json` — archivo fuente en el formato de canvas de Claude (desde donde se generó la versión autónoma).
- `data/data_verified.json` — agregados calculados y verificados desde el archivo Excel del caso (1.850 operaciones y 2.800 solicitudes): KPIs, canales, embudo, segmentos, serie mensual, regiones, tipo de vivienda, ejecutivos, cosechas y escenario de estrés de tasa.

## Estructura narrativa

1. Portada
2. La cartera en diez números
3. Embudo comercial
4. P1 · Canales (selector volumen / operaciones / mora)
5. P2 · Segmentos y la paradoja del score de riesgo
6. P3 · Experiencia (NPS por canal)
7. Serie mensual: originación y mora
8. P4 · Geografía y tipo de vivienda
9. P5 · Ejecutivos (scatter interactivo: clic en cada punto)
10. P6 · Cosechas y efecto seasoning
11. P7 · Sensibilidad a +2pp de tasa
12. Conclusiones y tres decisiones

## Sistema visual

Rojo como protagonista, neutros cálidos para las láminas de datos, rampa de rojos para magnitudes, tipografía en dos voces: script tipo brush para las preguntas ("la voz de la gente") y sans contundente para las respuestas ("la voz del banco"). Fuentes: Permanent Marker, Anton y Outfit (Google Fonts) como equivalentes de las familias propietarias.
