// Active ARS titles. Titles 2 and 24 are repealed and skipped.
// Names sourced from https://www.azleg.gov/arstitle/ — hardcoded because
// azleg's /arsDetail/?title=N page has a generic <title> tag with no title name.
export const TITLE_NAMES: Record<number, string> = {
  1: "General Provisions",
  3: "Agriculture",
  4: "Alcoholic Beverages",
  5: "Amusements and Sports",
  6: "Banks and Financial Institutions",
  7: "Boundaries",
  8: "Children",
  9: "Cities and Towns",
  10: "Corporations and Associations",
  11: "Counties",
  12: "Courts and Civil Proceedings",
  13: "Criminal Code",
  14: "Trusts, Estates and Protective Proceedings",
  15: "Education",
  16: "Elections and Electors",
  17: "Game and Fish",
  18: "Information Technology",
  19: "Initiative, Referendum and Recall",
  20: "Insurance",
  21: "Jurors",
  22: "Justices of the Peace and Other Courts Not of Record",
  23: "Labor",
  25: "Marital and Domestic Relations",
  26: "Military Affairs and Emergency Management",
  27: "Minerals, Oil and Gas",
  28: "Transportation",
  29: "Partnership",
  30: "Power",
  31: "Prisons and Prisoners",
  32: "Professions and Occupations",
  33: "Property",
  34: "Public Buildings and Improvements",
  35: "Public Finances",
  36: "Public Health and Safety",
  37: "Public Lands",
  38: "Public Officers and Employees",
  39: "Public Records, Printing and Notices",
  40: "Public Utilities and Carriers",
  41: "State Government",
  42: "Taxation",
  43: "Taxation of Income",
  44: "Trade and Commerce",
  45: "Waters",
  46: "Welfare",
  47: "Weights and Measures",
  48: "Special Taxing Districts",
  49: "The Environment",
};

export const ACTIVE_TITLES: readonly number[] = Object.keys(TITLE_NAMES)
  .map((n) => parseInt(n, 10))
  .sort((a, b) => a - b);

export function isActiveTitle(n: number): boolean {
  return n in TITLE_NAMES;
}

export function titleName(n: number): string {
  return TITLE_NAMES[n] ?? `Title ${n}`;
}
