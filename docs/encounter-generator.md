# Generador de encuentros para el DM

En **Pantalla del DM → Generador de encuentros**, elegí un entorno y una tabla. Se puede tirar automáticamente, ingresar una tirada física o consultar la tabla completa y elegir una fila. Funciona sin abrir una mesa y, después de la primera carga, sin conexión. Con una mesa abierta se puede guardar el resultado como encuentro preparado o añadirlo a uno existente desde **Generar desde tablas**. El selector de criaturas también ofrece ese acceso.

Incluye 82 tablas de reglas compatibles con 2014, agrupadas en 39 entornos y contextos, con 2.139 resultados. Fuentes: Guía de Xanathar, Guía del Dungeon Master, Bigby, la Colección Astral de Boo, Morte's Planar Parade, Sigil and the Outlands y Ghosts of Saltmarsh. Las tablas de aventuras no se incorporan como libros en los selectores de personaje o mesa. Se excluyen las fuentes de 2024/2025 y material de terceros.

Las tiradas respetan los rangos originales y la probabilidad de cada dado: por ejemplo, `d12 + d8` suma dos dados, no elige uniformemente entre 2 y 20. En las tablas percentiles, `00` equivale a 100, incluidos los rangos que terminan en `00`. Los dados internos de cantidades, duraciones y otros detalles se tiran una vez y el resultado queda visible. Las tablas que incluyen actitud muestran su tirada para consultar en la fuente.

El nivel de la tabla no garantiza un combate equilibrado. El DM marca qué criaturas incluir y puede modificar sus cantidades; ninguna se selecciona automáticamente. Esto conserva aliados, alternativas y escenas narrativas. La dificultad usa las reglas de XP de 2014 del constructor existente y los personajes reales de la mesa. Guardar mantiene el resultado como notas privadas locales, con los bloques seleccionados y sus estadísticas; no tira iniciativa, envía anuncios, revela criaturas ni lanza el encuentro. Los grupos están limitados a 20 integrantes por bloque y 100 por preparación; el total narrativo original queda en las notas.

Los nombres de los contextos y controles están en castellano; el texto de referencia de las tablas se identifica como inglés y se puede editar en las notas antes de guardarlo. Las referencias a criaturas que aún no tienen un bloque exacto en el catálogo se muestran explícitamente y se conservan en las notas. No se sustituyen por otra versión ni se inventan estadísticas.

## Datos y verificación

El origen es el [generador de encuentros de 5etools](https://5e.tools/encountergen.html), usando `data/encounters.json` del snapshot público `3a16c3ae035b286e693c19e2dd98e5264289c9cc` del 4 de noviembre de 2026. `node tools/build-encounter-tables.js <encounters.json privado>` genera `encounter-tables-data.js` y `tools/encounter-tables-review.json`. Se conservan las identidades de tabla y los hashes; el generador rechaza rangos incompletos o superpuestos y empareja criaturas por nombre y fuente exactos. El informe lista las referencias sin bloque disponible. No se necesitan llamadas a 5etools durante el uso.

Los tests recorren todas las filas y los extremos de sus dados, comprueban los rangos, cantidades, referencias, tablas percentiles, dados sumados, notas, compatibilidad con encuentros antiguos y ausencia de escrituras en la partida al preparar un resultado. Los tres archivos nuevos se incluyen en la caché compartida sin conexión.
