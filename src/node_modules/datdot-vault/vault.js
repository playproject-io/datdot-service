const { cryptoWaitReady } = require('@polkadot/util-crypto')
const ready = cryptoWaitReady()
const sodium = require('sodium-universal')
const path = require('path')
const encode = require('encoding-down')
const memdown = require('memdown')
const levelup = require('levelup')
const sub = require('subleveldown')
const crypto = require('datdot-crypto')

/*******************************
  MASTER SEED
*******************************/
const masterseed = crypto.random_bytes(32)

module.exports = vault

async function vault ({name, log}) {
  await ready
  let nonce = 0n
  const chainKeypair = crypto.create_chain_keypair({
    namespace: 'datdot-account', 
    seed: masterseed, 
    name: 'identity'
  })
  const signingKeyPair = crypto.create_signing_keypair({
    namespace: 'datdot-user', 
    seed: masterseed, 
    name: 'signing' 
  })
  const noiseKeyPair = crypto.create_noise_keypair({
    namespace: 'datdot-user', 
    seed: masterseed, 
    name: 'noise' 
  })

  const account = {
    chainKeypair,
    signingPublicKey: signingKeyPair.signingPublicKey,
    signingSecretKey: signingKeyPair.signingSecretKey,
    noisePublicKey: noiseKeyPair.publicKey,
    storages: new Map(),
    watchingFeeds: new Set(),
    loaderCache: new Map(),
    getNonce: () => nonce++,
    sign,
  }
  
  const storage = account.persist ? path.resolve(account.storageLocation, './hosterDB') : memdown()
  account.storage = storage
  const db = levelup(encode(account.storage, { valueEncoding: 'binary' }))
  account.db = db
  account.hosterDB = sub(db, 'hoster')

  return account

  function sign (toSign) {
    // Allocate buffer for the proof
    const signature = Buffer.alloc(sodium.crypto_sign_BYTES)
    // Sign the data with our signing secret key and write it to the proof buffer
    sodium.crypto_sign_detached(signature, toSign, account.signingSecretKey)
    return signature
  }
}