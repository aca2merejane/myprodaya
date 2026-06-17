/**
 * Generates SQL condition and parameters for hierarchical office filtering.
 * @param {object} user The user object from request (req.user)
 * @param {string} column The column name to filter on (e.g. 'office' or 'KANTOR')
 * @returns {{sql: string, params: Array}}
 */
function getOfficeQueryFilter(user, column = 'office') {
  // Admins or head office (0) have access to all offices
  if (user.priv_admin === 'Y' || user.office === '0' || !user.office) {
    return { sql: '1=1', params: [] };
  }
  
  // Hierarchical filtering (e.g. office '031' matches '031', '03107', '0310701', etc.)
  return {
    sql: `(${column} LIKE ? OR ? LIKE CONCAT(${column}, '%'))`,
    params: [`${user.office}%`, user.office]
  };
}

module.exports = {
  getOfficeQueryFilter
};
