// Ported from the team's "Opportunity Radar" Lovable project (src/lib/opportunities/value.ts), 24 Oct 2026.
// Change vs original: the price percent comes from the page slider instead of localStorage.
import type { Project } from "./types";

// Verified retail prices, each with its source URL (accessed 2026-10-24).
// Every number here is either a cited fact below or the explicitly labelled
// assumption; nothing is invented.
export type PricedProduct = {
  product: string;
  retailLow: number;
  retailHigh: number;
  lowSource: string;
  highSource: string;
};

export const KITCHEN_PRODUCTS: readonly PricedProduct[] = [
  {
    product: "Oven SF6381X",
    retailLow: 7_903, // lowest listed price
    retailHigh: 14_995, // smeg.com
    lowSource:
      "https://www.pricerunner.se/pl/105-3097338/Ugnar/Smeg-SF6381X-Rostfritt-staal-priser",
    highSource:
      "https://www.pricerunner.se/pl/105-3097338/Ugnar/Smeg-SF6381X-Rostfritt-staal-priser",
  },
  {
    product: "Induction hob SI764AOM",
    retailLow: 9_490, // lowest listed price
    retailHigh: 11_495, // smeg.com
    lowSource: "https://www.pricerunner.se/pl/106-5043342/Spishaellar/Smeg-SI764AOM-priser",
    highSource: "https://www.pricerunner.se/pl/106-5043342/Spishaellar/Smeg-SI764AOM-priser",
  },
  {
    product: "Integrated dishwasher STL7252C / STL252CH",
    retailLow: 10_995, // STL7252C, Bygghemma
    retailHigh: 12_495, // STL252CH, PriceRunner
    lowSource:
      "https://www.bygghemma.se/kok-och-bad/vitvaror/diskmaskin/integrerad-diskmaskin/integrerad-diskmaskin-smeg-stl7252c/p-2095676",
    highSource:
      "https://www.pricerunner.se/pl/13-3200824783/Diskmaskiner/Smeg-STL252CH-Integrerad-priser",
  },
  {
    product: "Integrated fridge/freezer C41721E",
    retailLow: 15_995,
    retailHigh: 15_995,
    lowSource:
      "https://www.bygghemma.se/kok-och-bad/vitvaror/kyl-och-frys/kyl-och-frys-integrerad/integrerad-kyl-och-frys-smeg-c41721e/p-1978337",
    highSource:
      "https://www.bygghemma.se/kok-och-bad/vitvaror/kyl-och-frys/kyl-och-frys-integrerad/integrerad-kyl-och-frys-smeg-c41721e/p-1978337",
  },
];

export const PRICE_ACCESSED_DATE = "2026-10-24";
export const ASSUMPTION_LABEL = "Assumption, not a Smeg figure";
export const DEFAULT_PROJECT_PRICE_PERCENT = 50;

export function kitchenRetailRange(): { retailLow: number; retailHigh: number } {
  // Cooker hood not included: no verified price.
  return {
    retailLow: KITCHEN_PRODUCTS.reduce((sum, p) => sum + p.retailLow, 0),
    retailHigh: KITCHEN_PRODUCTS.reduce((sum, p) => sum + p.retailHigh, 0),
  };
}

// Assumed Smeg project price per kitchen: percent of the mid retail price.
export function assumedKitchenPrice(percent = DEFAULT_PROJECT_PRICE_PERCENT): number {
  const { retailLow, retailHigh } = kitchenRetailRange();
  return Math.round(((retailLow + retailHigh) / 2) * (percent / 100));
}

// Why a project gets no order value estimate, or null when it can be estimated.
export function orderValueExcluded(project: Project): string | null {
  if (project.projectType === "hotel") return "No verified hotel room package price";
  if (project.units.status === "unknown" || project.units.value === null)
    return "Units unknown; never estimated";
  if (project.tenure === "hyresratt") return "Rental tenure (hyresratt): low fit, excluded";
  return null;
}

export function orderValue(project: Project, percent = DEFAULT_PROJECT_PRICE_PERCENT) {
  if (orderValueExcluded(project)) return null;
  const unitsUsed = project.units.value as number;
  const { retailLow, retailHigh } = kitchenRetailRange();
  return {
    retailLow: unitsUsed * retailLow,
    retailHigh: unitsUsed * retailHigh,
    smegRevenueAssumed: unitsUsed * assumedKitchenPrice(percent),
    unitsUsed,
  };
}

// Do not add this to other module totals without checking for double counting of the same dwellings.
export function getPipelineValue(projects: Project[], percent = DEFAULT_PROJECT_PRICE_PERCENT) {
  let knownUnits = 0;
  let projectsWithKnownUnits = 0;
  let smegRevenueAssumedTotal = 0;
  let unknownUnitProjects = 0;
  for (const project of projects) {
    if (project.units.status === "unknown" || project.units.value === null)
      unknownUnitProjects += 1;
    const value = orderValue(project, percent);
    if (!value) continue;
    knownUnits += value.unitsUsed;
    projectsWithKnownUnits += 1;
    smegRevenueAssumedTotal += value.smegRevenueAssumed;
  }
  return {
    knownUnits,
    projectsWithKnownUnits,
    smegRevenueAssumedTotal,
    unknownUnitProjects,
    perKitchenAssumed: assumedKitchenPrice(percent),
  };
}
