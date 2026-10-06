// Store clients own updates for their builds. Legacy GitHub packages have no channel metadata.
function supportsAutoUpdates({ packaged, smoke, portable, distribution }) {
  return !!packaged && !smoke && !portable && (distribution === undefined || distribution === 'github');
}
module.exports = { supportsAutoUpdates };
