# Cuaderno de aventura — D&D 5e 2014 · versión 5.2

Ficha en español para Darien y su party, preparada para GitHub Pages y celular. Aplicación estática: no necesita cuentas, servidor de aplicación, dependencias ni claves. Cada persona abre el mismo enlace y crea su propia ficha.

## Actualizar la página existente

1. Exportá una copia JSON de tu personaje desde la página actual.
2. Descomprimí el ZIP y reemplazá **todo su contenido** en la raíz del repositorio. `index.html` debe quedar en la raíz; no subas solamente el ZIP. Conservá `.nojekyll`, todas las carpetas y los archivos JavaScript.
3. Recargá la misma dirección con conexión. Si la página estaba abierta, cerrala y volvé a abrirla para activar la nueva caché `v8-skills`.
4. No borres los datos del navegador. Tu ficha, su nivel, elecciones, PG, oro y recursos se conservan. Actualizar no concede un descanso.

La actualización de razas y libros añade `campaign-data.js` y `campaign.js`, y actualiza el catálogo, los selectores, las ayudas, las reglas y el caché. Reemplazá el paquete completo.

Archivos nuevos respecto de la versión de combate: `class-data.js`, `class-rules.js`, `party-store.js` y `party-ui.js`. También cambiaron `app.js`, `rules.js`, `index.html`, `style.css`, `combat-engine.js`, `combat-ui.js`, `wizard.js`, `manifest.webmanifest` y `sw.js`.

Para una publicación nueva: subí el contenido a un repositorio y elegí **Settings → Pages → Deploy from a branch → main → /(root)**. No hace falta compilar. Prueba local: `python3 -m http.server 8000`, luego `http://localhost:8000`.

## Crear y cambiar de personaje

En la primera visita, elegí **Crear personaje** o **Importar una ficha JSON**. Si ya tenés una abierta, usá **Personajes → Crear personaje**. La guía pide identidad, clase, nivel, subclase cuando corresponda, puntuaciones finales, competencias, PG, oro y equipo. Podés empezar en cualquier nivel del 1 al 20.

- La matriz estándar es una ayuda editable: las puntuaciones finales deben incluir los bonos y mejoras de tu mesa. La aplicación no elige raza, trasfondo, dotes ni equipo por vos.
- Hay 13 clases: artificiero, bárbaro, bardo, clérigo, druida, guerrero, monje, paladín, explorador, pícaro, hechicero, brujo y mago.
- Cada ficha tiene guardado, respaldo, historial de la sesión y borrador de subida independientes. Crear otra nunca reemplaza a Darien.
- La primera visita muestra únicamente Crear personaje e Importar ficha. No abre a Darien ni crea un personaje de ejemplo. Si ya tenés una ficha guardada, abre la última seleccionada; los guardados antiguos de Darien se conservan.
- Elegí si empezás con recursos completos o si necesitás confirmar los actuales. Los objetos escritos en el inventario no modifican la CA automáticamente.
- **Personaje → Características y armadura** permite ajustar velocidad, fórmula de CA y característica de lanzamiento.

## Competencias al crear una ficha

El paso 1 muestra las habilidades fijas de raza y trasfondo y las suma automáticamente. El paso 2 separa las elecciones de cada origen, los reemplazos por habilidades repetidas y las habilidades de clase, con contadores independientes. Una competencia de origen no consume una elección de clase. Las concesiones de dotes, rasgos o DM tienen un apartado manual.

Ejemplo: alta elfa + Noble + druida obtiene Percepción, Historia y Persuasión, y puede elegir Medicina y Naturaleza como sus dos habilidades de clase. Intimidación requiere otra fuente. Linaje personalizado y variantes con rasgos alternativos piden elegir el beneficio antes de conceder habilidades.

Esta actualización agrega `creation-skills.js`. Las fichas ya guardadas conservan sus competencias; para corregir una, usá **Personaje → Competencias**. No hace falta recrearla.

## Libros, razas y trasfondos

Por defecto están habilitados **PHB 2014, Xanathar, Tasha, Costa de la Espada, Strixhaven, Ravnica, Eberron: Rising from the Last War y Mordenkainen: Tome of Foes**. Este último no se sustituye por Monsters of the Multiverse. Cada ficha conserva su selección desde **Libros habilitados**.

El creador y **Personaje → Elegir / cambiar** incluyen dropdowns con **73 razas o variantes** y **49 trasfondos** de esos libros. Incluyen Forjado, Cambiante, Kalashtar, Cambiapieles, marcas del dragón, Gith, Eladrin, Shadar-kai, variantes de tiefling, linaje personalizado de Tasha, razas de Ravnica, Owlin y los trasfondos de las cinco facultades de Strixhaven. Algunas entradas comparten reglas pero conservan la fuente. Los índices y nombres de variantes no son un recuento de 73 especies diferentes.

Las tarjetas muestran fuente, tamaño, velocidad, aumentos de referencia, competencias, magia de linaje y decisiones pendientes. **Elegir una raza no suma automáticamente sus bonos a las puntuaciones o CA**: las puntuaciones ingresadas ya son finales. Por ejemplo, el +1 de CA del Forjado se registra una vez en bonos de CA. Dotes, equipo, usos de magia racial y condiciones de vuelo se completan según el rasgo. No se añaden objetos o monedas inventados.

Algunos trasfondos de Strixhaven y Ravnica y las marcas de Eberron amplían la lista de la clase: esos conjuros aparecen como opciones normales al tener acceso al nivel. Esto **no significa conocerlos ni tenerlos preparados**, ni concede espacios extra. Las dotes y magia innata son elecciones separadas, con su propia característica y límites. Por ejemplo, elegí y registrá Iniciado de Strixhaven para el trasfondo que lo otorga.

Los ocho libros habilitan **483 conjuros únicos** de los 520 del catálogo. Los de Costa de la Espada reeditados en Tasha se encuentran desde ambas fuentes y usan el texto corregido de la línea 2014. Un libro puede aportar razas, trasfondos o ampliar listas sin incorporar conjuros exclusivos nuevos; Tome of Foes no aporta conjuros exclusivos a este índice.

Deshabilitar un libro conserva las elecciones previas. **Todo el catálogo → Extra del DM** mantiene acceso a cualquier conjuro, incluso fuera de los libros habilitados. Los nombres personalizados se pueden seguir escribiendo eligiendo la opción personalizada del selector.

## Explicaciones de dados y conjuros

**Dados y siglas** está disponible en Combate y Conjuros. Explica dados, modificadores, competencia, CD, salvaciones, ventaja, concentración y componentes con los valores de la ficha activa.

- **1d4 + CAR** significa tirar un dado de cuatro caras y sumar el modificador de Carisma; no la puntuación. Con Carisma 17, el modificador es +3.
- **2d6** significa tirar dos dados de seis caras y sumar ambos.
- Un ataque de conjuro usa **1d20 + tu bono de ataque** contra la CA. Una salvación la tira el objetivo contra tu CD. El modificador no se suma al daño salvo que el efecto lo indique.
- **Explicación y requisitos / Ver detalles** presenta materiales especiales, alcance, duración y las ayudas aplicables. Los componentes costosos o consumidos de los libros habilitados tienen referencias españolas específicas.
- Los materiales ordinarios se resumen como sustituibles por una bolsa o foco válido cuando corresponde. Para usar el ingrediente literal, consultá la fuente. La aplicación no gasta automáticamente materiales ni monedas.

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

El catálogo contiene **520 conjuros**, todos con nombres de referencia y resúmenes de mesa en español. Se conservan las explicaciones detalladas previas de los conjuros principales de Darien. Los resúmenes explican la función del efecto; **no son traducciones íntegras de los libros** y no sustituyen sus tablas, estadísticas de invocaciones, excepciones ni todos los aumentos por espacio. Los nombres ingleses siguen disponibles para buscar. No se incluyen Unearthed Arcana ni las revisiones de 2024. Los 319 textos SRD originales se conservan en los datos como referencia, sin mostrarlos como descripción principal.

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
- `campaign-data.js`, `campaign.js`: libros, razas, trasfondos, listas ampliadas y ayuda de reglas.
- `catalog.js`: catálogo local de conjuros y dotes.
- `progression.js`, `wizard.js`: guía detallada del bardo existente.
- `combat-engine.js`, `combat-ui.js`: acciones, recursos y combate guiado.
- `sw.js`, `manifest.webmanifest`: instalación y caché sin conexión.

## Verificación y fuentes

Se verificaron reglas numéricas para las 13 clases en niveles 1–20; guardados antiguos; libro, preparación y rituales; espacios de pacto y Arcanum; subidas conservando recursos; creación y cambio de fichas; elecciones de invocaciones; conjuros extra ajenos a la clase; acciones de guerrero; descansos; navegación móvil y uso sin conexión. También se verificaron los dropdowns, los filtros de fuentes, la conservación de selecciones anteriores, las listas ampliadas de trasfondos y marcas, los materiales especiales y la cobertura de los 520 resúmenes. Las pruebas no certifican cada interacción especial de todas las subclases.

Fuentes: [reglas básicas 2014](https://www.dndbeyond.com/sources/dnd/basic-rules-2014), SRD 5.1, [datos SRD estructurados](https://github.com/5e-bits/5e-database/tree/main/src/2014/en), [índice Wikidot 2014](https://dnd5e.wikidot.com/) y metadatos de nombres, niveles, listas y requisitos de [5etools](https://github.com/5etools-mirror-3/5etools-src/tree/main/data). Los índices mezclan distintas fuentes: se filtraron las entradas incluidas para excluir UA y 2024. Nivel20 se recibió como referencia, pero su verificación de acceso impidió contrastar el catálogo en esta revisión.

This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

El texto SRD está sujeto a esa licencia. La licencia de los datos estructurados de 5e-bits se incluye en `LICENSE_CATALOG.md`; no se presenta como licencia de los libros comerciales. Los demás nombres y referencias identifican su fuente y no incluyen una reproducción íntegra de esos libros. Aplicación no oficial, sin afiliación con Wizards of the Coast. Ilustraciones creadas para Darien Voss y su compañera.

## Inicio sin personaje (v5.1)

La pantalla inicial es genérica. Cancelar el creador o abrir un enlace directo a Combate o Conjuros no carga una ficha de ejemplo. El selector solo lista fichas realmente guardadas; las entradas vacías de versiones anteriores se ignoran. Si hay una ficha ilegible, se conserva y se ofrece descargar sus datos. Verificado el inicio nuevo, creación, importación, conservación de Darien y uso sin conexión.
