/**
 * The page's one GWP rule: **both lenses, always together.**
 *
 * Methane's warming effect depends entirely on the window you measure it over, and
 * quoting one lens alone is how a methane number gets to mean whatever the author
 * wanted. So CO₂e is computed here from the atlas's own GWP factors, both horizons
 * are returned as a pair, and no page module can print one without the other in hand.
 */

import { amm } from '@/data';

export interface Co2eBoth {
  /** Megatonnes CO₂e on the 20-year lens. */
  readonly mt20: number;
  /** Megatonnes CO₂e on the 100-year lens. */
  readonly mt100: number;
}

export const co2eBoth = (ktCh4: number): Co2eBoth => ({
  mt20: (ktCh4 * amm.gwp.gwp20) / 1000,
  mt100: (ktCh4 * amm.gwp.gwp100) / 1000,
});

/** CO₂e tonnage at the precision the magnitude supports: Mt, kt, or plain tonnes. */
export const formatCo2e = (tonnes: number): string => {
  if (tonnes >= 1e6) {
    const mt = tonnes / 1e6;
    return `${mt >= 10 ? String(Math.round(mt)) : mt.toFixed(1)} Mt`;
  }
  if (tonnes >= 1e3) return `${String(Math.round(tonnes / 1e3))} kt`;
  return `${String(Math.round(tonnes))} t`;
};
