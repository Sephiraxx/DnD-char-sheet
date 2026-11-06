# Catálogo compartido de libros oficiales (reglas de 2014)

`official-content-data.js` contiene entradas de juego extraídas de los PDFs proporcionados por el propietario. No contiene PDFs, páginas completas, imágenes ni capítulos narrativos. `official-content.js` las conecta al inventario, a los rasgos de personaje, a las descripciones de conjuros y al bestiario que usan los encuentros. Los cuatro puntos de entrada (ficha, DM, tablero y catálogo) cargan los mismos datos, y el service worker los conserva para usar sin conexión.

La selección revisada está en `tools/official-books.json`. Son 63 documentos compatibles con 2014. No se seleccionan libros de otras ediciones ni homebrew. También se excluyen la conversión de aficionados «La Noche de los Muertos que Caminan» y la guía ilustrada de dragones, que no es un libro de reglas de 2014. La incorporación anterior de Mar Abierto y sus dos conjuros sigue siendo opcional, bajo la fuente de terceros Tal'Dorei; no se extraen más opciones de ese libro.

## Conversión reproducible

Los PDFs originales y los archivos de trabajo permanecen fuera de los archivos publicados. Se requiere Python con PyMuPDF y Tesseract con los modelos `spa` y `eng`.

1. `tools/extract-official-pdfs.py <manifest> <carpeta de PDFs> <caché> --tessdata <modelos>` extrae geometría y reconoce las páginas sin texto legible. Los resultados y cada página reconocida quedan en la caché local.
2. `tools/refine-official-ocr.py <manifest> <carpeta de PDFs> <caché> --tessdata <modelos>` vuelve a leer las páginas escaneadas de reglas a mayor resolución. Usa las líneas de Tesseract para conservar el orden de palabras en escaneos inclinados y descarta ruido de ilustraciones. Limita la resolución total para PDFs cuyas páginas tienen dimensiones anómalas.
3. `tools/repair-official-abilities.py <manifest> <carpeta de PDFs> <caché> --tessdata <modelos>` reconoce las tablas de características como recortes pequeños. Conserva sus celdas numéricas y guarda una corrección por página, sin cambiar el PDF.
4. `node --max-old-space-size=4096 tools/build-official-content.js <caché>` usa el lector de la Biblioteca del DM y escribe exclusivamente `.tmp-test/unreviewed-official-content-data.js`. La extracción sin revisar nunca reemplaza el catálogo publicado. Cuando la lectura refinada no ofrece un bloque válido, también comprueba la original. Las equivalencias de conjuros están en `tools/official-spell-aliases.json` y conservan sus IDs y reglas de personaje.
5. `tools/audit-official-catalogue.js` compara identidades y estadísticas con `tools/official-reference-facts.json`, `official-reference-additions.json` y `official-variant-facts.json`. Estos índices contienen nombres y datos mecánicos, no capítulos ni descripciones completas. `official-book-sources.json` limita las correspondencias por versión y libro; `official-entry-reviews.json` registra las excepciones cotejadas con los PDFs. La coincidencia de números por sí sola no demuestra la identidad de una criatura.
6. Preparar una caché privada de los bloques de juego limpios correspondientes a los PDFs proporcionados (`monsters` e `items`, en el formato del índice de [5etools](https://github.com/5etools-mirror-3/5etools-src)). Ejecutar `OFFICIAL_CONTENT_INPUT=<extracción> node tools/repair-official-catalogue.js <bloques-privados.json> <informe.json> <caché-geométrica>`. En PowerShell, configurar primero `$env:OFFICIAL_CONTENT_INPUT`. El reparador rechaza criaturas sin correspondencia o revisión explícita, conserva los IDs anteriores, consolida duplicados y separa las tarjetas del apéndice de Pico Helado antes de publicar. Solo emite los bloques de juego que corresponden a entradas de los PDFs de la lista, nunca la caché completa.
7. Revisar el informe y ejecutar `python tools/test_official_ocr.py`, `npm run stamp` y `npm run check`. Los tests incluyen las entradas dañadas reportadas, versiones específicas, fórmulas de compañeros, migración de IDs, tarjetas y selectores de libros.

## Revisión de calidad del catálogo

La revisión cubre las identidades y estadísticas básicas de las 1.961 filas originales de criaturas. Tras consolidar diez duplicados quedan 1.951 entradas. Se cotejaron visualmente los 717 encabezados originales de objetos con los PDFs; se recuperaron objetos con encabezados incorrectos, se descartaron filas narrativas y de precios y se volvieron a leer por separado las tarjetas de Pico Helado. El resultado conserva 717 entradas de objetos, incluidas las recuperadas y las variantes agrupadas.

Las discrepancias con el índice no se aceptan a ciegas. Mary Greymalkin conserva CA 14 del PDF; la bruma vampírica de Relatos del Portal Bostezante conserva su versión anterior de 45 PG; el árbol marchito de Witchlight conserva 138 PG. Se aplican las [erratas oficiales de Curse of Strahd](https://media.wizards.com/2020/dnd/downloads/CoS-Errata.pdf) a su árbol marchito y las [erratas de Spelljammer](https://media.wizards.com/2022/dnd/downloads/SJA-Errata.pdf) a sus criaturas actualizadas. Los errores de características del índice en la palma triflor, la mole de piedra y el orco ojo de Gruumsh están corregidos explícitamente.

Los bloques dañados se reconstruyen con texto limpio de la misma criatura y versión. La traducción existente se aplica a nombres y fórmulas compatibles; algunas descripciones especializadas permanecen en inglés. Las variantes agrupadas conservan sus elecciones y los compañeros muestran sus fórmulas, sin presentar sus PG o desafío como valores fijos. El resto de las descripciones de conjuros y rasgos continúa procediendo de los PDFs; esta revisión no certifica cada palabra del reconocimiento de texto.

Los 37 libros de aventuras se ocultan en los selectores de personaje, mesa, DM, bestiario y catálogo. Sus etiquetas e IDs se conservan para las partidas guardadas y sus criaturas y objetos siguen disponibles. Los manuales y guías de ambientación permanecen seleccionables.

## Alcance y límites

Los contadores describen entradas por libro, incluidas reimpresiones, no criaturas únicas. La página de catálogo muestra cuántas entradas se extrajeron y cuántos bloques no pasaron la validación por documento. Un PDF revisado no equivale a automatizar cada regla de ese libro.

Las estadísticas de criaturas, dados de daño y salvaciones compatibles funcionan con el combate existente. Rasgos complejos, variantes, tablas, condiciones especiales, elecciones internas y poderes no compatibles con el motor se consultan en su texto y se resuelven en mesa. Los bloques de variantes separados no modifican la criatura base. Los compañeros e invocaciones conservan sus notas de CA/PG variables; no se inventa una escala automática.

Los objetos nuevos conservan rareza, requisitos de sintonización, texto de reglas y, cuando se identifica inequívocamente, un contador de cargas. Los efectos y recargas especiales se aplican manualmente; se mantienen las automatizaciones del catálogo anterior. Los textos de libro se agregan a los conjuros existentes sin cambiar sus límites de aprendizaje, preparación, espacios, listas o concentración.

La Biblioteca personal del DM sigue siendo independiente. Una cuenta sin entradas personales conserva el contenido compartido. No se requieren Firebase, Supabase, una sesión de usuario ni una importación por dispositivo para acceder al catálogo publicado.
