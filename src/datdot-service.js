const host = require('./roles/hoster')
const encode = require('./roles/encoder.js')
const attest = require('./roles/attester.js')

module.exports = datdot_service

function datdot_service (profile) {
  const { log } = profile
  log({ type: '@todo', data: 'given e.g. a feed address, offer helper features' })
  // TODO: given e.g. a feed address, offer helper features
  // => serviceAPI should offer feature to retrieve
  // => data required to submit to the chain to start a plan subscription
  return { host, encode, attest }
}

