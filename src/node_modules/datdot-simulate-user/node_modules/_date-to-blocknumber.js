module.exports = dateToBlockNumber

function dateToBlockNumber ({ dateNow, blockNow, date }) {

  // TODO should we run corrections to get a more accurate block number
  // TODO see if adjument to GMT time zone is needed?
  const diff = (date - dateNow)/1000 // difference in seconds
  const blockDiff = Math.round(diff/6)

  const result = Math.max(blockNow + blockDiff, 0)

  return result

}
