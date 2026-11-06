/* The Icespire printable appendix is a 3 by 3 card grid, not a two-column chapter. */
const LC = require('../library-core');
function cards(input) {
  const result = [];
  for (const number of [79, 81, 83, 85])
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const page = input.pages[number - 1],
          w = page.w / 3,
          h = page.h / 3;
        const items = page.items
          .filter(i => i.x >= col * w && i.x < (col + 1) * w && i.y >= row * h && i.y < (row + 1) * h && i.h > 4)
          .map(i => ({ ...i, x: i.x - col * w, y: i.y - row * h }));
        const parsed = LC.items(LC.readLines([{ w: w * 2.2, h, items }]), { prefix: 'official-17182bc795d5ced5' });
        for (const item of parsed) {
          const corrections = {
            'De ogro': 'Guanteletes de fuerza de ogro',
            Mayor: 'Poción de curación mayor',
            Superior: 'Poción de curación superior',
            Invulnerabilidad: 'Poción de invulnerabilidad',
            'El agua': 'Poción de respirar bajo el agua',
          };
          item.name = corrections[item.name] || item.name;
          if (item.name === 'Guanteletes de fuerza de ogro') item.attunement = true;
          item.text = item.text
            .replace(/OBJETO MÁGICO[\s\S]*$/, '')
            .replace(/REQUIERE SINTONIZACIÓN(?: POR PARTE DE UN MAGO)?/g, '')
            .replace(/(\p{L})[\u00ad-]\s+(\p{L})/gu, '$1$2')
            .trim();
          if (item.text.length < 20) throw Error('Incomplete item card: ' + number + ' ' + col + ',' + row);
          item.id = 'official-17182bc795d5ced5:' + LC.slug(item.name);
          item.page = number;
          result.push(item);
        }
      }
  return [...new Map(result.map(r => [LC.key(r.name), r])).values()];
}
module.exports = cards;
