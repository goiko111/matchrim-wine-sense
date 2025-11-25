/**
 * Utility functions for working with wine styles
 */

/**
 * Cleans a wine style name by removing the attribute prefix format
 *
 * Wine style names in the database may have a prefix in the format:
 * "potente;acidez;dulce;tanico;afrutado;StyleName"
 *
 * This function removes that prefix and any trailing numbers in parentheses
 *
 * @param name - The wine style name to clean
 * @returns The cleaned wine style name
 *
 * @example
 * cleanWineStyleName("2;1;1;3;2;Tinto Versátil") // Returns "Tinto Versátil"
 * cleanWineStyleName("Tinto Versátil (5)") // Returns "Tinto Versátil"
 * cleanWineStyleName("Tinto Versátil") // Returns "Tinto Versátil"
 */
export const cleanWineStyleName = (name: string): string => {
  // Remove pattern "X;X;X;X;X;" from beginning
  let cleaned = name.replace(/^\d+;\d+;\d+;\d+;\d+;/, '').trim();

  // Remove numbers in parentheses at end like " (5)"
  cleaned = cleaned.replace(/\s*\(\d+\)\s*$/, '').trim();

  return cleaned;
};
