const seal = require('./encounter-seal.json');

// Las piezas comparten la junta central. Los relieves se modelan en XY con Z hacia la cámara.
const relief = (svg, size, at, mat, depth = 0.13) => ({
  kind: 'extrude',
  outline: { svg, size },
  at,
  depth,
  round: 0.025,
  mat,
  res: 0.035,
  part: 'die',
});
const gem = (at, r, mat) => ({ kind: 'regular', shape: 'd8', at, r, mat, res: 0.035, part: 'die' });
const rod = (a, b, r, mat) => ({ kind: 'tube', pts: [a, b], r, mat, res: 0.035, part: 'die' });

const insignia = {
  ambush: [
    relief('M 2 18 L 9 10 L 14 1 L 14 10 L 11 16 L 5 21 Z', 1.25, [0.16, 0.2, 0.04], 'bone'),
    rod([-0.52, -0.69, 0.05], [-0.21, -0.28, 0.05], 0.09, 'wood'),
    rod([-0.44, -0.14, 0.05], [0, -0.47, 0.05], 0.067, 'metal'),
    gem([-0.54, -0.72, 0.05], 0.12, 'ember'),
  ],
  boss: [
    relief('M 0 1 L 4 4 L 6 0 L 8 4 L 12 1 L 10 8 L 2 8 Z', 1.6, [0, 0.03, 0.05], 'metal', 0.26),
    rod([-0.51, -0.44, 0.2], [0.51, -0.44, 0.2], 0.07, 'metal'),
    gem([0, -0.04, 0.24], 0.24, 'accent'),
    gem([-0.39, -0.15, 0.23], 0.09, 'ember'),
    gem([0.39, -0.15, 0.23], 0.09, 'ember'),
  ],
  reinforce: [
    ...[-1, 1].flatMap(side => {
      const x = side * 0.45,
        y = side * 0.14;
      return [
        rod([x, -0.72 + y, 0], [x, 0.71 + y, 0], 0.052, 'metal'),
        gem([x, 0.77 + y, 0], 0.1, 'glow'),
        relief('M 0 0 L 9 0 L 7 7 L 3 5 L 0 8 Z', 0.68, [x + 0.26, 0.29 + y, 0.035], side < 0 ? 'water' : 'ember'),
      ];
    }),
  ],
};

function specifications() {
  return [
    seal,
    ...Object.entries(insignia).map(([kind, solids]) => ({
      ...seal,
      id: 'encounter-' + kind,
      name: { ambush: 'Daga de emboscada', boss: 'Corona del jefe', reinforce: 'Estandartes de refuerzo' }[kind],
      solids: [...seal.solids.filter(solid => solid.part !== 'die'), ...solids],
      motion: [{ do: 'turn', part: 'die', axis: [0, 1, 0], amount: 0.38, period: 2 }, seal.motion[1]],
    })),
  ];
}
module.exports = specifications;
