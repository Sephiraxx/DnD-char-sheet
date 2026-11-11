/* Referencia rápida para el DM: trampas, enfermedades, venenos, locura y vehículos.
   Resúmenes propios en español de las reglas de 2014 (los números son los del reglamento). */
(function (root) {
  'use strict';
  const TRAPS = {
    intro:
      'Elegí la gravedad según cuánto querés castigar: un contratiempo molesta, una trampa peligrosa puede dejar a alguien fuera de combate y una mortal puede matar. Detectarla suele pedir Percepción; entenderla, Investigación; desarmarla, herramientas de ladrón o Arcanos si es mágica.',
    severity: [
      ['Contratiempo', 'CD 10–11', '+3 a +5'],
      ['Peligrosa', 'CD 12–15', '+6 a +8'],
      ['Mortal', 'CD 16–20', '+9 a +12'],
    ],
    // nivel de los personajes → daño por gravedad
    damage: [
      ['1–4', '1d10', '2d10', '4d10'],
      ['5–10', '2d10', '4d10', '10d10'],
      ['11–16', '4d10', '10d10', '18d10'],
      ['17–20', '10d10', '18d10', '24d10'],
    ],
    samples: [
      [
        'Techo que se derrumba',
        'Cable trampa a 3 pulgadas del suelo. Percepción CD 10 lo ve; Destreza CD 15 con herramientas de ladrón lo desarma. Si se activa: todos en la zona, salvación de Destreza CD 15 o 4d10 contundente (mitad si salvan); la zona queda como terreno difícil.',
      ],
      [
        'Red que cae',
        'Cable trampa (Percepción CD 10). Una red cubre 10 × 10 pies: quien esté debajo hace Destreza CD 10 o queda apresado y, si falla por mucho, derribado. Se libera con Fuerza CD 10 o cortando la red (CA 10, 20 PG; 5 de daño cortante abren un tramo).',
      ],
      [
        'Estatua que escupe fuego',
        'Placa de presión (Percepción CD 15). Cono de 30 pies: Destreza CD 13 o 4d10 de fuego (mitad si salvan). Calzar la placa con un piolet o púa la anula; disipar magia CD 13 destruye el efecto.',
      ],
      [
        'Fosa',
        'Simple: 10 pies de caída, 1d6 contundente; Percepción CD 10 nota la tapa. Oculta: CD 15 para verla. Con cierre: se traba al caer, Fuerza CD 20 para abrirla desde adentro. Con púas: suma 2d10 perforante; si están envenenadas, Constitución CD 13 o 4d10 de veneno (mitad si salva).',
      ],
      [
        'Dardos envenenados',
        'Placa de presión (Percepción CD 15, Investigación CD 15 para ver los agujeros). Cuatro dardos: ataque +8 contra objetivos al azar a 10 pies; 1d4 perforante y Constitución CD 15 o 2d10 de veneno (mitad si salva).',
      ],
      [
        'Aguja envenenada',
        'En una cerradura. Investigación CD 20 la encuentra; herramientas de ladrón CD 15 la desarma. Si se abre sin la llave: 1 de daño perforante y Constitución CD 15 o 2d10 de veneno y envenenado 1 hora.',
      ],
      [
        'Esfera rodante',
        'Placa de presión (Percepción CD 15). Tirá iniciativa para la esfera (+8): se mueve 60 pies en línea recta por turno. Quien quede en su camino hace Destreza CD 15 o 10d10 contundente y queda derribado. Frenarla: Fuerza CD 20 como acción.',
      ],
      [
        'Esfera de aniquilación',
        'En la boca de una cara tallada. Arcanos CD 20 la identifica. Lo que entra queda destruido; en algunas versiones un conjuro atrae a quien pase cerca (Sabiduría CD 15 para resistir). Disipar magia CD 18 quita la atracción, no la esfera.',
      ],
    ],
  };
  const DISEASES = [
    [
      'Fiebre de la risa',
      'Humanoides (los gnomos son inmunes). Aparece 1d4 horas después: fiebre y desorientación, 1 nivel de agotamiento que no se va hasta curarse. Cada vez que el enfermo sufre estrés (combate, daño, miedo, pesadilla): Constitución CD 13 o 1d10 psíquico e incapacitado de risa 1 minuto (repite la salvación al final de cada turno). Quien empiece su turno a 10 pies de alguien riendo: Constitución CD 10 o se contagia. Al terminar cada descanso largo: Constitución CD 13; con éxito la CD baja 1d6 y al llegar a 0 se cura. Con tres fallos gana una locura indefinida.',
    ],
    [
      'Peste de alcantarilla',
      'Por mordeduras de ratas u otyughs o contacto con inmundicia: Constitución CD 11 o se contagia. Aparece 1d4 días después: 1 nivel de agotamiento, recupera solo la mitad de PG al gastar Dados de Golpe y ninguno por descanso largo. Al terminar cada descanso largo: Constitución CD 11; si falla, +1 agotamiento; si acierta, −1. Se cura cuando el agotamiento baja de 1.',
    ],
    [
      'Podredumbre ocular',
      'Por beber agua contaminada: Constitución CD 15 o se contagia. Un día después la vista se nubla: −1 a ataques y pruebas que dependan de la vista. Al terminar cada descanso largo el penalizador empeora en 1; al llegar a −5 queda cegado hasta que lo cure restauración menor o curar. Remedio: ungüento de eufrasia (kit de herborista, 1 hora por dosis); aplicado antes de un descanso largo evita que empeore y tres dosis curan.',
    ],
  ];
  // [nombre, precio po, vía, CD de Constitución, efecto]
  const POISONS = [
    ['Veneno básico', 100, 'Herida', 10, '1d4 de veneno. Cubre un arma o tres municiones durante 1 minuto.'],
    [
      'Sangre de asesino',
      150,
      'Ingerido',
      10,
      '1d12 de veneno y envenenado 24 h. Si salva: mitad de daño y no queda envenenado.',
    ],
    [
      'Suero de la verdad',
      150,
      'Ingerido',
      11,
      'Envenenado 1 hora: no puede mentir a sabiendas, como en zona de verdad.',
    ],
    ['Veneno de serpiente', 200, 'Herida', 11, '3d6 de veneno; mitad si salva.'],
    [
      'Moco de reptador',
      200,
      'Contacto',
      13,
      'Envenenado 1 minuto y paralizado mientras tanto. Repite la salvación al final de cada turno.',
    ],
    [
      'Veneno drow',
      200,
      'Herida',
      13,
      'Envenenado 1 hora. Si falla por 5 o más, además inconsciente; despierta con daño o si lo sacuden.',
    ],
    [
      'Tintura pálida',
      250,
      'Ingerido',
      16,
      '1d6 de veneno y envenenado. Repite cada 24 h (1d6 por fallo); ese daño no se cura mientras dure. Termina con siete éxitos.',
    ],
    ['Malicia', 250, 'Inhalado', 15, 'Envenenado 1 hora y cegado mientras tanto.'],
    ['Esencia de éter', 300, 'Inhalado', 15, 'Envenenado 8 horas e inconsciente; despierta con daño o si lo sacuden.'],
    ['Aceite de taggit', 400, 'Contacto', 13, 'Envenenado 24 horas e inconsciente; despierta si recibe daño.'],
    [
      'Vapores de othur quemado',
      500,
      'Inhalado',
      13,
      '3d6 de veneno y repite al inicio de cada turno (1d6 por fallo). Termina con tres éxitos.',
    ],
    ['Letargo', 600, 'Ingerido', 15, 'Envenenado 4d6 horas e incapacitado mientras tanto.'],
    ['Veneno de guiverno', 1200, 'Herida', 15, '7d6 de veneno; mitad si salva.'],
    [
      'Lágrimas de medianoche',
      1500,
      'Ingerido',
      17,
      'Sin efecto hasta la medianoche: entonces 9d6 de veneno; mitad si salva.',
    ],
    ['Veneno de gusano púrpura', 2000, 'Herida', 19, '12d6 de veneno; mitad si salva.'],
  ];
  const MADNESS = {
    intro:
      'Ante un horror o una magia que quiebra la mente, pedí una salvación de Sabiduría o Carisma. Calmar emociones suprime la locura mientras dura; restauración menor termina una de corta o larga duración; restauración mayor (o algo más fuerte) hace falta para una indefinida.',
    kinds: {
      short: {
        name: 'Corta duración',
        length: '1d10 minutos',
        effects: [
          'Se encierra en sí mismo: queda paralizado; termina si recibe daño.',
          'Queda incapacitado y pasa el tiempo gritando, riendo o llorando.',
          'Queda asustado y debe usar su acción y movimiento para huir de lo que le da miedo.',
          'Balbucea: no puede hablar con normalidad ni lanzar conjuros.',
          'Debe usar su acción cada turno para atacar a la criatura más cercana.',
          'Sufre alucinaciones vívidas: desventaja en las pruebas de característica.',
          'Hace lo que cualquiera le diga, salvo que sea claramente autodestructivo.',
          'Siente un impulso irresistible de comer algo extraño: tierra, barro, basura.',
          'Queda aturdido.',
          'Cae inconsciente.',
        ],
      },
      long: {
        name: 'Larga duración',
        length: '1d10 × 10 horas',
        effects: [
          'Repite una y otra vez una misma actividad: lavarse las manos, tocar cosas, rezar, contar monedas.',
          'Sufre alucinaciones vívidas: desventaja en las pruebas de característica.',
          'Paranoia extrema: desventaja en las pruebas de Sabiduría y Carisma.',
          'Siente un rechazo intenso por algo (normalmente el origen de la locura), como con antipatía.',
          'Vive un delirio poderoso: elegí una poción; cree estar bajo su efecto.',
          'Se aferra a un «amuleto de la suerte» (persona u objeto): desventaja en ataques, pruebas y salvaciones a más de 30 pies de él.',
          'Queda cegado o ensordecido.',
          'Temblores o tics: desventaja en ataques, pruebas y salvaciones que usen Fuerza o Destreza.',
          'Amnesia parcial: sabe quién es y conserva sus rasgos, pero no reconoce a nadie ni recuerda nada previo.',
          'Cada vez que recibe daño: Sabiduría CD 15 o actúa como bajo confusión durante 1 minuto.',
          'Pierde el habla.',
          'Cae inconsciente; nada lo despierta.',
        ],
      },
      indefinite: {
        name: 'Indefinida',
        length: 'hasta que se cure',
        effects: [
          '«Estar borracho me mantiene cuerdo.»',
          '«Me guardo todo lo que encuentro.»',
          '«Intento parecerme a otra persona: su ropa, sus gestos, su nombre.»',
          '«Tengo que exagerar, torcer la verdad o mentir para resultar interesante.»',
          '«Lo único que me importa es cumplir mi meta; ignoro todo lo demás.»',
          '«Me cuesta que algo de lo que pasa a mi alrededor me importe.»',
          '«No me gusta cómo me juzga la gente todo el tiempo.»',
          '«Soy la persona más lista, sabia, fuerte, rápida y hermosa que conozco.»',
          '«Estoy convencido de que enemigos poderosos me persiguen y sus agentes están en todas partes.»',
          '«Solo puedo confiar en una persona. Y solo yo puedo ver a ese amigo.»',
          '«No puedo tomarme nada en serio: cuanto más grave la situación, más gracia me hace.»',
          '«Descubrí que me gusta mucho matar.»',
        ],
      },
    },
  };
  // [nombre, precio po, velocidad, tripulación, pasajeros, carga (toneladas), CA, PG, umbral de daño]
  const VEHICLES = [
    ['Bote de remos', 50, '1½ mph', 1, 3, '—', 11, 50, '—'],
    ['Barcaza de quilla', 3000, '1 mph', 1, 6, '½', 15, 100, 10],
    ['Drakkar', 10000, '3 mph', 40, 150, '10', 15, 300, 15],
    ['Velero', 10000, '2 mph', 20, 20, '100', 15, 300, 15],
    ['Buque de guerra', 25000, '2½ mph', 60, 60, '200', 15, 500, 20],
    ['Galera', 30000, '4 mph', 80, '—', '150', 15, 500, 20],
    ['Nave voladora', 20000, '8 mph', 10, 20, '1', 13, 300, '—'],
  ];
  const LAND = [
    ['Carro', 15],
    ['Trineo', 20],
    ['Carreta', 35],
    ['Carruaje', 100],
    ['Cuadriga', 250],
  ];
  const VEHICLE_NOTES =
    'Un vehículo es un objeto: inmune al veneno y al daño psíquico. El umbral de daño ignora cualquier golpe que no lo alcance. Sin tripulación suficiente no avanza a velocidad plena. Los botes de remos y las barcazas van por ríos y lagos; a favor de la corriente suman su velocidad (unas 3 mph).';

  root.DmReference = { TRAPS, DISEASES, POISONS, MADNESS, VEHICLES, LAND, VEHICLE_NOTES };
})(typeof window !== 'undefined' ? window : globalThis);
