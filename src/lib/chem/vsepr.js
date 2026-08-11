/**
 * VSEPR lookup keyed by (sigma-bonded groups, lone pairs) on a central atom.
 *
 * "Groups" counts attached atoms, not bonds — a double bond is ONE group.
 * `draw` holds bond angles (0° = right, 90° = up) and wedge/dash styling so
 * the diagram component and the question text always agree.
 */
export const GEOMETRIES = [
  {
    bonding: 2, lone: 0,
    electronGeometry: 'linear', shape: 'linear', angle: '180°', hybridization: 'sp',
    draw: { bonds: [{ a: 0 }, { a: 180 }], lone: [] },
  },
  {
    bonding: 3, lone: 0,
    electronGeometry: 'trigonal planar', shape: 'trigonal planar', angle: '120°', hybridization: 'sp2',
    draw: { bonds: [{ a: 90 }, { a: 210 }, { a: 330 }], lone: [] },
  },
  {
    bonding: 2, lone: 1,
    electronGeometry: 'trigonal planar', shape: 'bent', angle: '~118°', hybridization: 'sp2',
    draw: { bonds: [{ a: 210 }, { a: 330 }], lone: [90] },
  },
  {
    bonding: 4, lone: 0,
    electronGeometry: 'tetrahedral', shape: 'tetrahedral', angle: '109.5°', hybridization: 'sp3',
    draw: { bonds: [{ a: 135 }, { a: 45 }, { a: 225, style: 'dash' }, { a: 315, style: 'wedge' }], lone: [] },
  },
  {
    bonding: 3, lone: 1,
    electronGeometry: 'tetrahedral', shape: 'trigonal pyramidal', angle: '~107°', hybridization: 'sp3',
    draw: { bonds: [{ a: 180 }, { a: 0 }, { a: 270, style: 'wedge' }], lone: [90] },
  },
  {
    bonding: 2, lone: 2,
    electronGeometry: 'tetrahedral', shape: 'bent', angle: '~104.5°', hybridization: 'sp3',
    draw: { bonds: [{ a: 225 }, { a: 315 }], lone: [65, 115] },
  },
  {
    bonding: 5, lone: 0,
    electronGeometry: 'trigonal bipyramidal', shape: 'trigonal bipyramidal', angle: '90° and 120°', hybridization: 'sp3d',
    draw: { bonds: [{ a: 90 }, { a: 270 }, { a: 180 }, { a: 340, style: 'wedge' }, { a: 20, style: 'dash' }], lone: [] },
  },
  {
    bonding: 4, lone: 1,
    electronGeometry: 'trigonal bipyramidal', shape: 'seesaw', angle: '~90° and ~120°', hybridization: 'sp3d',
    draw: { bonds: [{ a: 90 }, { a: 270 }, { a: 340, style: 'wedge' }, { a: 20, style: 'dash' }], lone: [180] },
  },
  {
    bonding: 3, lone: 2,
    electronGeometry: 'trigonal bipyramidal', shape: 'T-shaped', angle: '~90°', hybridization: 'sp3d',
    draw: { bonds: [{ a: 90 }, { a: 270 }, { a: 0 }], lone: [160, 200] },
  },
  {
    bonding: 2, lone: 3,
    electronGeometry: 'trigonal bipyramidal', shape: 'linear', angle: '180°', hybridization: 'sp3d',
    draw: { bonds: [{ a: 90 }, { a: 270 }], lone: [0, 160, 200] },
  },
  {
    bonding: 6, lone: 0,
    electronGeometry: 'octahedral', shape: 'octahedral', angle: '90°', hybridization: 'sp3d2',
    draw: {
      bonds: [{ a: 90 }, { a: 270 }, { a: 0 }, { a: 180 }, { a: 45, style: 'wedge' }, { a: 225, style: 'dash' }],
      lone: [],
    },
  },
  {
    bonding: 5, lone: 1,
    electronGeometry: 'octahedral', shape: 'square pyramidal', angle: '~90°', hybridization: 'sp3d2',
    draw: { bonds: [{ a: 90 }, { a: 0 }, { a: 180 }, { a: 45, style: 'wedge' }, { a: 225, style: 'dash' }], lone: [270] },
  },
  {
    bonding: 4, lone: 2,
    electronGeometry: 'octahedral', shape: 'square planar', angle: '90°', hybridization: 'sp3d2',
    draw: { bonds: [{ a: 0 }, { a: 180 }, { a: 45, style: 'wedge' }, { a: 225, style: 'dash' }], lone: [90, 270] },
  },
]

/** The subset an intro-orgo student actually needs fluency in. */
export const ORGO_GEOMETRIES = GEOMETRIES.filter((g) => g.bonding + g.lone <= 4)

export function lookupGeometry(bonding, lone) {
  return GEOMETRIES.find((g) => g.bonding === bonding && g.lone === lone) ?? null
}

export const ALL_SHAPES = [...new Set(GEOMETRIES.map((g) => g.shape))]
export const ALL_ELECTRON_GEOMETRIES = [...new Set(GEOMETRIES.map((g) => g.electronGeometry))]
export const ALL_HYBRIDIZATIONS = [...new Set(GEOMETRIES.map((g) => g.hybridization))]
export const ALL_ANGLES = [...new Set(GEOMETRIES.map((g) => g.angle))]
