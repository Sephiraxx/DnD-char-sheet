# Catálogo compartido de libros oficiales (reglas de 2014)

`official-content-data.js` contiene entradas de juego extraídas de los PDFs proporcionados por el propietario. No contiene PDFs, páginas completas, imágenes ni capítulos narrativos. `official-content.js` las conecta al inventario, a los rasgos de personaje, a las descripciones de conjuros y al bestiario que usan los encuentros. Los cuatro puntos de entrada (ficha, DM, tablero y catálogo) cargan los mismos datos, y el service worker los conserva para usar sin conexión.

La selección revisada está en `tools/official-books.json`. Son 63 documentos compatibles con 2014. No se seleccionan libros de otras ediciones ni homebrew. También se excluyen la conversión de aficionados «La Noche de los Muertos que Caminan» y la guía ilustrada de dragones, que no es un libro de reglas de 2014. La incorporación anterior de Mar Abierto y sus dos conjuros sigue siendo opcional, bajo la fuente de terceros Tal'Dorei; no se extraen más opciones de ese libro.

## Conversión reproducible

Los PDFs originales y los archivos de trabajo permanecen fuera de los archivos publicados. Se requiere Python con PyMuPDF y Tesseract con los modelos `spa` y `eng`.

1. `tools/extract-official-pdfs.py <manifest> <carpeta de PDFs> <caché> --tessdata <modelos>` extrae geometría y reconoce las páginas sin texto legible. Los resultados y cada página reconocida quedan en la caché local.
2. `tools/refine-official-ocr.py <manifest> <carpeta de PDFs> <caché> --tessdata <modelos>` vuelve a leer las páginas escaneadas de reglas a mayor resolución. Usa las líneas de Tesseract para conservar el orden de palabras en escaneos inclinados y descarta ruido de ilustraciones. Limita la resolución total para PDFs cuyas páginas tienen dimensiones anómalas.
3. `tools/repair-official-abilities.py <manifest> <carpeta de PDFs> <caché> --tessdata <modelos>` reconoce las tablas de características como recortes pequeños. Conserva sus celdas numéricas y guarda una corrección por página, sin cambiar el PDF.
4. `node --max-old-space-size=4096 tools/build-official-content.js <caché>` usa el lector de la Biblioteca del DM. Valida nombre, tamaño/tipo, CA, PG, desafío y las seis características antes de publicar criaturas. Cuando la lectura refinada no ofrece un bloque válido en una página, también comprueba la lectura original. Las equivalencias revisadas de traducciones de conjuros están en `tools/official-spell-aliases.json`; conservan los IDs, las listas de clase y los cálculos existentes.
5. Revisar los bloques rechazados en `OfficialContentData.audit.rejectedBlocks`, las descripciones sin correspondencia y las estadísticas de cada libro antes de publicar. Ejecutar `python tools/test_official_ocr.py`, `npm run stamp` y `npm run check`.

## Alcance y límites

Los contadores describen entradas por libro, incluidas reimpresiones, no criaturas únicas. La página de catálogo muestra cuántas entradas se extrajeron y cuántos bloques no pasaron la validación por documento. Un PDF revisado no equivale a automatizar cada regla de ese libro.

Las estadísticas de criaturas, dados de daño y salvaciones compatibles funcionan con el combate existente. Rasgos complejos, variantes, tablas, condiciones especiales, elecciones internas y poderes no compatibles con el motor se consultan en su texto y se resuelven en mesa. Los bloques de variantes separados no modifican la criatura base. Los compañeros e invocaciones conservan sus notas de CA/PG variables; no se inventa una escala automática.

Los objetos nuevos conservan rareza, requisitos de sintonización, texto de reglas y, cuando se identifica inequívocamente, un contador de cargas. Los efectos y recargas especiales se aplican manualmente; se mantienen las automatizaciones del catálogo anterior. Los textos de libro se agregan a los conjuros existentes sin cambiar sus límites de aprendizaje, preparación, espacios, listas o concentración.

La Biblioteca personal del DM sigue siendo independiente. Una cuenta sin entradas personales conserva el contenido compartido. No se requieren Firebase, Supabase, una sesión de usuario ni una importación por dispositivo para acceder al catálogo publicado.
