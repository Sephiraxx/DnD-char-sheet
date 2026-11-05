/* Opciones compartidas: se cargan igual para todos antes de crear, validar o subir una ficha. */
(function (root) {
  'use strict';
  const SOURCE = 'TDCSR';
  const TITLE = "Tal'Dorei: Escenario de campaña renacido (terceros)";
  const SOURCE_BOOK = '94b03db20e9c61a6';
  const spell = (id, name, english, level, school, range, duration, components, materialEs, text, extra = {}) => ({
    id,
    name,
    english,
    level,
    school,
    range,
    duration,
    components,
    materialEs,
    time: 'Acción',
    concentration: duration.startsWith('Concentración'),
    ritual: false,
    bard: false,
    optionalBard: false,
    source: TITLE,
    sourceKey: SOURCE,
    sources: [SOURCE],
    sourcePage: 189,
    bookId: SOURCE_BOOK,
    pdfPage: 190,
    summaryEs: true,
    referenceOnly: false,
    brief: text,
    text,
    classes: ['druid', 'ranger', 'sorcerer'],
    ...extra,
  });
  const spells = [
    spell(
      'freedom-of-the-waves',
      'Libertad de las olas',
      'Freedom of the Waves',
      3,
      'Conjuración',
      '120 pies',
      'Instantáneo',
      'V, S, M',
      'Un mechón de pelo mojado.',
      'Elegí un punto en alcance: el agua ocupa un cilindro de 15 pies de radio y 10 de alto. Las criaturas hacen una salvación de Fuerza; al fallar sufren 2d8 de daño contundente y caen derribadas. Podés hacer que tantas criaturas como tu modificador de lanzamiento (mínimo una) superen la salvación automáticamente. Si estás en el cilindro, podés teletransportarte a otro espacio visible y libre dentro de él al lanzar.',
      { saveAbility: ['Fuerza'], damageTypes: ['contundente'], dice: { dmg: [['2d8', 'contundente']] } },
    ),
    spell(
      'freedom-of-the-winds',
      'Libertad de los vientos',
      'Freedom of the Winds',
      5,
      'Abjuración',
      'Personal',
      'Concentración, hasta 10 minutos',
      'V, S, M',
      'Un trozo de lona de vela.',
      'Volás a 60 pies y tenés ventaja para evitar agarres y las salvaciones contra quedar apresado o paralizado. Si un conjuro o ataque te elige como objetivo, podés usar tu reacción para teletransportarte hasta 60 pies a un espacio visible y libre. Si quedás fuera del alcance del efecto, este no te afecta; el conjuro termina tras ese teletransporte.',
    ),
  ];
  const feature = (name, level, es) => ({ name, level, source: SOURCE, text: '', children: [], es, pdfPage: 189 });
  const subclass = {
    id: 'paladin-oath-of-the-open-sea',
    classId: 'paladin',
    name: 'Juramento del Mar Abierto',
    english: 'Oath of the Open Sea',
    source: SOURCE,
    bookId: SOURCE_BOOK,
    pdfPage: 189,
    caster: null,
    ability: null,
    cantrips: null,
    known: null,
    choices: [],
    features: [
      feature(
        'Conjuros del juramento',
        3,
        'Los conjuros de este juramento quedan siempre preparados al llegar a sus niveles. No consumen tus elecciones normales de preparados.',
      ),
      feature(
        'Canalizar Divinidad: Capa marina',
        3,
        'Acción y un uso de Canalizar Divinidad: una niebla de 20 pies te acompaña durante 10 minutos. Vos y las criaturas a 5 pies de vos tratáis el área como ligeramente oscurecida; para las demás está muy oscurecida. Se termina a voluntad, sin acción.',
      ),
      feature(
        'Canalizar Divinidad: Furia de las mareas',
        3,
        'Acción adicional y un uso de Canalizar Divinidad. Durante 1 minuto, una vez por turno al impactar con un arma podés empujar 10 pies. Si el objetivo choca con otra criatura u obstáculo, recibe daño contundente igual a tu modificador de CAR.',
      ),
      feature(
        'Aura de Liberación',
        7,
        'Vos y los aliados elegidos a 10 pies evitáis agarres y restricciones e ignoráis sus penalizaciones de movimiento y ataque bajo el agua mientras no estéis incapacitados. Una sujeción no mágica previa se puede abandonar gastando 5 pies de movimiento. El radio aumenta a 30 pies en nivel 18.',
      ),
      feature(
        'Aguas tempestuosas',
        15,
        'Cuando una criatura entra o sale de tu alcance, podés usar tu reacción para infligirle 1d12 de daño contundente. Una salvación de FUE contra tu CD evita que también caiga derribada.',
      ),
      feature(
        'Espadachín mítico',
        20,
        'Acción, una vez por descanso corto o largo, durante 1 minuto: ventaja en Atletismo, escalada igual a tu velocidad (o el doble si ya la tenías), ventaja al atacar a una criatura si solo ella está a 5 pies, Correr o Destrabarse como adicional, y ventaja en pruebas y salvaciones de DES contra efectos visibles. Aplicá estos efectos en la mesa.',
      ),
    ],
    spells: [
      {
        prepared: {
          3: ['create or destroy water', 'expeditious retreat'],
          5: ['augury', 'misty step'],
          9: ['call lightning', 'freedom of the waves'],
          13: ['control water', 'freedom of movement'],
          17: ['commune with nature', 'freedom of the winds'],
        },
      },
    ],
  };
  function apply(target = root) {
    if (!target.Catalog || !target.ClassData || !target.CampaignData) throw Error('Faltan los catálogos base.');
    target.CampaignData.sources[SOURCE] = TITLE;
    if (!target.Catalog.sources.some(([id]) => id === SOURCE)) target.Catalog.sources.push([SOURCE, TITLE]);
    for (const sp of spells) {
      if (!target.Catalog.spells.some(x => x.id === sp.id)) target.Catalog.spells.push(structuredClone(sp));
      target.ClassData.spellClasses[sp.id] = sp.classes.slice();
    }
    if (!target.ClassData.subclasses.some(x => x.id === subclass.id))
      target.ClassData.subclasses.push(structuredClone(subclass));
    // Nuevas mesas incluyen las fuentes oficiales reconocidas. Una mesa existente conserva sus ajustes.
    const owned = (target.BookContentData?.books || [])
      .filter(b => b.edition === '2014' && b.sourceKey && b.sourceKey !== SOURCE)
      .map(b => b.sourceKey);
    target.CampaignData.defaults = [
      ...new Set([...target.CampaignData.defaults, ...owned.filter(k => target.CampaignData.sources[k])]),
    ];
  }
  root.BookContent = { apply, spells, subclass };
  if (root.Catalog && root.ClassData && root.CampaignData) apply();
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BookContent;
})(typeof window !== 'undefined' ? window : globalThis);
