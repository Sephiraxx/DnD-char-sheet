# Darien Voss — Cuaderno de viaje · versión 2

Ficha personal en español para D&D 5e **2014**, preparada para GitHub Pages y para usar desde el celular. No necesita instalación de dependencias, servidor de aplicación, cuenta ni claves.

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub (público si usás el plan gratuito).
2. Descomprimí este ZIP. Subí **su contenido** al repositorio: `index.html` debe quedar en la raíz, junto con `app.js`, `rules.js`, `style.css` y la carpeta `assets`. No subas solamente el ZIP. Conservá también `sw.js`, `manifest.webmanifest` y `.nojekyll`.
3. En **Settings → Pages**, elegí **Deploy from a branch**, rama **main** y carpeta **/(root)**. Guardá.
4. Cuando termine la publicación, abrí la dirección que muestra GitHub, normalmente `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.

Referencia oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Primera sesión

- Darien empieza como **bardo 2**. Confirmá los PG y recursos actuales: no se presupone que descansaste. Los 17 PG máximos sugeridos usan aumento fijo.
- Confirmá las monedas: 15 po es el equipo inicial, no un saldo verificado después de las aventuras. El inventario inicial también es editable.
- **Detectar magia** está como regalo adicional del DM: no ocupa un conjuro conocido. Su ritual no gasta espacio; lanzarlo normalmente sí. El regalo de un conjuro no aumenta el máximo de espacios.
- **Silvery Barbs** está disponible en «Gestionar conjuros» para completar tu quinto conjuro de nivel 1; todavía no está seleccionado.
- Se incluyen la mula y las notas e imagen de tu esposa elfa. Sus nombres y notas se pueden cambiar.

## Qué podés hacer

- Registrar daño, curación, PG temporales, concentración, reacción, condiciones y salvaciones de muerte.
- Gastar y recuperar espacios, Inspiración y Dados de Golpe. Registrar descansos cortos y largos.
- Consultar conjuros, registrar lanzamientos y rituales, agregar referencias propias y elegir el repertorio.
- Subir como bardo: PG fijos o tirados, espacios, competencia, pericias y mejoras de características. El plan de Elocuencia está incluido; los recursos gastados se conservan al subir.
- Editar equipo, cantidades, ubicación y pesos; llevar monedas, ingresos y gastos.
- Tirar dados, consultar habilidades y rasgos, escribir notas y revisar el registro de cambios.
- Deshacer cambios recientes y exportar/importar copias JSON.

## Guardado y uso sin conexión

La ficha se guarda automáticamente **en ese navegador**. GitHub publica la aplicación; no almacena ni sincroniza tu progreso. Para pasar del celular a la PC, exportá una copia JSON desde «Mi ficha» e importala en el otro dispositivo. Guardá copias periódicas: borrar los datos del navegador elimina el guardado local. Los datos importados se validan antes de reemplazar la ficha.

Después de una primera carga completa por HTTPS, la aplicación puede volver a abrirse sin conexión en navegadores compatibles. Guardá el enlace en la pantalla de inicio si tu navegador lo permite. Para actualizar la aplicación, subí los archivos nuevos y abrila con conexión; tu guardado permanece en el mismo dominio. Cambiar de dirección o navegador requiere exportar/importar.

## Alcance de las reglas

La automatización cubre la progresión numérica del **bardo puro, niveles 2–20**, y los rasgos de Elocuencia. El catálogo contiene 520 conjuros de la línea 2014, 157 marcados para la lista de bardo (incluida la ampliación opcional), y 102 dotes indexadas de los libros incluidos. Contiene 319 textos completos SRD en inglés; conserva los resúmenes españoles anteriores y añade nombres españoles para muchos conjuros. Las entradas que no son SRD muestran metadatos y una referencia oficial; sus efectos completos se consultan en el libro. No incluye Unearthed Arcana, homebrew ni las revisiones de 2024. Multiclase, otras subclases, dotes, objetos mágicos y bonificaciones especiales necesitan ajustes manuales y revisión del DM. Los Secretos mágicos sí están guiados, incluidos los elegidos como trucos. Agregá rasgos y recursos personalizados desde la ficha.

La aplicación registra recursos y ofrece referencias: no resuelve automáticamente alcance, objetivos, resistencia, inmunidad, ventaja/desventaja ni todas las restricciones de acciones. El efecto de los conjuros y los casos especiales de muerte se resuelven en mesa. Las condiciones se marcan como recordatorio; sus modificadores no se aplican automáticamente a las tiradas. La CA usa base + DES + bono manual.

## Archivos y edición

- `index.html`: estructura de la página.
- `style.css`: diseño adaptable a celular y escritorio.
- `rules.js`: datos iniciales, referencias, cálculos y validación.
- `app.js`: controles y guardado local.
- `catalog.js`: catálogo local de conjuros, dotes y fuentes.
- `progression.js`: reglas y validación de elecciones de la subida.
- `wizard.js`: guía paso a paso, borradores y explorador del catálogo.
- `sw.js`: caché para uso sin conexión, limitada a la dirección de esta aplicación.
- `assets/`: ilustraciones e icono; sin descargas externas.

Para probar en tu computadora, ejecutá `python3 -m http.server 8000` en esta carpeta y abrí `http://localhost:8000`. No hace falta compilar. Después de cambios en los archivos, incrementá la versión de caché en `sw.js`. Cambiar los datos iniciales no reemplaza las fichas ya guardadas.

## Créditos

Referencias resumidas en español para esta mesa. Colegio de la Elocuencia: *Tasha’s Cauldron of Everything*. Trasfondo comerciante gremial: *Player’s Handbook* 2014. Silvery Barbs: https://www.dndbeyond.com/posts/1371-silvery-barbs-snatch-a-victory-from-the-jaws-of

This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Ilustraciones creadas para Darien Voss y su compañera. Aplicación personal no oficial, sin afiliación con Wizards of the Coast.

## Actualizar una página ya publicada

1. Antes de actualizar, exportá una copia JSON de tu ficha desde la página actual.
2. Reemplazá los archivos del repositorio con **todo** el contenido de este ZIP, incluidos los tres archivos nuevos: `catalog.js`, `progression.js` y `wizard.js`.
3. Abrí la misma dirección con conexión y recargá. Si todavía ves la versión anterior, hacé una recarga completa. La caché pasa a la versión 2 automáticamente.
4. Los guardados y las copias JSON de la versión anterior siguen siendo compatibles. No uses «Reiniciar ficha» para actualizar.

## Guía de subida de nivel

«Subir de nivel» muestra solo los pasos que correspondan:

- Vista previa de los aumentos automáticos y de las elecciones pendientes.
- PG fijos o resultado de un d8 tirado en mesa.
- Colegio en nivel 3: Elocuencia está automatizado; otros colegios conservan el modo manual.
- Dos Pericias en niveles 3 y 10, entre tus habilidades con competencia.
- Mejoras de características o elección de una dote, si tu DM permite dotes. El catálogo muestra requisitos; sus efectos se anotan y se aplican manualmente en la ficha.
- Completar conjuros pendientes del nivel anterior usando el límite anterior.
- Nuevos trucos y conjuros de niveles disponibles; búsqueda por nombre y nivel.
- Reemplazo opcional de un conjuro de nivel 1 o mayor por otro de la lista de bardo.
- Dos Secretos mágicos en niveles 10, 14 y 18. Un truco elegido así consume una elección de Secretos y cuenta dentro del total de conjuros conocidos, sin ocupar un truco normal.
- Versatilidad bárdica opcional de Tasha en niveles con mejora: cambiar un truco normal o una Pericia.
- Resumen final; la ficha solo cambia cuando confirmás.

El primer paso permite habilitar las fuentes y opciones acordadas con tu DM. También podés hacerlo sin subir de nivel desde Conjuros → Fuentes y opciones. Por defecto se habilita el Manual del Jugador 2014. Para elegir Silvery Barbs, habilitá Strixhaven. Las elecciones que ya tuvieras guardadas se conservan aunque su fuente no esté marcada.

Cerrar la guía guarda un borrador separado. Reabrirla recupera ese borrador si la ficha no cambió. «Descartar borrador» no modifica el personaje. Las elecciones confirmadas quedan en el historial; podés deshacer la última subida.

Las dotes y los conjuros concedidos por dotes no se aplican automáticamente: registrá sus elecciones, usos gratuitos y restricciones según la dote. El requisito mostrado en el catálogo se revisa con el DM; el selector no sustituye esa revisión.

Fuentes de verificación: clase de bardo Legacy en https://www.dndbeyond.com/classes/1-bard y SRD 5.1. Texto estructurado SRD de https://github.com/5e-bits/5e-database/tree/main/src/2014/en. Índices contrastados con las listas 2014 de Wikidot; se eliminaron entradas UA y duplicadas y se corrigió la inclusión opcional de Prismatic Spray.

Validación de esta versión: migración de guardados anteriores; reglas de niveles 3–20 y Secretos mágicos como trucos; guía móvil en navegador para niveles 3 y 4; elecciones incompletas, búsqueda y catálogo; cierre y recuperación de borrador sin modificar la ficha; conservación de PG actuales y recursos.
