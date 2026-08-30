/**
 * What the twin does not know.
 *
 * The model runs on two curves and a seal. A twin an engineer could actually spend
 * money against has to carry six things, and UNECE No. 64 §7 lists both what they are
 * and how each is tested. Setting our assumption beside their test is the most honest
 * thing this page can do with a model of a mine nobody has drilled — and it is the
 * difference between a diagram and a specification for the fieldwork that replaces it.
 */

export interface TwinGap {
  /** The thing a real twin has to know. */
  readonly k: string;
  readonly need: string;
  /** How the source says to test it. */
  readonly test: string;
  /** What this twin actually does — stated plainly, including "nothing". */
  readonly ours: string;
}

export const TWIN_GAPS = [
  {
    k: 'Void space and geology',
    need: 'The physical extent of the reservoir: de-stressed stacks of unmined seam left by longwall working, the strata between them, and the total void of goafs and roadways.',
    test: 'Monitor passive vents for gas pressure and temperature over time. Rapid pressure swings at low flow indicate minimal void — a high-resistance or flooding system.',
    ours: "Not modelled. Volume enters as a fitted q₀, solved through GEM's published mean, so the geometry on the plate is illustrative and carries no reservoir estimate.",
  },
  {
    k: 'Flooding and water recovery',
    need: "Inflow rate decides the project's life. Rising water exerts hydrostatic pressure that stops desorption, and it blocks connections before it ever reaches the seam.",
    test: 'Boreholes and changes to de-watering schemes to clarify recovery rates across all parts of the workings; water-quality analysis for discharge.',
    ours: "Binary. The bench offers dry or flooded and applies EPA's flooding coefficient; there is no water level, no inflow rate, and no low point in a roadway where gas is cut off early.",
  },
  {
    k: 'Transmissivity and connection',
    need: 'Whether surface suction actually reaches the gas. Collapsed zones and flooded tunnels choke a vacuum long before the resource is exhausted.',
    test: 'Active pump tests; pressure loss measured surface-to-underground. A rapid rise in suction with falling flow indicates partial blockage.',
    ours: 'Absent. Flow is treated as if the whole void were reachable from one point, which is the assumption most likely to be flattering.',
  },
  {
    k: 'Air ingress — the mine breathes',
    need: 'Abandoned mines inhale and exhale with barometric pressure. Ingress dilutes the gas, cuts the suction that can be applied, and — the reason it is a safety item, not an efficiency one — walks the mixture toward the flammable band.',
    test: 'Oxygen in the extracted gas is the tell. Shallow spike probing and smoke tests around former entries locate the leak; remedial works on mine entries fix it.',
    ours: 'Half modelled. Seal quality drives purity, and sheet M-004 draws what happens when the mixture crosses the envelope — but oxygen is a stated assumption, not a modelled ingress, and nothing here breathes with the weather.',
  },
  {
    k: 'Desorption and decline',
    need: 'Residual in-situ gas content and coal properties, projected as a hyperbolic or exponential decline over the life of the scheme.',
    test: 'Historical mining records and residual gas content, calibrated against measured production.',
    ours: "This one the twin does model, and it is the only one it validates: anchored on the dry figure alone it predicts a flooded mean of 8.9 MCM/yr against GEM's published 8.4.",
  },
  {
    k: 'Physical ground-truthing',
    need: 'Everything above is worth what its input data is worth. Modelling substitutes for drilling only until someone drills.',
    test: 'Trial drilling, and a suction draw-down and recovery test into the workings.',
    ours: 'None. This page has drilled nothing.',
  },
] as const satisfies readonly TwinGap[];
