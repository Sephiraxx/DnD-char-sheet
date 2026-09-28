# Cuaderno de aventura — D&D 5e 2014 · versión 4

Ficha en español para Darien y su party, preparada para GitHub Pages y celular. Aplicación estática: no necesita cuentas, servidor de aplicación, dependencias ni claves. Cada persona abre el mismo enlace y crea su propia ficha.

## Actualizar la página existente

1. Exportá una copia JSON de tu personaje desde la página actual.
2. Descomprimí el ZIP y reemplazá **todo su contenido** en la raíz del repositorio. `index.html` debe quedar en la raíz; no subas solamente el ZIP. Conservá `.nojekyll`, todas las carpetas y los archivos JavaScript.
3. Recargá la misma dirección con conexión. Si la página estaba abierta, cerrala y volvé a abrirla para activar la nueva caché `v5-party`.
4. No borres los datos del navegador. Tu ficha, su nivel, elecciones, PG, oro y recursos se conservan. Actualizar no concede un descanso.

Archivos nuevos respecto de la versión de combate: `class-data.js`, `class-rules.js`, `party-store.js` y `party-ui.js`. También cambiaron `app.js`, `rules.js`, `index.html`, `style.css`, `combat-engine.js`, `combat-ui.js`, `wizard.js`, `manifest.webmanifest` y `sw.js`.

Para una publicación nueva: subí el contenido a un repositorio y elegí **Settings → Pages → Deploy from a branch → main → /(root)**. No hace falta compilar. Prueba local: `python3 -m http.server 8000`, luego `http://localhost:8000`.

## Crear y cambiar de personaje

Abrí **Personajes → Crear personaje**. La guía pide identidad, clase, nivel, subclase cuando corresponda, puntuaciones finales, competencias, PG, oro y equipo. Podés empezar en cualquier nivel del 1 al 20.

- La matriz estándar es una ayuda editable: las puntuaciones finales deben incluir los bonos y mejoras de tu mesa. La aplicación no elige raza, trasfondo, dotes ni equipo por vos.
- Hay 13 clases: artificiero, bárbaro, bardo, clérigo, druida, guerrero, monje, paladín, explorador, pícaro, hechicero, brujo y mago.
- Cada ficha tiene guardado, respaldo, historial de la sesión y borrador de subida independientes. Crear otra nunca reemplaza a Darien.
- El ejemplo inicial de Darien sigue disponible; las nuevas fichas empiezan sin sus objetos, conjuros ni acompañantes.
- Elegí si empezás con recursos completos o si necesitás confirmar los actuales. Los objetos escritos en el inventario no modifican la CA automáticamente.
- **Personaje → Características y armadura** permite ajustar velocidad, fórmula de CA y característica de lanzamiento.

## Clase y subida de nivel

**Clase** muestra la progresión de nivel 1 a 20, rasgos nuevos, subclase y elecciones pendientes. Incluye un índice de **118 subclases**, **151 opciones de rasgos** y **102 dotes** de las fuentes incluidas: estilos, maniobras, infusiones, Metamagia, invocaciones y pactos, entre otras.

Al subir se registra el Dado de Golpe de tu clase, aumento de PG, competencia, espacios, subclase cuando corresponda y mejora de características o dote. Después, la pestaña Clase indica las elecciones de conjuros, preparación, Pericias y rasgos pendientes. Los PG actuales y recursos gastados se conservan: subir no equivale a descansar. Darien mantiene su guía de bardo y Elocuencia existente.

Las opciones muestran requisitos de referencia. Los efectos de una dote, raza o elección especial deben aplicarse explícitamente en la ficha; un selector no sustituye la revisión de esos requisitos. Para decisiones internas de los rasgos (terrenos, enemigos, ascendencia, formas, objetos infundidos, etc.) usá **Notas de clase**. Podés añadir rasgos y contadores personalizados. Los rasgos opcionales se habilitan desde **Subclase y Pericias**; revisá cuáles reemplazan otros.

## Agregar cualquier conjuro

En **Conjuros → Agregar / preparar conjuros**:

- **Mi clase y seleccionados** muestra la lista aplicable y las elecciones previas.
- **Todo el catálogo → Extra del DM** permite agregar cualquier conjuro, sin bloqueo por clase, fuente o nivel. No ocupa las elecciones normales de la clase.
- Un extra puede usar espacios o tener lanzamiento sin espacio autorizado. Si tiene usos limitados por día, llevá ese límite mediante un recurso personalizado; la opción sin espacio no impone un límite por sí sola.
- Si falta una entrada, **Crear conjuro propio** permite registrar nombre, nivel, tiempo, componentes, efecto y demás datos.

Se distinguen conjuros conocidos, preparados, libro de mago, conjuros siempre preparados por subclase, Secretos mágicos y Arcanum del brujo. El mago conserva los rituales del libro aunque no estén preparados. Los espacios de pacto tienen su nivel propio y se recuperan con descanso corto. Un conjuro extra no concede espacios adicionales.

El catálogo contiene **520 conjuros** de la línea 2014: nombres, niveles, tiempos, listas y fuentes, con **319 textos SRD completos en inglés** y resúmenes españoles de las entradas principales de Darien. No es una recopilación exhaustiva de todo material publicado o casero. Los textos no SRD se consultan en su fuente; podés añadir notas propias. No se incluyen Unearthed Arcana ni las revisiones de reglas de 2024.

Caballero arcano y Embaucador arcano: las restricciones de escuelas y excepciones de aprendizaje se revisan en mesa. Los conjuros opcionales, reemplazos especiales y elecciones internas de listas de subclase pueden requerir registro manual.

## Combate y descansos

- **Mi turno** inicia el seguimiento y recupera acción, adicional y reacción. **Terminar turno** conserva la reacción gastada y habilita registrar reacciones durante turnos ajenos.
- Elegí acción, adicional o reacción y filtrá por nivel de conjuro. Al lanzar, elegís el espacio disponible. Los trucos no gastan espacios.
- La restricción de conjuros de acción adicional de 2014 se aplica en ambos órdenes durante el seguimiento.
- El combate ofrece recursos principales de cada clase y acciones frecuentes: Inspiración, Rabia, Segundo aliento, Acción súbita, ki, puntos de hechicería, Canalizar divinidad, Forma salvaje y otras según el nivel.
- **Acción súbita:** registrá primero tu acción y después usá el rasgo para habilitar la segunda. No concede otra acción adicional.
- Los Dados de Golpe usan el dado de la clase. En descanso corto se suma CON a cada dado, con mínimo de 0 PG por dado. Los recursos se recuperan según su descanso; el descanso largo devuelve hasta la mitad del máximo de Dados de Golpe (mínimo uno).
- El daño recuerda las salvaciones de concentración. Ataques, daño a enemigos, alcance, componentes, objetivos, condiciones y duraciones se resuelven en mesa.

El combate automatiza recursos y acciones comunes, **no todos los efectos de las 118 subclases**. Por ejemplo, las formas del druida, mascotas, bonificaciones de objetos y reacciones especiales pueden necesitar notas, ajustes o la opción del DM. No calcula multiclase. La velocidad y los bonos de equipo se registran manualmente. Las condiciones son recordatorios y no alteran todas las tiradas.

## Guardado, copias y uso sin conexión

Todo se guarda **en ese navegador y dispositivo**. GitHub Pages publica la aplicación, pero no almacena ni sincroniza las fichas entre los integrantes de la party. Para trasladar una ficha usá **Personajes → Exportar personaje actual** e **Importar como personaje nuevo**. La importación tradicional de Mi ficha reemplaza solo la ficha activa, después de confirmar.

Guardá copias JSON periódicas: borrar los datos del navegador elimina los guardados locales. Cambiar el dominio o navegador requiere exportar e importar. Después de una carga completa por HTTPS se puede volver a abrir sin conexión en navegadores compatibles. Los enlaces externos de referencia sí requieren conexión.

Los avisos temporales se cierran automáticamente o con ×. Si una actualización no aparece, cerrá las pestañas de la aplicación y abrila con conexión; no borres el almacenamiento.

## Archivos

- `index.html`, `style.css`, `assets/`: estructura, diseño e imágenes.
- `app.js`, `rules.js`: ficha, inventario, monedas, validación y controles comunes.
- `party-store.js`, `party-ui.js`: fichas independientes, creador y pantallas por clase.
- `class-data.js`, `class-rules.js`: índices 2014 y progresión de las 13 clases.
- `catalog.js`: catálogo local de conjuros y dotes.
- `progression.js`, `wizard.js`: guía detallada del bardo existente.
- `combat-engine.js`, `combat-ui.js`: acciones, recursos y combate guiado.
- `sw.js`, `manifest.webmanifest`: instalación y caché sin conexión.

## Verificación y fuentes

Se verificaron reglas numéricas para las 13 clases en niveles 1–20; guardados antiguos; libro, preparación y rituales; espacios de pacto y Arcanum; subidas conservando recursos; creación y cambio de fichas; elecciones de invocaciones; conjuros extra ajenos a la clase; acciones de guerrero; descansos; navegación móvil y uso sin conexión. Las pruebas no certifican cada interacción especial de todas las subclases.

Fuentes: [reglas básicas 2014](https://www.dndbeyond.com/sources/dnd/basic-rules-2014), SRD 5.1, [datos SRD estructurados](https://github.com/5e-bits/5e-database/tree/main/src/2014/en), [índice Wikidot 2014](https://dnd5e.wikidot.com/) y metadatos de nombres, niveles, listas y requisitos de [5etools](https://github.com/5etools-mirror-3/5etools-src/tree/main/data). Los índices mezclan distintas fuentes: se filtraron las entradas incluidas para excluir UA y 2024. Nivel20 se recibió como referencia, pero su verificación de acceso impidió contrastar el catálogo en esta revisión.

This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

El texto SRD está sujeto a esa licencia. La licencia de los datos estructurados de 5e-bits se incluye en `LICENSE_CATALOG.md`; no se presenta como licencia de los libros comerciales. Los demás nombres y referencias identifican su fuente y no incluyen una reproducción íntegra de esos libros. Aplicación no oficial, sin afiliación con Wizards of the Coast. Ilustraciones creadas para Darien Voss y su compañera.
