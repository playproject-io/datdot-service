const debug = require('debug')

module.exports = datdotService

function datdotService (profile) {
  const log = profile.log.extend('service')

  const serviceAPI = {
    host,
    encode,
    verifyEncoding,
    getStorageChallenge,
    sendStorageChallengeToAttestor,
    verifyStorageChallenge,
    checkPerformance
  }
  return serviceAPI

  /******************************************************************************
    API FUNCTIONS
  ******************************************************************************/

  /* ----------------------------------------------------------------
                 BEFORE HOSTING => ENCODING, VERIFYING, STORING
  ------------------------------------------------------------------ */
  async function encode (data) {
    const { contractID, account, attestorKey, encoderKey, feedKey: feedKeyBuffer, ranges } = data
    log('----------------------Encode!')
    return account.encoder.encodeFor(contractID, attestorKey, encoderKey, feedKeyBuffer, ranges)
  }

  async function verifyEncoding (data) {
    const { account, contractID, feedKey, hosterKeys, attestorKey, encoderKeys } = data
    const messages = []
    const jobs = []
    for (var i = 0, len = encoderKeys.length; i < len; i++) {
      const encoderKey = encoderKeys[i]
      const hosterKey = hosterKeys[i]
      const opts = { contractID, attestorKey, encoderKey, hosterKey, feedKey, cb: (msg, cb) => compareEncodings(messages, msg, cb) }
      jobs.push(account.attestor.verifyEncodingFor(opts))
    }
    jobs.map(j => j.then(x => console.log('===== JOB RESOLVED =====', x)))
    const results = await Promise.all(jobs)
    log('ALL RESOLVED============================', results)
    // await account.attestor.communication.destroy()
  }

  async function host (data) {
    const { account, contractID, feedKey, hosterKey, attestorKey, plan } = data
    const opts = { contractID, feedKey, hosterKey, attestorKey, plan }
    log('---------------Host!')
    return await account.hoster.hostFor(opts)
  }

  /* ----------------------------------------------------------------
                     WHILE HOSTING => proof
------------------------------------------------------------------ */
  async function getStorageChallenge ({ account, storageChallenge, feedKey }) {
    const data = await Promise.all(storageChallenge.chunks.map(async (chunk) => {
      return await account.hoster.getStorageChallenge(feedKey, chunk)
    }))
    return data
  }

  async function sendStorageChallengeToAttestor (data) {
    const { account, hosterKey, storageChallengeID, feedKey, attestorKey, proof } = data
    await account.hoster.sendStorageChallenge({ storageChallengeID, hosterKey, feedKey, attestorKey, proof })
    // hoster sends proof of data to the attestor
  }

  async function verifyStorageChallenge (data) {
    const { account, attestorKey, hosterKey, feedKey, storageChallengeID } = data
    // @TODO prepare the response: hash, proof etc. instead of sending the full chunk
    const proof = await account.attestor.verifyStorageChallenge({ storageChallengeID, attestorKey, feedKey, hosterKey })
    return { storageChallengeID, proof }
  }

  async function checkPerformance (data) {
    const { account, randomChunks, feedKey } = data
    log('check performance')
    const report = await Promise.all(randomChunks.map(async (chunk) => {
      return await account.attestor.checkPerformance(feedKey, chunk)
    }))
    return report
  }

  /******************************************************************************
    HELPER FUNCTIONS
  ******************************************************************************/

  function compareEncodings (messages, msg, cb) {
    const { index } = msg
    // get all three chunks from different encoders, compare and then respond to each
    if (messages[index]) messages[index].push({ msg, cb })
    else messages[index] = [{ msg, cb }]
    if (messages[index].length === 3) {
      const sizes = messages[index].map(message => {
        return Buffer.from(message.msg.encoded).length
      })
      // const sizes = [12,13,13] // => test usecase for when chunk sizes not same
      const allEqual = sizes.every((val, i, arr) => val === arr[0])
      if (allEqual === true) messages[index].forEach(chunk => chunk.cb(null, msg))
      else findInvalidEncoding(sizes, messages, cb)
    }
  }
  function findInvalidEncoding (sizes, messages, cb) {
    var smallest = sizes[0]
    for (var i = 0, len = sizes.length; i < len; i++) {
      for (var k = i + 1; k < len; k++) {
        const [a, b] = [sizes[i], sizes[k]]
        const err = 'Encoding denied'
        if (a !== b) {
          if (a < b) {
            smallest = a
            cb(err, messages[k])
          } else {
            smallest = b
            cb(err, messages[i])
          }
        }
      }
    }
  }
}
