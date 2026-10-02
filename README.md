# Cuaderno de aventura — D&D 5e 2014

## Crear y cambiar de personaje

En la primera visita, elegí **Crear personaje** o **Importar una ficha JSON**. Si ya tenés una abierta, usá **Personajes → Crear personaje**. El creador ocupa toda la pantalla y va paso a paso, una decisión por pantalla: **Clase → Trasfondo → Raza → Características → Habilidades → Conjuros → Equipo → Detalles → Revisar**. Podés empezar en cualquier nivel del 1 al 20.

- Clases, trasfondos, razas y conjuros se eligen con tarjetas, buscador y filtros (por ejemplo «Pega fuerte», «Cura y apoya», «Para empezar»). Las razas se agrupan por familia: elegís «Tiefling» y después su variante.
- Características: repartir valores fijos (la matriz estándar o los que defina el DM), compra de puntos, tirar 4d6 (digital o con tus dados físicos) o escribirlas. Los aumentos de raza se suman solos, incluidos los flexibles +2/+1 o +1/+1/+1, y se pueden reubicar con la opción de Tasha. Se resaltan las características clave de la clase.
- El DM elige en **Mesa → Ajustes** qué métodos se permiten, los valores fijos a repartir, los puntos de compra y un mínimo por tirada (si sale menos, cuenta como el mínimo). Si se vuelve a tirar, la revisión lo muestra.
- El paso de conjuros aparece solo si la clase lanza a ese nivel: trucos, conocidos, preparados o libro de mago con sus límites, y los siempre preparados de la subclase.
- El borrador se guarda en el dispositivo: «Salir» (o Esc) lo conserva y al volver se retoma. La aplicación no elige por vos; lo que quede pendiente aparece en la ficha.
- Hay 13 clases: artificiero, bárbaro, bardo, clérigo, druida, guerrero, monje, paladín, explorador, pícaro, hechicero, brujo y mago.
- Cada ficha tiene guardado, respaldo, historial de la sesión y borrador de subida independientes. Crear otra nunca reemplaza a las demás.
- La primera visita muestra únicamente Crear personaje e Importar ficha. No crea un personaje de ejemplo. Si ya tenés una ficha guardada, abre la última seleccionada. Las fichas de la primera versión (sin clase) se convierten solas en fichas de bardo.
- Elegí si empezás con recursos completos o si necesitás confirmar los actuales. Los objetos escritos en el inventario no modifican la CA automáticamente.
- **Personaje → Características y armadura** permite ajustar velocidad, fórmula de CA y característica de lanzamiento.

## Libros, razas y trasfondos

Se pueden habilitar **30 libros de la línea 2014**, hasta The Book of Many Things (noviembre de 2023): PHB, Xanathar, Tasha, Costa de la Espada, Strixhaven, Ravnica, Eberron, Tome of Foes, Volo, Elemental Evil, Monsters of the Multiverse, Wildemount, Theros, Van Richten, Fizban, Witchlight, Spelljammer, Dragonlance, Glory of the Giants, Planescape, The Book of Many Things, Acquisitions Incorporated, Saltmarsh, Tomb of Annihilation, Descent into Avernus, Icewind Dale, Lost Laboratory of Kwalish y los suplementos One Grung Above, Locathah Rising y The Tortle Package. Quedan fuera Unearthed Arcana, Plane Shift y los libros de 2024.

Por defecto siguen habilitados **PHB 2014, Xanathar, Tasha, Costa de la Espada, Strixhaven, Ravnica, Eberron: Rising from the Last War y Mordenkainen: Tome of Foes**; el DM elige los de su mesa en **Mesa → Ajustes** y cada ficha conserva su selección desde **Libros habilitados**. Monsters of the Multiverse no reemplaza a Volo ni a Tome of Foes: ambas versiones aparecen con su fuente para que la mesa elija.

El creador y **Personaje → Elegir / cambiar** incluyen **155 razas o variantes** y **78 trasfondos**. Además de las de los ocho libros por defecto, suman aasimar, firbolg, goliat, kenku, hombre lagarto, tabaxi, tritón, yuan-ti, genasi, aarakocra, leonino, sátiro, dhampir, sangre bruja, renacido, dracónidos de Fizban y de Wildemount, hada, harengon, las razas de Spelljammer, kender, verdan, locathah, grung y tortuguino, y trasfondos como Atormentado, Investigador, Caballero de Solamnia, Tallador de runas, Guardián del portal, Recompensado y Arruinado. Las versiones con aumentos flexibles (+2/+1 o +1/+1/+1) lo indican. Las armaduras naturales (hombre lagarto, tortuguino, locathah, autognomo, thri-kreen) entran en el cálculo de CA.

Las razas y trasfondos se generan con `node tools/build-origins.js <carpeta con races.json y backgrounds.json de 5etools>`, que solo toma nombres, números y competencias; `--check` compara la conversión con lo existente sin escribir.

Las tarjetas muestran fuente, tamaño, velocidad, aumentos de referencia, competencias, magia de linaje y decisiones pendientes. **Elegir una raza no suma automáticamente sus bonos a las puntuaciones o CA**: las puntuaciones ingresadas ya son finales. Por ejemplo, el +1 de CA del Forjado se registra una vez en bonos de CA. Dotes, equipo, usos de magia racial y condiciones de vuelo se completan según el rasgo. No se añaden objetos o monedas inventados.

Algunos trasfondos de Strixhaven y Ravnica y las marcas de Eberron amplían la lista de la clase: esos conjuros aparecen como opciones normales al tener acceso al nivel. Esto **no significa conocerlos ni tenerlos preparados**, ni concede espacios extra. Las dotes y magia innata son elecciones separadas, con su propia característica y límites. Por ejemplo, elegí y registrá Iniciado de Strixhaven para el trasfondo que lo otorga.

Los ocho libros por defecto habilitan **483 conjuros únicos** de los 524 del catálogo; con todos los libros están los 524 conjuros y 105 dotes de la línea 2014. Los de Costa de la Espada reeditados en Tasha se encuentran desde ambas fuentes y usan el texto corregido de la línea 2014. Un libro puede aportar razas, trasfondos o ampliar listas sin incorporar conjuros exclusivos nuevos; Tome of Foes no aporta conjuros exclusivos a este índice.

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

**Defensas:** la ficha junta las resistencias, inmunidades y vulnerabilidades de la raza, de la Furia mientras dura y las que anotás (objetos, conjuros, rasgos) en la tarjeta «Defensas». El daño con tipo se ajusta solo: el que manda el DM (con tipo en su diálogo), los ataques de monstruos (con el tipo de cada parte), las salvaciones de área y el que anotás vos. El mensaje dice qué se aplicó.

**Subir de nivel** abre una guía paso a paso a pantalla completa, con solo los pasos que corresponden: qué ganás (rasgos, espacios, competencia), PG (promedio o tirada, digital o con tu dado), subclase, mejora de características o dote (con buscador), conjuros nuevos (trucos, conocidos, libro de mago y preparados, con sus límites) y opciones de clase (estilos, invocaciones, Metamagia, maniobras…) con sus requisitos; las invocaciones que piden un pacto se habilitan al elegirlo. Los PG actuales y recursos gastados se conservan: subir no equivale a descansar. Lo que quede sin elegir aparece como pendiente en Clase.

Las opciones muestran requisitos de referencia. Los efectos de una dote, raza o elección especial deben aplicarse explícitamente en la ficha; un selector no sustituye la revisión de esos requisitos. Para decisiones internas de los rasgos (terrenos, enemigos, ascendencia, formas, objetos infundidos, etc.) usá **Notas de clase**. Podés añadir rasgos y contadores personalizados. Los rasgos opcionales se habilitan desde **Subclase y Pericias**; revisá cuáles reemplazan otros.

## Agregar cualquier conjuro

En **Conjuros → Agregar / preparar conjuros**:

- **Mi clase y seleccionados** muestra la lista aplicable y las elecciones previas.
- **Todo el catálogo → Extra del DM** permite agregar cualquier conjuro, sin bloqueo por clase, fuente o nivel. No ocupa las elecciones normales de la clase.
- Un extra puede usar espacios o tener lanzamiento sin espacio autorizado. Si tiene usos limitados por día, llevá ese límite mediante un recurso personalizado; la opción sin espacio no impone un límite por sí sola.
- Si falta una entrada, **Crear conjuro propio** permite registrar nombre, nivel, tiempo, componentes, efecto y demás datos.

Se distinguen conjuros conocidos, preparados, libro de mago, conjuros siempre preparados por subclase, Secretos mágicos y Arcanum del brujo. El mago conserva los rituales del libro aunque no estén preparados. Los espacios de pacto tienen su nivel propio y se recuperan con descanso corto. Un conjuro extra no concede espacios adicionales.

El catálogo contiene **524 conjuros**, todos con nombres de referencia y resúmenes de mesa en español. Los resúmenes explican la función del efecto; **no son traducciones íntegras de los libros** y no sustituyen sus tablas, estadísticas de invocaciones, excepciones ni todos los aumentos por espacio. Los nombres ingleses siguen disponibles para buscar. No se incluyen Unearthed Arcana ni las revisiones de 2024. Los 319 textos SRD originales se conservan en los datos como referencia, sin mostrarlos como descripción principal.

Caballero arcano y Embaucador arcano: las restricciones de escuelas y excepciones de aprendizaje se revisan en mesa. Los conjuros opcionales, reemplazos especiales y elecciones internas de listas de subclase pueden requerir registro manual.

## Combate y descansos

- **Tiradas:** pruebas, salvaciones, iniciativa, ataques, conjuros, concentración y salvaciones de muerte abren un diálogo con ventaja o desventaja preseleccionada según tus condiciones, la Inspiración del DM y la opción «Uso mis propios dados» para anotar dados físicos.
- **Conjuros:** al lanzar uno con ataque, salvación o dados se abre su tirada: ataque de conjuro, CD para los objetivos y daño o curación (trucos escalados por nivel y espacios superiores). Los dados salen del texto y se pueden corregir.
- **Mesa:** el DM da Inspiración; los jugadores ven el orden de iniciativa y quién tiene la aplicación abierta.

- **Mi turno** inicia el seguimiento y recupera acción, adicional y reacción. **Terminar turno** conserva la reacción gastada y habilita registrar reacciones durante turnos ajenos.
- Elegí acción, adicional o reacción y filtrá por nivel de conjuro. Al lanzar, elegís el espacio disponible. Los trucos no gastan espacios.
- La restricción de conjuros de acción adicional de 2014 se aplica en ambos órdenes durante el seguimiento.
- El combate ofrece recursos principales de cada clase y acciones frecuentes: Inspiración, Rabia, Segundo aliento, Acción súbita, ki, puntos de hechicería, Canalizar divinidad, Forma salvaje y otras según el nivel.
- **Vista compacta** (botón en Combate, se recuerda en cada dispositivo): PG, CA, iniciativa, CD y velocidad siempre visibles arriba; acción, adicional y reacción; recursos como fichas tocables; y una lista corta de ataques, rasgos y conjuros. Marcá ☆ en un conjuro para que la vista compacta muestre solo tus favoritos.
- **Acción súbita:** registrá primero tu acción y después usá el rasgo para habilitar la segunda. No concede otra acción adicional.
- Los Dados de Golpe usan el dado de la clase. En descanso corto se suma CON a cada dado, con mínimo de 0 PG por dado. Los recursos se recuperan según su descanso; el descanso largo devuelve hasta la mitad del máximo de Dados de Golpe (mínimo uno).
- El daño recuerda las salvaciones de concentración. Ataques, daño a enemigos, alcance, componentes, objetivos, condiciones y duraciones se resuelven en mesa.

El combate automatiza recursos y acciones comunes, **no todos los efectos de las 118 subclases**. Por ejemplo, las formas del druida, mascotas, bonificaciones de objetos y reacciones especiales pueden necesitar notas, ajustes o la opción del DM. La multiclase calcula nivel de lanzador, espacios (con el pacto del brujo aparte), competencias y rasgos de cada clase. La velocidad y los bonos de equipo se registran manualmente. Las condiciones son recordatorios y no alteran todas las tiradas.

## Mesa compartida (party y DM)

Opcional. Con la mesa configurada, cada jugador se une con un código y la party se ve en vivo:

- **Jugadores — sección Mesa:** unirse con el código de 6 letras, ver PG, CA, estados, concentración, espacios y percepción pasiva de toda la party, tiradas compartidas y pedidos de tirada del DM. La ficha sigue guardándose en el dispositivo y funciona sin conexión; los cambios se suben al volver.
- **DM — `dm.html` (botón «Soy el DM»):** crear la mesa, panel con todas las fichas, daño y curación, estados, pedidos de tirada con CD (las respuestas llegan solas), entrega de monedas y objetos, mensajes, descansos y subidas de nivel, iniciativa con criaturas que marca el turno en la ficha de cada jugador, y notas privadas.
- Las órdenes del DM las aplica la ficha del jugador con sus propias reglas (PG temporales, concentración, estados). Si el jugador está sin conexión, se aplican al abrir la ficha.
- Sin cuentas obligatorias: cada navegador recibe un acceso anónimo. Guardarlo con un email permite abrir las mismas fichas en otros dispositivos y no perderlas si se borran los datos del navegador.

### Combate compartido

- El DM arma el encuentro en **Iniciativa**: agrega a la party, monstruos del SRD o criaturas propias (con PG, CA y salvaciones que solo ve el DM) y puede ocultar criaturas hasta revelarlas.
- Los jugadores ven el orden y el estado de cada criatura con palabras (Ileso, Herido, Malherido, A punto de caer, Derrotado), nunca sus PG ni su CA.
- Al atacar o lanzar un conjuro se elige el objetivo. Contra una criatura, el servidor compara la tirada con la CA oculta y descuenta el daño. Las curaciones y los efectos (Bendición, Inspiración bárdica…) se aplican a uno mismo o a aliados.
- **Juntar cuentas:** una sola cuenta (email y contraseña) sirve para todas tus mesas y DMs. Si en otro dispositivo jugaste sin guardar el acceso y después usás un email que ya tiene cuenta (al guardar o al entrar), la aplicación ofrece «Juntar con mi cuenta»: con la contraseña de esa cuenta, las fichas, mesas y mesas de DM de ese dispositivo pasan a tu cuenta. Nada se borra. Requiere `supabase/migrations/006_account_merge.sql`.
- **Sesiones:** el DM toca «Empezar sesión» y, al terminar, «Terminar sesión»: reparte experiencia (sugerida con las criaturas derrotadas en la iniciativa) o habilita la subida de nivel para todos, y deja notas. Cada jugador ve un resumen; a quien no guardó su acceso con email se le pide que lo guarde. Quien no estaba conectado recibe la experiencia y el resumen al abrir su ficha. La ficha muestra los PX y cuántos faltan para el próximo nivel; el registro de sesiones queda en la pantalla del DM.
- **Encuentros preparados:** el DM arma peleas antes de la sesión (monstruos del SRD o propios, con PG ya tirados) en «Encuentros preparados». Se guardan en su dispositivo y nadie los ve. «¡Lanzar!» suma la party y todas las criaturas, tira su iniciativa, pide la de los jugadores y muestra en todas las pantallas un aviso animado (¡Combate!, ¡Emboscada!, ¡Peligro! o un texto propio).
- **Animación por tipo de criatura:** detrás del aviso se ve una escena según la criatura más peligrosa: niebla y calaveras (muertos vivientes), círculo de runas (magos, cultistas, nigromantes), llamas y la sombra de un ala con el color del dragón (fuego, hielo, rayo, veneno, ácido), grietas y pisotones (gigantes, troles, ogros), fuego infernal y sigilo (demonios y diablos), tentáculos y un ojo (aberraciones), zarpazos (bestias), andanada de flechas y tambores (goblins, orcos, kobolds, gnolls), telarañas (arañas) y escenas para elementales, constructos, plantas, cienos, feéricos, celestiales y enjambres. Cubre los 334 monstruos del SRD; las criaturas propias eligen su animación y el DM puede fijar otra o verla antes con «Ver animación».
- Las criaturas también se pueden agregar ocultas en plena pelea; «Revelar ocultas» las muestra todas juntas con el aviso «¡Refuerzos!».
- Los conjuros de salvación sobre criaturas le llegan al DM como **Salvaciones pendientes**: tira por cada criatura (o anota su dado) y se aplica el daño completo o la mitad.
- **Áreas y fuego amigo:** en un conjuro de salvación (Bola de fuego, Manos ardientes…) también se marca a los aliados o a uno mismo si quedan dentro. Cada ficha alcanzada recibe el pedido, tira su salvación y se aplica el daño completo o la mitad. Las acciones de salvación de los monstruos (alientos, auras) funcionan igual: el DM tira o ajusta el daño, elige quiénes quedan en el área y cada jugador salva. Requiere `supabase/migrations/005_area_saves.sql`.
- «Terminar turno» de un jugador pasa la iniciativa al siguiente. Los turnos de las criaturas los pasa el DM.

### Configurar el servidor (una sola vez)

1. Crear un proyecto gratuito en [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers:** activar **Allow anonymous sign-ins**.
3. **SQL Editor:** pegar el contenido de `supabase/schema.sql` y ejecutar. Si la mesa ya existía, ejecutar en orden los archivos nuevos de `supabase/migrations/`.
4. **Project Settings → API:** copiar la **Project URL** y la clave pública (**anon** / **publishable**) en `config.js`. La clave pública puede publicarse; los permisos están en las políticas del esquema. Nunca uses la clave `service_role` / secreta.
5. **Authentication → URL Configuration:** en *Site URL* poner `https://sephiraxx.github.io/DnD-char-sheet/` y en *Redirect URLs* agregar `https://sephiraxx.github.io/DnD-char-sheet/**` (y `http://localhost:8080/**` para probar). Lo usan los enlaces de acceso por email.
6. Opcional: **Attack Protection → Captcha** con Cloudflare Turnstile; la clave pública del sitio va en `config.js` (`captchaSiteKey`).
7. Publicar los cambios (GitHub Pages).

### Acceso con email y contraseña

En **Mesa → Tu acceso** (o en la pantalla del DM) cada uno puede guardar su acceso con un email y una contraseña. En otro dispositivo, la pantalla inicial ofrece «¿Ya tenés una ficha en una mesa?»: se entra con esos datos y las fichas y mesas de esa cuenta se traen al dispositivo, sincronizadas.

No se envían correos, así que no hay límite de envíos. Requisito en Supabase: **Authentication → Sign In / Providers → Email → Confirm email** desactivado. Si alguien olvida su contraseña, se la reinicia desde **Authentication → Users**.

## Guardado, copias y uso sin conexión

Todo se guarda **en ese navegador y dispositivo**. Las fichas que están en una mesa compartida también se sincronizan con ella y, con el acceso guardado (email y contraseña), se abren en otros dispositivos. Sin mesa, GitHub Pages publica la aplicación pero no almacena ni sincroniza las fichas. Para trasladar una ficha usá **Personajes → Exportar personaje actual** e **Importar como personaje nuevo**. La importación tradicional de Mi ficha reemplaza solo la ficha activa, después de confirmar.

Guardá copias JSON periódicas: borrar los datos del navegador elimina los guardados locales. Cambiar el dominio o navegador requiere exportar e importar. Después de una carga completa por HTTPS se puede volver a abrir sin conexión en navegadores compatibles. Los enlaces externos de referencia sí requieren conexión.

Los avisos temporales se cierran automáticamente o con ×. Si una actualización no aparece, cerrá las pestañas de la aplicación y abrila con conexión; no borres el almacenamiento.

## Verificación y fuentes

Se verificaron reglas numéricas para las 13 clases en niveles 1–20; guardados antiguos; libro, preparación y rituales; espacios de pacto y Arcanum; subidas conservando recursos; creación y cambio de fichas; elecciones de invocaciones; conjuros extra ajenos a la clase; acciones de guerrero; descansos; navegación móvil y uso sin conexión. También se verificaron los dropdowns, los filtros de fuentes, la conservación de selecciones anteriores, las listas ampliadas de trasfondos y marcas, los materiales especiales y la cobertura de los 520 resúmenes. Las pruebas no certifican cada interacción especial de todas las subclases.

Fuentes: [reglas básicas 2014](https://www.dndbeyond.com/sources/dnd/basic-rules-2014), SRD 5.1, [datos SRD estructurados](https://github.com/5e-bits/5e-database/tree/main/src/2014/en), [índice Wikidot 2014](https://dnd5e.wikidot.com/) y metadatos de nombres, niveles, listas y requisitos de [5etools](https://github.com/5etools-mirror-3/5etools-src/tree/main/data). Los índices mezclan distintas fuentes: se filtraron las entradas incluidas para excluir UA y 2024. Nivel20 se recibió como referencia, pero su verificación de acceso impidió contrastar el catálogo en esta revisión.

This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

El texto SRD está sujeto a esa licencia. La licencia de los datos estructurados de 5e-bits se incluye en `LICENSE_CATALOG.md`; no se presenta como licencia de los libros comerciales. Los demás nombres y referencias identifican su fuente y no incluyen una reproducción íntegra de esos libros. Aplicación no oficial, sin afiliación con Wizards of the Coast. Ilustraciones creadas para Darien Voss y su compañera.

## Inicio sin personaje (v5.1)

La pantalla inicial es genérica. Cancelar el creador o abrir un enlace directo a Combate o Conjuros no carga una ficha de ejemplo. El selector solo lista fichas realmente guardadas; las entradas vacías de versiones anteriores se ignoran. Si hay una ficha ilegible, se conserva y se ofrece descargar sus datos. Verificado el inicio nuevo, creación, importación, conversión de fichas antiguas y uso sin conexión.

## Desarrollo

La aplicación no tiene paso de compilación: los archivos de la raíz se publican tal cual en GitHub Pages.

```bash
npm install        # instala Prettier
npm run serve      # sirve la app en http://localhost:8080
npm run format     # formatea el código y actualiza la versión de sw.js
npm run stamp      # solo actualiza la versión de sw.js
npm run check      # verifica formato y corre las pruebas (node --test)
```

Las pruebas cargan los scripts del navegador en Node (`test/load.js`) y usan fichas de ejemplo de `test/fixtures/`. La app abre desde la caché del service worker (al instante y sin red). La versión de esa caché es un resumen del contenido de los archivos: después de cualquier cambio corré `npm run stamp` (o `npm run format`), y `npm run check` falla si te lo olvidás. Un archivo nuevo de la app va también en la lista `FILES` de `sw.js`. Los celulares instalan la versión nueva en segundo plano: si la app recién se abrió se recarga sola; si está en uso, aparece «Hay una versión nueva» con un botón para actualizar. En localhost el service worker sigue pidiendo todo a la red.
