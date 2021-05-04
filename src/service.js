const varint = require('varint')
const crypto = require('datdot-crypto')
const hypercore = require('hypercore')
const RAM = require('random-access-memory')
const { toPromises } = require('hypercore-promisifier')
const Hyperbeam = require('hyperbeam')
const derive_topic = require('derive_topic')
const getRangesCount = require('getRangesCount')
const hyperswarm = require('hyperswarm')
const ready = require('hypercore-ready')
const get_signature = require('get-signature')
const get_nodes = require('get-nodes')
const get_index = require('get-index')
const download_range = require('download-range')
const { performance } = require('perf_hooks')
const EncoderDecoder = require('EncoderDecoder')
const sub = require('subleveldown')
const defer = require('promise-defer')
const audit = require('audit-hypercore')
const HosterStorage = require('hoster-storage')
const DEFAULT_TIMEOUT = 7500

module.exports = service

function service (log) {
  return {
    // attestor
    verify_and_forward_encodings,
    attest_storage_challenge,
    attest_performance,
  }




    /* -----------------------------------------------------------------------------------------------------------------------------
    
                                                        ATTESTOR

    ----------------------------------------------------------------------------------------------------------------------------- */


/* ----------------------------------------------------------------------
                            HOSTING SETUP
---------------------------------------------------------------------- */
async function verify_and_forward_encodings (opts) {
  const { amendmentID, attestorKey, encoderKey, hosterKey, feedKey, ranges, compareCB } = opts
  const topic_encoder = derive_topic({ senderKey: encoderKey, feedKey, receiverKey: attestorKey, id: amendmentID })
  const topic_hoster = derive_topic({ senderKey: attestorKey, feedKey, receiverKey: hosterKey, id: amendmentID })
  const expectedChunkCount = getRangesCount(ranges)
  const report = []
  let STATUS
  let hoster_failed
  let encoder_failed
  let encoder_channel
  let hoster_channel
  var pending = 0
  try {
    encoder_channel = await connect_to('encoder', true, topic_encoder, expectedChunkCount)
    hoster_channel = await connect_to('hoster', false, topic_hoster, expectedChunkCount)
    await encoder_channel('HEAR', handler)
  } catch (err) {
    if (err.type === 'encoder_connection_fail') {
      if (hoster_channel) hoster_channel('QUIT')
      report.push(encoderKey)
    }
    else if (err.type === 'hoster_connection_fail') {
      report.push(hosterKey)
      hoster_failed = true
      try {
        await encoder_channel('HEAR', handler)
      } catch (err) {
        if (err.type === 'encoder_connection_fail') report.push(encoderKey)
        else console.log(err)
      }
    }
    else if (err.type === 'encoder_timeout') report.push(encoderKey)
    else console.log(err)
  }
  return report

  async function handler (type, chunk) {      
    try {
      if (type === 'FAIL') {
        STATUS = 'FAILED'
        hoster_channel('QUIT')
        return
      }
      if (type === 'DONE') {
        STATUS = 'END'
        if (!pending) hoster_channel('QUIT')
        return
      }
      if (type === 'DATA') {
        pending++
        await compareCB(chunk, encoderKey) // TODO: REFACTOR to promise and throw invalid_encoding or other_encoder_failed  
        if (STATUS === 'FAILED') {
          pending--
          if (!pending) hoster_channel('QUIT')
          return
        }
        await hoster_channel('SEND', chunk)
        pending--
        if (STATUS === 'END' || STATUS === 'FAILED') {
          if (!pending) hoster_channel('QUIT')
          return
        }
        console.log('return next')
      }
      // return 'NEXT'
    } catch (err) {
      pending--
      if (STATUS === 'END') {
        if (!pending) hoster_channel('QUIT')
        return
      }
      else if (err.type === 'invalid_encoding' && !encoder_failed) {
        encoder_failed = true
        hoster_channel('QUIT')
        report.push(encoderKey)
        STATUS = 'FAILED'
        return 'QUIT'
      }
      else if (err.type === 'other_encoder_failed') {
        STATUS = 'FAILED'
        hoster_channel('QUIT')
        return 'MUTE' // keep receiving chunks, but stop listening
      }
      else if (err.type === 'hoster_timeout') {
        STATUS = 'FAILED'
        hoster_failed = true
        report.push(hosterKey)
        return 'MUTE'
      }
      else console.log(err)
    }
  }

  async function connect_to (role, isSender, topic, expectedChunkCount) {
    const chunks = {}
    var beam_error
    return new Promise(async (resolve, reject) => {
      const tid = setTimeout(() => {
        // beam.destroy()
        reject({ type: `${role}_timeout` })
      }, DEFAULT_TIMEOUT)
      const beam = new Hyperbeam(topic)
      beam.on('error', err => { 
        clearTimeout(tid)
        // beam.destroy()
        if (beam_once) {
          // beam_once.destroy()
          reject({ type: `${role}_connection_fail`, data: err })
        } else beam_error = err
      })
      let core
      const once_topic = topic + 'once'
      var beam_once = new Hyperbeam(once_topic)
      beam_once.on('error', err => { 
        clearTimeout(tid)
        // beam_once.destroy()
        // beam.destroy()
        reject({ type: `${role}_connection_fail`, data: err })
      })
      if (isSender) {
        beam_once.once('data', async (data) => {
          const message = JSON.parse(data.toString('utf-8'))
          if (message.type === 'feedkey') {
            const feedKey = Buffer.from(message.feedkey, 'hex')
            const clone = toPromises(new hypercore(RAM, feedKey, { valueEncoding: 'utf-8', sparse: true }))
            core = clone
            const cloneStream = clone.replicate(false, { live: true })
            cloneStream.pipe(beam).pipe(cloneStream)
            // beam_once.destroy()
            // beam_once = undefined
            resolve(channel)
          }
        })
      } else {
        core = toPromises(new hypercore(RAM, { valueEncoding: 'utf-8' }))
        await core.ready()
        core.on('error', err => {
          Object.values(chunks).forEach(({ reject }) => reject(err))
        })
        const coreStream = core.replicate(true, { live: true, ack: true })
        coreStream.pipe(beam).pipe(coreStream)
        beam_once.write(JSON.stringify({ type: 'feedkey', feedkey: core.key.toString('hex')}))
        coreStream.on('ack', function (ack) {
          // console.log('ACK INDEX', ack.start)
          const index = ack.start
          const store = chunks[index]
          const resolve = store.resolve
          delete chunks[index]
          chunks[index] = ack
          resolve()
        })
        resolve(channel)
      }

      async function channel (type, data) {
        if (type === 'QUIT') {
          return new Promise((resolve, reject) => {
            clearTimeout(tid)
            // beam.destroy()
            resolve()
          })
        }
        else if (type === 'SEND') {
          return new Promise(async (resolve, reject) => {
            const message = await data
            const parsed = JSON.parse(message.toString('utf-8'))
            parsed.type = 'verified'
            const id = await core.append(JSON.stringify(parsed))
            chunks[id] = { resolve, reject }
            // console.log('SENT INDEX', id)
            // resolve()
          })
        }
        else if (type === 'HEAR') {
          var handlerCB = data
          var status
          var error
          return new Promise(async (resolve, reject) => {
            if (beam_error) return reject({ type: `${role}_connection_fail`, data: beam_error })
            core.on('error', err => {
              error = err
              clearTimeout(tid)
              // beam.destroy()
              reject({ type: `${role}_connection_fail`, data: err })
            })
            // get replicated data
            const chunks = []
            for (var i = 0; i < expectedChunkCount; i++) {
              if (status === 'END') return
              const chunk = core.get(i)
              if (status === 'MUTED') continue
              const promise = handlerCB('DATA', chunk)
              chunks.push(promise)
              promise.catch(err => {
                console.log('ERROR promise handlerCB', err)
                status = 'FAIL'
                clearTimeout(tid)
                // beam.destroy()
                reject({ type: `${role}_connection_fail`, data: err })
                handlerCB('FAIL', err)
              }).then(type => {
                if (status === 'END') return
                if (type === 'MUTE') return status = 'MUTED'
                if (type === 'QUIT') {
                  // beam.destroy()
                  // if (status !== 'MUTED')
                  status = 'END'
                }
              })
            }
            console.log('Sending report', expectedChunkCount, chunks.length)
            handlerCB('DONE')
            status = 'END'
            await Promise.all(chunks)
            clearTimeout(tid)
            // beam.destroy()
            resolve(report)
          })
        }
      }
    })
  }
}


/* ----------------------------------------------------------------------
                        VERIFY STORAGE CHALLENGE
---------------------------------------------------------------------- */
async function attest_storage_challenge (data) {
  return new Promise(async (resolve, reject) => {
    log({ type: 'attestor', data: [`Starting attest_storage_challenge}`] })
    const { storageChallenge, attestorKey, hosterSigningKey, hosterKey, feedKey } = data
    const {id, chunks } = storageChallenge
    const log2hosterChallenge = log.sub(`<-HosterChallenge ${hosterKey.toString('hex').substring(0,5)}`)

    const topic = derive_topic({ senderKey: hosterKey, feedKey, receiverKey: attestorKey, id })

    const tid = setTimeout(() => {
      // beam.destroy()
      reject({ type: `attestor_timeout` })
    }, DEFAULT_TIMEOUT)

    const beam = new Hyperbeam(topic)
    beam.on('error', err => { 
      clearTimeout(tid)
      // beam.destroy()
      if (beam_once) {
        // beam_once.destroy()
        reject({ type: `attestor_connection_fail`, data: err })
      }
    })
    const once_topic = topic + 'once'
    var beam_once = new Hyperbeam(once_topic)
    beam_once.on('error', err => { 
      clearTimeout(tid)
      // beam_once.destroy()
      // beam.destroy()
      reject({ type: `${role}_connection_fail`, data: err })
    })
    const all = []
    let core
    beam_once.once('data', async (data) => {
      const message = JSON.parse(data.toString('utf-8'))
      if (message.type === 'feedkey') {
        const feedKey = Buffer.from(message.feedkey, 'hex')
        const clone = toPromises(new hypercore(RAM, feedKey, { valueEncoding: 'utf-8', sparse: true }))
        core = clone
        const cloneStream = clone.replicate(false, { live: true })
        cloneStream.pipe(beam).pipe(cloneStream)
        // beam_once.destroy()
        // beam_once = undefined
        get_data(core)
        resolve()
      }
    })

    async function get_data (core) {
      // get signed event as an extension message
      ext = core.registerExtension(`challenge${id}`, { 
        encoding: 'binary',
        async onmessage (signed_event) {
          if (!is_valid_event(signed_event, `${id}`, hosterSigningKey)) reject(signed_event)
          // get chunks from hoster
          for (var i = 0, len = chunks.length; i < len; i++) {
            const chunk = core.get(i)
            all.push(verify_chunk(chunk, i))
          }
          try {
            const results = await Promise.all(all).catch(err => { console.log(err) })
            if (!results) log2hosterChallenge({ type: 'error', data: [`No results`] })
            console.log({results})
            clearTimeout(tid)
            // beam.destroy()
            resolve({ type: `DONE`, data: results })
          } catch (err) {
            log2hosterChallenge({ type: 'error', data: [`Error: ${err}`] })
            clearTimeout(tid)
            // beam.destroy()
            reject({ type: `hoster_proof_fail`, data: err })
          }
        },
        onerror (err) {
          console.log('err')
          reject(err)
        }
      })


    }

    // @NOTE:
    // attestor receives: encoded data, signature (proof), nodes + signed event
    // attestor verifies signed event
    // attestor verifies if chunk is signed by the original encoder (signature, encoder's pubkey, encoded chunk)
    // attestor decompresses the chunk and takes out the original data (arr[1])
    // attestor merkle verifies the data: (feedkey, root signature from the chain (published by attestor after published plan)  )
    // attestor sends to the chain: nodes, signature, hash of the data & signed event

    function verify_chunk (data_promise, i) {
      return new Promise(async (resolve, reject) => {
        const chunk = await data_promise
        const message = JSON.parse(chunk.toString('utf-8'))
        const { type, storageChallengeID, data, signed_event } = message
        log2hosterChallenge({ type: 'attestor', data: [`Storage proof received, ${data.index}`]})
        if (id !== storageChallengeID) return log2hosterChallenge({ type: 'attestor', data: [`Wrong id: ${id}`] })
        if (type === 'proof') {
          // if (await !is_merkle_verified()) reject(data)
          if (!is_valid_proof(message, feedKey, storageChallenge)) reject(data.index)
          log2hosterChallenge({ type: 'attestor', data: [`Storage verified for ${data.index}`]})
          console.log('proof verified')
          resolve(data)
        } else {
          log2hosterChallenge({ type: 'attestor', data: [`UNKNOWN_MESSAGE messageType: ${type}`] })
          reject(index)
        }
      })
    }

    function is_valid_event (signature, message, hosterSigningKey) {
      console.log('verifying signature')
      const messageBuf = Buffer.from(message, 'binary')
      return crypto.verify_signature(signature, messageBuf, hosterSigningKey)
    }

    async function is_valid_proof (message, feedKey, storageChallenge) {
      const { data } = message
      if (!data) console.log('No data')
      const { index, encoded, proof } = data
      const decoded = await EncoderDecoder.decode(Buffer.from(encoded))
      // console.log({data})
      // hash the data
      return true
    }

  })
}

  
/* ----------------------------------------------------------------------
                        CHECK PERFORMANCE
---------------------------------------------------------------------- */

async function attest_performance (key, index) { // key = feedkey, index = chunk index
  return new Promise(async (resolve, reject) => {
    const feed = new hypercore(RAM, key, { persist: false })
    try {
      const start = performance.now()
      await Promise.race([
        feed.get(index),
        delay(DEFAULT_TIMEOUT).then(() => { throw new Error('Timed out') })
      ])
      const end = performance.now()
      const latency = end - start
      const stats = await getFeedStats(feed)
      resolve([stats, latency])
    } catch (e) {
      log(`Error: ${key}@${index} ${e.message}`)
      reject()
      return [null, null]
    } finally {
      await feed.close()
    }

    async function getFeedStats (feed) {
      if (!feed) return {}
      const stats = feed.stats
      const openedPeers = feed.peers.filter(p => p.remoteOpened)
      const networkingStats = {
        key: feed.key,
        discoveryKey: feed.discoveryKey,
        peerCount: feed.peers.length,
        peers: openedPeers.map(p => {
          return { ...p.stats, remoteAddress: p.remoteAddress }
        })
      }
      return {
        ...networkingStats,
        uploadedBytes: stats.totals.uploadedBytes,
        uploadedChunks: stats.totals.uploadedBlocks,
        downloadedBytes: stats.totals.downloadedBytes,
        downloadedChunks: feed.downloaded(),
        totalBlocks: feed.length
      }
    }
  })
}
















}