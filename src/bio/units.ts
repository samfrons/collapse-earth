/** Ideal-gas unit conversions. Every function takes its constants as arguments. */

/** J/mol/K. */
const R_GAS = 8.314;

/** g/mol. */
export const CH4_MOLAR_MASS = 16.043;
export const O2_MOLAR_MASS = 31.998;

/** Standard atmosphere, Pa — the default when a pressure is not supplied. */
const STANDARD_PRESSURE_PA = 101325;

/** mol/m³ at the given temperature and pressure. */
export const molarDensity = (temperatureC: number, pressurePa = STANDARD_PRESSURE_PA): number =>
  pressurePa / (R_GAS * (temperatureC + 273.15));

export const volFractionToGm3 = (
  volFraction: number,
  molarMass: number,
  temperatureC: number,
  pressurePa?: number,
): number => volFraction * molarDensity(temperatureC, pressurePa) * molarMass;

export const gm3ToVolFraction = (
  gm3: number,
  molarMass: number,
  temperatureC: number,
  pressurePa?: number,
): number => gm3 / (molarDensity(temperatureC, pressurePa) * molarMass);
