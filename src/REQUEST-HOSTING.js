const dateToBlockNumber = require('dateToBlockNumber')
const get_feed_metadata = require('get_feed_metadata')
const ready = require('hypercore-ready')
const hypercore_replicated = require('hypercore-replicated')
const get_signature = require('get-signature')
const get_max_index = require('get-max-index')
const get_nodes = require('get-nodes')
const hyperswarm = require('hyperswarm')
const hypercore = require('hypercore')
const RAM = require('random-access-memory')
/******************************************************************************
  ROLE: sponsor
******************************************************************************/

module.exports = request_hosting

async function request_hosting (profile, APIS) {
  const { name, log } = profile
  const { chainAPI, vaultAPI } = APIS
  const getChatAPI = require('../lab/simulations/chatAPI')
  const chatAPI = await getChatAPI(profile, ['ws://localhost', '8000'].join(':'))

  log({ type: 'sponsor', data: [`I am a sponsor`] })
  await chainAPI.listenToEvents(handleEvent)
  const myAddress = await vaultAPI.chainKeypair.address
  log({ type: 'sponsor', data: [`My address ${myAddress}`] })
  const signer = await vaultAPI.chainKeypair

  // EVENTS

  chatAPI.on(async keys => {
    log({ type: 'sponsor', data: [`Got the keys, publishing data now => ${keys}`] })
    const { feedkey, topic } = JSON.parse(keys)
    const components = await makeComponents(feedkey, topic)
    const duration = await getFromUntilBlock()
    const data = await makePlan( duration, components, topic)
    const nonce = await vaultAPI.getNonce()
    await chainAPI.publishPlan({ data, signer, nonce })
  })

  async function handleEvent (event) {
    if (event.method === 'FeedPublished') {
      log({ type: 'chainEvent', data: [`Event received: ${event.method} ${event.data.toString()}`] })
    }
    if (event.method === 'StorageChallengeConfirmed') {
      const [storageChallengeID] = event.data
      const { contract: contractID } = await chainAPI.getStorageChallengeByID(storageChallengeID)
      const { plan: planID } = await chainAPI.getContractByID(contractID)
      const { sponsor: sponsorID } = await chainAPI.getPlanByID(planID)
      const sponsorAddress = await chainAPI.getUserAddress(sponsorID)
      if (sponsorAddress === myAddress) {
        log({ type: 'chainEvent', data: [`Event received: ${event.method} ${event.data.toString()}`] })
      }
    }
    if (event.method === 'PerformanceChallengeConfirmed') {
      const [performanceChallengeID] = event.data
      const { contract: contractID } = await chainAPI.getPerformanceChallengeByID(performanceChallengeID)
      const { plan: planID } = await chainAPI.getContractByID(contractID)
      const { sponsor: sponsorID } = await chainAPI.getPlanByID(planID)
      const sponsorAddress = await chainAPI.getUserAddress(sponsorID)
      if (sponsorAddress === myAddress) {
        // log({ type: 'chainEvent', data: [`Event received: ${event.method} ${event.data.toString()}`] })
        log({ type: 'chainEvent', data: [`Event received: ${event.method} ${event.data.toString()}`] })

      }
    }
  }

  // HELPERS
 // See example https://pastebin.com/5nAb6XHQ
 // all feeds under one Plan have same hosting settings
//  function sponsorPlan () {
//    const sponsorship = {
//      planID,
//      importance : '', // 1-3? 1-10?
//      budget     : '',
//      traffic    : '',
//      price      : '',
//    }
//    return { type: 'start', data: sponsorship }
//  }
//  function updateSponsorship () {
//    return { type: 'pause', data: id }
//    return { type: 'resume', data: id }
//    return { type: 'cancel', data: id }
//    return { type: 'update', data: { id, update: { importance, budget } } }

//     if ( type === 'update') sponsorships[data.id] = Object.assign(sponsorships[data.id], data.update)
//  }

  async function makePlan (duration, components, topic) {
    const plan = {
      duration,
      swarmkey: topic,
      program  : [
        // { plans: [] }, // duplicate program from referenced plans
        {
          dataset: [-1],
          regions: [-1, -2],
          timetables: [-1],
          performances: [-1],
        },
        // { dataset, regions, performance, times },
        // { dataset, regions, performance, times }
      ],
    }
    const unfiltered = plan.program.map(arr => arr.dataset)
    const datasets = [...new Set(unfiltered)].flat()
    const proofs = await getProofs(components, datasets)
    return {
      plan,
      components,
      proofs
    }
  }
  function makePlanUpdate ({ plan }) {
    // - pause plan (define max, after that resume or drop) - maybe pause only performance challenges
    //   -> hosters can pause seeding and dont get paid for seeding, only storing,  while paused
    // ...
    const { program: { add, del, put } } = plan
    Object.entries(put).map(([i, val]) => Object.assign(program[i], val))
    del.map(i => program.splice(i, 1))
    program.push(...add)

    return {
      id,
      components,
      from,
      until,
      program: {
        add: [{ dataset, regions, performance, timetable }, { plans: [33] }],
        del: [0],
        put: {2: { dataset, regions }},
      }
    }
  }

  async function makeComponents (feedkey, topic) {
    const feed1 = { feedkey, swarmkey: topic, signatures: {} }
    const feeds = [feed1]
    const dataset_items = [
      { feed_id: -1, ranges: [[0,3], [5,8], [10,14]] },
    ]
    const performance_items = [{ // OPTIONAL
      availability: '', // percentage_decimal
      bandwidth: { /*'speed', 'guarantee'*/ }, // bitspersecond, percentage_decimal
      latency: { /*'lag', 'guarantee'*/ }, // milliseconds, percentage_decimal
    }]
    const timetable_items = [{ // OPTIONAL
      duration : '', // blocknumbers // { from, until }
      delay    : '', // milliseconds // default: 0
      interval : '', // milliseconds // 
      repeat   : '', // number // default: none
    }]
    const region_items = [{ geohash: 'X3F' }, { geohash: 'A0K' }]  // at least 1 region is mandatory (defaults to global)
    return { feeds, dataset_items, performance_items, timetable_items, region_items }
  }

  async function getFromUntilBlock () {
    const blockNow = await chainAPI.getBlockNumber()
    const until = new Date('Nov 26, 2021 23:55:00')
    const untilBlock = dateToBlockNumber ({ dateNow: new Date(), blockNow, date: until })
    return { from: blockNow, until: untilBlock }
  }

  async function getProofs (components, datasets) {
    const proofs = []
    const all = []
    for (var i = 0, len = datasets.length; i < len; i++) {
      all.push(new Promise(async (resolve, reject) => {
        const { signatures, feedkey, sig, feed_ref } = await getKeyAndSignature(datasets[i], components)
        if (sig) return
        const core = new hypercore(RAM, Buffer.from(feedkey, 'hex'), { valueEncoding: 'binary', sparse: true })
        await ready(core)
        const swarm = hyperswarm()
        swarm.join(core.discoveryKey,  { announce: false, lookup: true })
        swarm.on('connection', async (socket, info) => {
          socket.pipe(core.replicate(info.client)).pipe(socket)
          await hypercore_replicated(core)
          log({ type: 'publisher', data: [`Hypercore replicated ${core}`] })
          const v = core.length - 1
          // another check if this signature is already on chain 
          if (signatures[v]) return
          const signature = await get_signature(core, v)
          const nodes = await get_nodes(core, v, v)
          proofs.push({ feed_ref, signature, nodes })
          resolve()
        })
      }))
    }
    await Promise.all(all).catch(err=> console.log(err))
    return proofs
  }
  
  async function getKeyAndSignature (dataset_ref, components) {
    const { feeds, dataset_items } = components
    const dataset_item = dataset_ref > 0 ? await getItemByID(dataset_ref) : dataset_items[(Math.abs(dataset_ref) - 1)]
    const { feed_id: feed_ref, ranges } = dataset_item
    const feed = feed_ref > 0 ? await getItemByID(feed_ref) : feeds[(Math.abs(feed_ref) - 1)]
    const { feedkey, version } = feed
    // check what is the highest verison
    const keys = Object.keys(feed.signatures)
    const signatures = keys.map(key => Number(key))
    if (signatures.length) {
      const max = get_max_index(ranges)
      var index = signatures.find(v => v >= max)
      return { signatures, feedkey, sig: { index, signature: feed.signatures[index] }, feed_ref }
    } else {
      return { signatures, feedkey, feed_ref }
    }
  }

}