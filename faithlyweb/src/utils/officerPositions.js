/**
 * Officer Positions — Single source of truth for role-based access control.
 * Any position in this list grants access to Savings & Loans features.
 * "Member" (or empty/undefined) means no access.
 */

export const OFFICER_POSITIONS = [
  'Deacon',
  'Local Evangelist',
  'District Evangelist',
  'National Evangelist',
  'Assistant Priest',
  'Priest',
  'Elder',
  'District Elder',
  'Bishop',
  'District Bishop',
  'National Bishop',
  'Apostle',
];

/**
 * Check if a position string qualifies as an officer role.
 * @param {string} position
 * @returns {boolean}
 */
export function isOfficerPosition(position) {
  if (!position || typeof position !== 'string') return false;
  return OFFICER_POSITIONS.some(
    p => p.toLowerCase() === position.trim().toLowerCase()
  );
}
