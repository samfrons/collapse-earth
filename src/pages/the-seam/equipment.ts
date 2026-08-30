/**
 * The equipment register — one entry per ballooned item.
 *
 * Feeds the general-arrangement tooltips, the parts list and the module-bill drawer,
 * so the three can never drift apart. Nothing in this container needs inventing except
 * the container: every item below is commercial hardware.
 */

export interface Equipment {
  /** Balloon number on the drawing. */
  readonly n: number;
  readonly id: string;
  readonly name: string;
  readonly tip: string;
}

export const EQUIPMENT = [
  {
    n: 1,
    id: 'wellhead',
    name: 'WELLHEAD TIE-IN + FLAME ARRESTOR',
    tip: "Sealed tie-in to the mine's own shaft or vent: flanged spool on the existing casing, manual gate valve, inline flame arrestor. The mine side of the battery limit — everything downstream is the unit's.",
  },
  {
    n: 2,
    id: 'esd',
    name: 'ESD VALVE · FAIL-CLOSED',
    tip: 'Emergency-shutdown valve, spring-return fail-closed: on power loss, instrument fault or any interlock trip the wellhead is isolated. The safe state is a sealed mine, not a running unit.',
  },
  {
    n: 3,
    id: 'meter',
    name: 'METERING RUN · FT/AT/PT/TT',
    tip: "Orifice metering run with continuous analysers: flow (FT-01), CH₄ (AT-01), O₂ (AT-02), pressure and temperature. This skid is simultaneously the safety system, the router's eyes, and the regulatory record Art. 25 demands — hour by hour.",
  },
  {
    n: 4,
    id: 'ko',
    name: 'KNOCKOUT DRUM + DRAIN',
    tip: 'Vertical knockout vessel with demister pad: mine gas arrives saturated and dirty; condensate drops here and drains under level control. Every downstream module assumes dry gas.',
  },
  {
    n: 5,
    id: 'blower',
    name: 'BLOWER · EX-RATED',
    tip: 'Explosion-proof centrifugal blower holding a slight vacuum on the wellhead — pull too weakly and methane leaks elsewhere, pull too hard and air is drawn into the workings toward the explosive band. The setpoint IS the safety argument.',
  },
  {
    n: 6,
    id: 'router',
    name: 'ROUTER MANIFOLD · V-101/102/103',
    tip: 'The invention: three actuated routes chosen by live CH₄ concentration, re-chosen as the mine ages. Valve logic on sheet 2. All three fail closed.',
  },
  {
    n: 7,
    id: 'engine',
    name: 'GAS ENGINE + GENERATOR',
    tip: 'Lean-burn mine-gas engine and alternator, MW-class, with exhaust heat recovery. Runs only above the >35% CHP gas-quality requirement (UNECE No. 64, Table 4.1) — the binding number for a wellhead-mounted unit, where the 30% transport limit is moot. Revenue while the gas is rich enough to burn.',
  },
  {
    n: 8,
    id: 'flare',
    name: 'ENCLOSED FLARE',
    tip: 'Enclosed combustor for rich gas when no grid connection exists. CDM default destruction 90%; CARB allows 99.5%. Destruction first, revenue second.',
  },
  {
    n: 9,
    id: 'rto',
    name: 'REGENERATIVE OXIDIZER · TWIN BED',
    tip: 'Two ceramic heat-sink beds and a flow-reversing valve set: the outgoing exhaust preheats the incoming lean stream, so methane down to ≈0.2% burns with no support fuel. The machine that outlives the gas quality.',
  },
  {
    n: 10,
    id: 'dilution',
    name: 'DILUTION AIR + CONTROLS',
    tip: "Filtered dilution-air fan and damper: below 30% the raw stream is never used — it is diluted under the ≈1.5% RTO feed ceiling, straight through the explosive band's safety margins, inside sealed pipe. Plus the PLC cabinet running the whole unit unmanned.",
  },
] as const satisfies readonly Equipment[];
