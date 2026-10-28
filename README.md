# Cartera Hipotecaria 2025–2026 · Lectura Ejecutiva

Web slider deck interactivo (12 láminas) para un caso académico de analítica y data storytelling sobre una cartera hipotecaria sintética.

> Caso académico — datos sintéticos. No representa cifras oficiales de Banco Santander ni debe usarse para decisiones financieras reales. El sistema visual sigue las guías del brand book como ejercicio docente; no incluye el logo ni la llama, que son activos de la marca.

## Ver el deck

Versión publicada: https://eloboscoder.github.io/cartera-hipotecaria-deck/

También puedes abrir `index.html` en cualquier navegador moderno.

Navegación: botones Anterior / Siguiente, los puntos inferiores (con el nombre de cada lámina al pasar el cursor), rueda del mouse o trackpad, teclado (flechas, espacio, PageUp/PageDown, Home/End), swipe en pantallas táctiles y F o el botón de la barra para pantalla completa. En las láminas con "Lectura", el primer avance revela el callout ("Revelar lectura") y el segundo cambia de lámina.

## Qué hay dentro

- `index.html` + `assets/deck.css` + `assets/deck.js` — versión autónoma del deck: runtime mínimo (plantilla + morphdom), datos agregados embebidos, CSS, SVG, GSAP y Three.js. Librerías cargadas desde jsDelivr.
- `source/Main.dc.html` y `source/canvas.json` — archivo fuente en el formato de canvas de Claude (desde donde se genera la versión autónoma).
- `data/data_verified.json` — agregados calculados y verificados desde el archivo Excel del caso (1.850 operaciones y 2.800 solicitudes): KPIs, canales, embudo, segmentos, serie mensual, serie mensual por KPI, regiones (con trazados SVG de las 16 regiones de Chile), tipo de vivienda, ejecutivos, cosechas, mora por segmento × cosecha y escenario de estrés de tasa.

## Efectos y componentes

- Intro de apertura: las siete preguntas en tipografía cinética y la cifra de volumen armándose antes de levantar la cortina.
- Transición entre láminas con cortina de tres paneles escalonados y salida del contenido; fondo WebGL de gradiente fluido (shader en Three.js) que reacciona al mouse y cambia de paleta por tema.
- Titulares con reveal por clip-path, preguntas en script que se "escriben", conteo de cifras, barras y columnas que crecen, puntos del scatter que aterrizan, tarjetas de decisiones con flip 3D.
- Componentes: KPI tiles con sparkline mensual y tilt 3D, embudo como donut interactivo, ranking de canales con reordenamiento FLIP al cambiar la métrica, mapa coroplético de Chile con ficha por región, scatter interactivo de ejecutivos, heatmap segmento × cosecha con tooltips.
- Cursor custom con anillo que crece sobre los elementos interactivos y botones magnéticos.

Todo efecto visual tiene fallback en CSS: las láminas y sus datos se ven aunque GSAP o WebGL no estén disponibles.

## Estructura narrativa

1. Portada
2. La cartera en diez números
3. Embudo comercial
4. P1 · Canales (selector volumen / operaciones / mora)
5. P2 · Segmentos y la paradoja del score de riesgo
6. P3 · Experiencia (NPS por canal)
7. Serie mensual: originación y mora
8. P4 · Geografía (mapa interactivo) y tipo de vivienda
9. P5 · Ejecutivos (scatter interactivo: clic en cada punto)
10. P6 · Cosechas y efecto seasoning (columnas + heatmap)
11. P7 · Sensibilidad a +2pp de tasa
12. Conclusiones y tres decisiones

## Sistema visual

Rojo como protagonista, neutros cálidos para las láminas de datos, rampa de rojos para magnitudes, tipografía en dos voces: script tipo brush para las preguntas ("la voz de la gente") y sans contundente para las respuestas ("la voz del banco"). Fuentes: Permanent Marker, Anton y Outfit (Google Fonts) como equivalentes de las familias propietarias.
