# Auditoría de miniaturas

Revisá el tablero con cada figura a un tamaño de 64 px por casilla. Usá el mismo zoom, primero sobre piedra oscura y después sobre pasto. Para fichas grandes mantené la escala de 64 px por casilla y comprobá también una vista reducida.

| Comprobación | Criterio |
| --- | --- |
| Silueta | Se reconoce por el contorno. Probá al menos las vistas frontal y de tres cuartos. |
| Rasgos | La raza, el arquetipo y el equipo principal se distinguen con la vista de tablero. |
| Contraste | Cara, extremidades y arma se separan del suelo y de la peana. |
| Identidad | Ninguna ficha vecina comparte silueta y paleta. Compará con los modelos de la misma familia. |
| Postura | La figura comunica su papel. Las amenazas tienen peso, dirección o intención. |
| Escala | La categoría de tamaño figura en los metadatos y la peana mide lo que marca la cuadrícula. Las criaturas pequeñas conservan su peana de una casilla con un cuerpo más bajo. |
| Bando | Los metadatos declaran aliado, enemigo o neutral. Comprobá la elipse en la mesa. |
| Profundidad | La base queda centrada en sus casillas y la figura se ordena bien al poner otra delante. |
| Render | PNG transparente, sombra de contacto suave, extremidades y accesorios completos, anclaje alineado en todos los ángulos. |
| Miniaturas de galería | Cuerpo entero con peana y retrato de cabeza/hombros con encuadres distintos y el mismo nombre del modelo. |

Para cada lote de 10, registrá `id | estado inicial | cambio aplicado | tamaño/bando | resultado sobre piedra y pasto`. Priorizá las figuras más usadas en los encuentros y agrupá especies que puedan confundirse. El primer lote pendiente se elige después de revisar la comparación de las ocho figuras iniciales.

## Exportación y comparación

Desde la raíz del proyecto, exportá las ocho figuras y ejecutá Blender con Cycles habilitado.

```powershell
node tools/export-miniature-models.js .tmp-test/mini-models
blender -b -P render_minis.py -- .tmp-test/mini-models assets/minis
npm run stamp
```

Agregá `--rotations 8` para exportar ocho orientaciones. Para un archivo propio, usá Z hacia arriba y el frente hacia −Y en Blender. Separá la peana y marcala con `role=base` o nombrala `Base`. El modelo necesita la propiedad `size`. También admite `id`, `name`, `faction` y `portrait_target`, una cadena JSON con `[x,y,z,span]` en unidades de casilla. Se puede marcar una geometría `role=equipment` para excluirla del encuadre automático del retrato. Un modelo marcado `no_contact_shadow` puede usar su propio resplandor sobre la peana.

Para comparar dos versiones, usá la misma escena de prueba y la misma ventana. La herramienta no conecta con mesas guardadas.

```powershell
git worktree add --detach .tmp-test/mini-before f29d6a7
node tools/preview-miniatures.js .tmp-test/mini-before 8764
```

En otra terminal desde la raíz del proyecto, ejecutá:

```powershell
node tools/preview-miniatures.js . 8765
```

Abrí [Antes](http://127.0.0.1:8764/board.html#preview) y [Después](http://127.0.0.1:8765/board.html#preview). En ambos, usá **Ver todo el mapa** y quitá el puntero de las fichas antes de capturar. Para revisar el arrastre, mové una ficha a una casilla libre y soltala. Para revisar el orden, poné una figura baja una fila más al sur de una alta. El HTML de tablero carga el paquete Blender si está disponible, y renderiza las figuras personalizadas con el proyectador local.
