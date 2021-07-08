const intercept = require('intercept-hypercore-storage')
const brotli = require('brotli')
const parse_decompressed = require('_datdot-service-helpers/parse-decompressed')

const ENCODED_DATA_PREFIX = 0
const DECODED_PREFIX = 1
const ENCODED_DATA_SIGNATURE_PREFIX = 2
const NODES_PREFIX = 3
const UNIQUE_EL_PREFIX = 4
var stuff = { storeEnc: [], storeDec: [], getEnc: [], getDec: [] }

module.exports = class HosterStorage {
  /**
  brotli is an object with `async encode(rawData)` and `async decode(encodedData)`
  db is a levelup instance
  feed is a hypercore instance that will be used to store / seed the hosted hypercore
  **/
  constructor ({ db, feed, log }) {
    this.db = db
    this.log = log
    this.feed = feed
    this.unintercept = intercept(feed, {
      getData: (index, cb) => this.getData(index, cb),
      putData: (index, data, cb) => this.putData(index, data, cb)
    })
  }

  // Invoked by the encoder so that the host will store the encoded data
async storeEncoded ({ index, encoded_data_signature, encoded_data, unique_el, nodes }) {
    this.log({ type: 'hoster', data: [`Hoster storage - starting to store`]})
    // Get the decoded data at the index
    // In parallel, decode the encoded data
    const decompressed = await brotli.decompress(encoded_data)
    const decoded = parse_decompressed(decompressed, unique_el)
    stuff.storeEnc[index] = encoded_data
    stuff.storeDec[index] = decoded

    // If it's the same save the encoded data
    // and delete the decoded data if it exists
    await this._putEncodedData(index, encoded_data)
    await this._delDecoded(index)
    await this._putEncodedDataSignature(index, encoded_data_signature)
    await this._putNodes(index, nodes) // TODO: store deduplicated nodes 
    await this._putUniqueEl(index, Buffer.from(unique_el, 'binary'))
    this.log({ type: 'hoster', data: [`Hoster storage - all stored for chunk ${index}`]})
  }

  // Invoked by whoever to test that the hoster is actually hosting stuff
  async getProofOfStorage (index) {
    const [encoded_data, encoded_data_signature, nodes] = await Promise.all([
      this._getEncodedData(index),
      this._getEncodedDataSignature(index),
      this._getNodes(index),
    ])
    return {
      feedKey: this.feed.key,
      index,
      encoded_data,
      encoded_data_signature,
      nodes,
    }
  }

  // Meant to be used by the hypercore storage
  getData (index, cb) {
    this._getEncodedData(index)
      .then(async (encoded_data) => {
        // Got encoded data!
        // Decode and return it
        const enc = stuff.storeEnc[index]
        const dec = stuff.storeDec[index]
        // TODO (maybe it's ok)
        // const decompressed = await brotli.decompress(encoded_data)
        // const unique_el = await this._getUniqueEl(index)
        // const decoded = parse_decompressed(decompressed, unique_el)
      }, async () => {
        // Key doesn't exist? Try to get decoded version
        const decoded = await this._getDecoded(index)
        // If it exists, return it
        return decoded
      }).then((decoded) => {
        // If we got the value, send it to the CB
        cb(null, decoded)

        // Else pass unexpected errors to the CB
      }).catch(cb)
  }

  // Meant to be used by the hypercore storage
  putData (index, data, cb) {
    // Check if encoded data exists
    this._getDecoded(index).then(() => {
      // We already have the encoded version so whatever
      cb(null)
    }, async () => {
      // We don't have the encoded version so we should store the decoded version
      await this._putDecoded(index, data)
    }).then(() => cb(null), (err) => cb(err))
  }

  async _getEncodedData (index) {
    return this.db.get(makeKey(ENCODED_DATA_PREFIX, index))
  }
  async _getDecoded (index) {
    return this.db.get(makeKey(DECODED_PREFIX, index))
  }
  async _getEncodedDataSignature (index) {
    return this.db.get(makeKey(ENCODED_DATA_SIGNATURE_PREFIX, index))
  }
  async _getNodes (index) {
    const nodesBuf = await this.db.get(makeKey(NODES_PREFIX, index))
    const json =  nodesBuf.toString('utf-8')
    const nodes = JSON.parse(json)
    return nodes.map(node => {
      node.hash = Buffer.from(node.hash, 'hex')
      return node
    })
  }
  async _getUniqueEl (index) {
    return this.db.get(makeKey(UNIQUE_EL_PREFIX, index))
  }

  async _putEncodedData (index, data) {
    return this.db.put(makeKey(ENCODED_DATA_PREFIX, index), data, Buffer.from([0, 255]), err => {
      if (err) this.log({ type: 'fail', data: { text: '_putEncodedData', err } })
    })
  }
  async _putDecoded (index, data) {
    return this.db.put(makeKey(DECODED_PREFIX, index), data, Buffer.from([0, 255]), err => {
      if (err) this.log({ type:'fail', data: { text: '_putDecoded', err } })
    })
  }
  async _putEncodedDataSignature (index, proof) {
    return this.db.put(makeKey(ENCODED_DATA_SIGNATURE_PREFIX, index), proof, Buffer.from([0, 255]), err => {
      if (err) this.log({ type: 'fail', data: { text: '_putEncodedDataSignature', err } })
    })
  }
  async _putNodes (index, nodes) {
    nodes = Buffer.from(JSON.stringify(nodes), 'utf-8')
    return this.db.put(makeKey(NODES_PREFIX, index), nodes, Buffer.from([0, 255]), err => {
      if (err) this.log({ type: 'fail', data: { text: '_putNodes', err} })
    })
  }
  async _putUniqueEl (index, data) {
    return this.db.put(makeKey(UNIQUE_EL_PREFIX, index), data, Buffer.from([0, 255]), err => {
      if (err) this.log({ type: 'fail', data: { text: '_putUniqueEl', err} })
    })
  }

  async _delDecoded (index) {
    try {
      await this.db.del(makeKey(DECODED_PREFIX, index))
    } catch {
      // Whatever, it's probably not saved
    }
  }

  async close () {
    await this.feed.close()
    await this.db.close()
  }

  async destroy () {
    await this.feed.destroy()
    await this.db.clear()
    await this.db.close()
  }
}

function makeKey (type, index) {
  // Allocate a buffer that holds enough for the type and the index
  const typedKey = new Uint32Array(2)

  typedKey[0] = type
  typedKey[1] = index

  return Buffer.from(typedKey.buffer)
}