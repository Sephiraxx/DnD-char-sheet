# Darien Voss — Cuaderno de viaje

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

La automatización cubre la progresión numérica del **bardo puro, niveles 2–20**, y los rasgos de Elocuencia. El catálogo de conjuros es una selección ampliable, no todos los libros. Multiclase, otras subclases, dotes, objetos mágicos, bonificaciones especiales y Secretos mágicos elegidos como trucos necesitan ajustes manuales y revisión del DM. Agregá rasgos y recursos personalizados desde la ficha.

La aplicación registra recursos y ofrece referencias: no resuelve automáticamente alcance, objetivos, resistencia, inmunidad, ventaja/desventaja ni todas las restricciones de acciones. El efecto de los conjuros y los casos especiales de muerte se resuelven en mesa. Las condiciones se marcan como recordatorio; sus modificadores no se aplican automáticamente a las tiradas. La CA usa base + DES + bono manual.

## Archivos y edición

- `index.html`: estructura de la página.
- `style.css`: diseño adaptable a celular y escritorio.
- `rules.js`: datos iniciales, referencias, cálculos y validación.
- `app.js`: controles y guardado local.
- `sw.js`: caché para uso sin conexión, limitada a la dirección de esta aplicación.
- `assets/`: ilustraciones e icono; sin descargas externas.

Para probar en tu computadora, ejecutá `python3 -m http.server 8000` en esta carpeta y abrí `http://localhost:8000`. No hace falta compilar. Después de cambios en los archivos, incrementá la versión de caché en `sw.js`. Cambiar los datos iniciales no reemplaza las fichas ya guardadas.

## Créditos

Referencias resumidas en español para esta mesa. Colegio de la Elocuencia: *Tasha’s Cauldron of Everything*. Trasfondo comerciante gremial: *Player’s Handbook* 2014. Silvery Barbs: https://www.dndbeyond.com/posts/1371-silvery-barbs-snatch-a-victory-from-the-jaws-of

This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Ilustraciones creadas para Darien Voss y su compañera. Aplicación personal no oficial, sin afiliación con Wizards of the Coast.
