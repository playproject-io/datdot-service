/******************************************************************************
  TYPES / SCHEMA
******************************************************************************/
// for more types, see: https://pastebin.com/5nAb6XHQ

// ============================================================================
// storage - append only log to assign un ique id's to entries
// ============================================================================
// 'DB.storage'                            // create, get, (set), (del)

// ============================================================================
// status - onchain status
// ============================================================================

// 'DB.status.idleHosters'                 // push, pop, set
// 'DB.status.idleHosters[x]'              // get, splice/del
// 'DB.status.idleAttestors'               // push, pop, set
// 'DB.status.idleAttestors[x]'            // get, splice/del
// 'DB.status.idleEncoders'                // push, pop, set
// 'DB.status.idleEncoders[x]'             // get, splice/del

// ============================================================================
// status - onchain status
// ============================================================================

// 'DB.status.pendingAmendments'           // push, pop, set  // ammendments => contract.update // { fnName: 'makePerformanceChallenge', opts: contractID ) }
// 'DB.status.pendingAmendments[x]'        // get, splice/del
// 'DB.status.attestorsJobQueue'           // size, add, take, peek, drop // { planID, feedID, set }

// ============================================================================
// active - offchain status
// ============================================================================

// 'DB.activeQueue.activePerformanceChallenges' // ???
// 'DB.activeQueue.activeStorageChallenges'     // ???
  // activeAmmendments (or contracts)

// ============================================================================
// query / lookup - immutable
// ============================================================================
// 'DB.lookups.userByAddress'              // set, get
// 'DB.lookups.userIDByKey'                // set, get // { key: id }
// 'DB.lookups.feedByKey'                  // set, get
// ============================================================================
// performance challenge:
// ============================================================================
// /* set, get           */ `storage/:id/performance_challenge/id`
// /* set, get           */ `storage/:id/performance_challenge/contract_id`
// /* set, get           */ `storage/:id/performance_challenge/hoster_id`
// /* push, get, forEach */ `storage/:id/performance_challenge/attestor/:id`
// // VS.
// /* set, get           */ `storage/:id/performance_challenge/attestor_ids`
// {
//   id,
//   contract: 'contractID',
//   hoster
//   attestors: ['attestorID'], // 5x
// }

// ============================================================================
// storage challenge:
// ============================================================================
// /* set, get           */ `storage/:id/storage_challenge/id`
// /* set, get           */ `storage/:id/storage_challenge/contract_id`
// /* set, get           */ `storage/:id/storage_challenge/hoster_id`
// /* set, get           */ `storage/:id/storage_challenge/attestor_id`
// /* push, get, forEach */ `storage/:id/storage_challenge/chunks` // = [1,4,6]
// {
//   id,
//   contract: 'contractID',
//   hoster,
//   attestor,
//   chunks: [1,4,6]
// }
// ============================================================================
// contract
// ============================================================================
// /* set, get           */ `storage/:id/hosting/id`
// /* set, get           */ `storage/:id/hosting/plan_id`
// /* set, get           */ `storage/:id/hosting/feed_id`
// /* set, get           */ `storage/:id/hosting/ranges`
// /* push, get          */ `storage/:id/hosting/amendments`
// /* get                */ `storage/:id/hosting/amendments/:id_x`
// /* set, get           */ `storage/:id/hosting/status/active_hoster/:id_h`
// /* set, get           */ `storage/:id/hosting/status/scheduler_id`
// {
//   id,
//   feed,
//   plan: planID,
//   ranges,
//   activeHosters: [],
//   amendments: [],
//   status: {
//     schedulerID: integer
//   }
// }
// ============================================================================
// amendment
// ============================================================================
// /* set, get           */ `storage/:id/amendment/id`
// /* set, get           */ `storage/:id/amendment/contract_id`
// /* set, get, push     */ `storage/:id/amendment/providers/encoders`
// /* set, get           */ `storage/:id/amendment/providers/encoders/:id`
// /* set, get, push     */ `storage/:id/amendment/providers/hosters`
// /* set, get           */ `storage/:id/amendment/providers/hosters/:id`
// /* set, get, push     */ `storage/:id/amendment/providers/attestors`
// /* set, get           */ `storage/:id/amendment/providers/attestors/:id`
// {
//   id,
//   contract: contractID,
//   providers: {
//     encoders,
//     hosters,
//     attestors,
//   },
// }

// ============================================================================
// user
// ============================================================================
// `storage/:id/user/id`  // boolean `if (user[5]) const user = storage[5]`
// `storage/:id/user/noisekey` // ed2519 public key
// `storage/:id/user/signkey`  // ed25519 public key
// `storage/:id/user/form/from`
// `storage/:id/user/form/until`
// `storage/:id/user/form/timing`
// `storage/:id/user/form/region`
// `storage/:id/user/form/performance`
// `storage/:id/user/form/resources`
// `storage/:id/user/jobs/hoster`
// `storage/:id/user/jobs/attestor`
// `storage/:id/user/jobs/encoder`
// `storage/:id/user/status/capacity`
// `storage/:id/user/status/idleStorage`
// {
//   id, 776
//   key: noiseKey, // public noise key
//   address: signer, //public chain key
//   form: {
//     components: {
//       resources,
//       performance,
//       timings,
//       region,
//     },
//     from        : blockNow, // or new Date('Apr 30, 2000')
//     until       : untilBlock, // date
//     timetable   : [0, 1],
//     region      : 0,
//     performance : 0,
//     resources   : 0,
//   },
//   jobs: {
//     hoster: {},
//     encoder: {},
//     attestor: {},
//   }
//   status: {
//     capacity: 5 // based on resources needed for one job // getCapacity (jobType, job, userid)
//     idleStorage,
//   }
// }
// 'storage[15].type'                   //
// 'storage[15].hoster.jobs[5]'         //
// ============================================================================
// feed:
// ============================================================================
// `storage/:id`
// `storage/:id/id`
// `storage/:id/publickey`
// `storage/:id/meta/signature/:version`
// `storage/:id/meta/hashType`
// `storage/:id/meta/children`
// {
//   id: 1,
//   publickey: 'key',
//   meta: '{ signature, hashType, children }',
// }
// `feed/:id/publickey`
// `feed/:id/version/:v/` // signature
// `feed/:id/chunk/:v` // cummulative size for that version
// const feed = {
//   publickey,
//   version: {
//       // short array
//       // only one signature on feed publish + one per feed update
//     23: signature1 // feed length old
//     42: signature2 // feed length new
//   },
//   size: { // for nodes
//     // multiple sizes for each storage proof get added
//     23: 64.05
//     24: 63.251
//     25: ...
//   }
// }

// Encoder sends total size of all compressed chunks to attestor
// attestor send total compressed size  and signatures to chain
// => attestor submits all 6 signatures



// => two versions can calculate size for any range
// => one lookup per calculated hash in proofs
// => native api feed.getRoothashes() provides the values
// @NOTE: how to store sizes for proof hashes for chunks

// 1. random attestor provides root signature to chain
// 2. try single random contract to get max X times failed hoster proof
//    => to try new attestor to get corrected root signature
// 3. if any hoster provides valid proof, start hosting all contracts

// 4. sizes are provided by hosters with proof and size is stored on chain
// 5. hoster can skip node sizes for nodes that were provided in the past

// 6. how to decide contract set sizes, given no 64kb chunk guarantee?
// => maybe host one contract with 10 chunks at a time
// =>
// => random attestor will have
//    ==> lots of work collecting sizes for e.g. 1 billion chunks

// BUT:
// per proof we will get correct sizes from hoster
// on average we need to make sure stored contracts are correct size
// => so we pay hosters appropriately


// => hoster knows what they store compressed
// => hosters might wanna decompress to verify proofs
// ==> but if they see problem, they cant say anything
// ==> if attestor reports +1, hosters get bad grades
// ==> but attestor doesnt know uncompressed size and doesnt verify proofs
// ==> encoders could provide crap data

// ==> but attestor gets only paid when all hosters work
// ==> encoders too
// ====> so no incentive to cheat
// ====> encoders providing correct size + malicious error
// =====> would go undetected
// =====> attestor has cached wrong data
// ======> would get switched out after X fails from all hosters
// =======> after X fails of attestor we might need to replace encoders too
// =========> encoder has lots of power to slow down chain
// =========> let attestor verify encoder data ( if they want )
// ==> if attestor find out bug (or not)
// ==> they can forward to hoster
// ===> hoster has risk of:
// 1. encoder bugging and attestor not checking
// 2. attestor bugging
// => in both cases they have no fault
// ===> but if attestor reports +1 hoster gets punished
// ===> better hoster verifies immediately and signs ok back to attestor
// ====> so attestor has to provide hoster failed or hoster signature
// attestor cannot make hoster ok when hoster is not

// hosters verify encoders, by sending back signed total uncompressed size
// => attestor compares

// => nobody knows what they save based on compression
// ==> but encoders & attestors do know, but how can we trust?


// ============================================================================
// plan:
// ============================================================================
// `storage/:id`
// `storage/:id/id`
// `storage/:id/sponsor_id`
// `storage/:id/from`
// `storage/:id/until` // until: time, budget, price...???
// `storage/:id/program`
// `storage/:id/status/contract_ids`
// `storage/:id/status/contract_ids/:c_id`
// {
//   id,
//   // sponsor_id: 'userID',
//   components: { dataset, performances, timings, regions },
//   from     : blockNow, // or new Date('Apr 30, 2000')
//   until    : untilBlock, // date
//   program  : [
//     {
//       // TODO: if you publish a few local components (e.g. 5)
//       // and you want to reference the global component with id=3
//       // how to figure out if thats local ID or global ID
//       // e.g. positive vs. negative numbers to differentiate
//       dataset, // [0, 1]
//       regions, // [0, 1]
//       performance: 0,
//       timetable, // [0]
//     },
//     { dataset, regions, performance, timetables },
//     { dataset, regions, performance, timetables }
//   ],
//   status: {
//     contract_ids: [],
//   }
// }
// ----------------------------------------------------------------------
// `components`
// => allows transactions to include data
// => which will be stored on chain and given a unique id
// => so that that data can be referenced by the same or future transactions

// e.g. plan.performance
// 1. sort all keys alphabetically
// 2. e.g. stringify and hash to see if it already exists on chain
// 3. if YES: re-use id, if NO: store and make new id
// 4. alternative to hashing => store in trie

// ============================================================================
// plan - component - dataset
// ============================================================================
// `type/dataset/:id`
// `storage/:id`
// `storage/:id/id`
// `storage/:id/ranges/:i/:first`
// `storage/:id/ranges/:i/:last`
// const dataset = [{ id, ranges }]

// ============================================================================
// plan - component - performance
// ============================================================================
// `type/performance/:id`
// `storage/:id` // = { availability, bandwidth, latency }
// `storage/:id/availability`
// `storage/:id/bandwidth/ingress/speed`
// `storage/:id/bandwidth/ingress/guarantee`
// `storage/:id/bandwidth/egress/speed`
// `storage/:id/bandwidth/egress/guarantee`
// `storage/:id/latency/speed`
// `storage/:id/latency/guarantee`
// const performances = [{ // OPTIONAL
//   availability: '', // percentage_decimal
//   bandwidth: { /*'speed', 'guarantee'*/ }, // bitspersecond, percentage_decimal
//   latency: { /*'lag', 'guarantee'*/ }, // milliseconds, percentage_decimal
// }]
// ============================================================================
// user - component - performance
// ============================================================================
// `storage/:id/user/form/components/performance`
// ============================================================================
// user - component - timetables
// ============================================================================
// `storage/:id/user/form/components/timing`

// ============================================================================
// plan - component - timing
// ============================================================================
// /* make, get */ `timing/:id`      // = { delay, duration, pause, repeat }
// * we always store as a blob
// * it never gets updated
// * we always need all values (we read it always as a blob)
// * we always know from context (e.g. plan, form) that an id is a timing id
// * this format uses least amount of space and computation for the use case
// ----------------------------------------------
// BLOB STORAGE:
// 1. store timing ON CHAIN independently with a unique id
// /* make, get */ `storage/:id` // = { delay, duration, pause, repeat }
// leveldb.set('storage/5', { delay: 5, duration: 5, pause: 5, repeat: 5 })
// leveldb.set('storage/5', { delay: 15, duration: 5, pause: 5, repeat: 5 })
// const timing = leveldb.get('storage/5')
// 2. store as blob, because individual values are never needed in isolation
// PROs:
// * easier to store all
// * easier to read all
// * minimal storage space
// CONs:
// * more work to update individually   <= never happens
// * more work to read individual keys  <= never needed
//
// INDIVIDUAL STORAGE:
// `storage/:id/id`
// `storage/:id/delay`
// `storage/:id/duration`
// `storage/:id/pause`
// `storage/:id/repeat`
// leveldb.set('storage/5/delay', 5)
// leveldb.set('storage/5/duration', 5)
// leveldb.set('storage/5/pause', 5)
// leveldb.set('storage/5/repeat', 5)
// leveldb.set('storage/5/delay', 15)
// PROs:
// * easier to update individually   <= never happens
// * easier to read individual keys  <= never needed
// CONs:
// * more work to store all
// * more work to read all
//
// C: ALL by TYPE
// /* make, get */ `type/timing/:id` // true
// /* make, get */ `timing/:id`      // true
// PROs:
// * easier to see all of given type
// CONs:
// * more work to see type of id
// * more storage on chain <= can be done in frontend instead
//
// // E: STORING + ALL BY TYPE
// `timing/:id`      // = { delay, duration, pause, repeat }
// // PROs:
// // * easier to see all types
// // * easier to store all
// // * easier to read all
// // CONs:
// // * more work to see type of id
// // * more work to update individually
// // * more work to read individual keys
//
// // F: STORING + ALL BY TYPE
// `timing/:id/delay`
// `timing/:id/duration`
// `timing/:id/pause`
// `timing/:id/repeat`
// // PROs:
// // * easier to see all types
// // * easier to update individually
// // * easier to read individual keys
// // CONs:
// // * more work to see type of id
// // * more work to store all
// // * more work to read all
//
// D: LOOKUP TYPE
// `storage/:id/type`   // 'timing'
// `type/:id`           // 'timing'
// PROs:
// * easy to see type of id
// CONs:
// * more work to see all of given type
// ============================================================================
// user - component - resources
// ============================================================================
// `storage/:id/user/form/components/resources`
// TODO: decide later, once it is clear which resources we are tracking
// ============================================================================
// plan - component - regions
// ============================================================================
// `region/:id` = ['X3F', 'A0K']
// * we always store as a blob
// * it never gets updated
// * we always need all values (we read it always as a blob)
// * we always know from context (e.g. plan, form) that an id is a region id
// * this format uses least amount of space and computation for the use case
// ----------------------------------------------
// `type/regions/:id`
// `storage/:id`
// `storage/:id/id`
// `storage/:id/geohash`
// const regions = [
//   ['X3F', 'A0K'],
//   ['AX3F', 'A0TY'],
// ]
// TODO: solve later
// 1. are geo hashes the best format to store?
// 2. how can we make it easy to match hosters with plans to
//    * minimize storage
//    * minimize computation
// ============================================================================
// user - component - region
// ============================================================================
// `storage/:id/user/form/components/region`
// `region/:id` = ['X3F', 'A0K']
// hoster region is one hash
// plan regions is array of hashes
// matching process:
// 1. check if hoster hash included in plan hashes
// 2. check if hoster hash starts with plan hash
// 3. check if hoster have neighbour hashes to plan hash ?
//
// 1. hoster region is hoster hash + area of size X
//    * e.g. X3FaaaF1 => area: X3FaaaF1 + radius of Y hashes
// 2. we match hoster hashes with plan hashes
//    * select 3 hosters with the best match
// TODO: solve later
// 1. are geo hashes the best format to store?
// 2. how can we make it easy to match hosters with plans to
//    * minimize storage
//    * minimize computation
// 3. how to make hoster regions dynamic based on performance measurements
//


/*
1. a network of nodes
2. randomly ping nodes in the graph

1. update performance map every time a proof of performance is submitted
   * PoP includes many attestor stats
   * PoP includes hoster stats
2. re-assign existing jobs to new best hosters maybe?
3.

*/
// SCENARIO
// const nodes = [
//   { id: 1, location: 'XF3', lag: [
//     [2, 0.3],
//     [3, 0.3],
//     [4, 0.3],
//   ]}, { id: 2, location: 'AF3', lag: [
//     [1, 0.3],
//     [3, 0.3],
//     [4, 0.3],
//   ]}, { id: 3, location: 'XA3', lag: [
//     [2, 0.3],
//     [1, 0.3],
//     [4, 0.3],
//   ]}, { id: 4, location: 'XF3', lag: [
//     [2, 0.3],
//     [3, 0.3],
//     [1, 0.3],
//   ]}
// ]
// const nodes = [
//   {
//     id: 1, location: 'Berlin', lag: [
//     ['South London', 0.1],
//     ['East London', 0.3],
//     ['Rome', 0.1],
//   ]}, {
//     id: 2, location: 'South London', lag: [
//     ['Berlin'], 0.2],
//     ['East London', 0.2],
//     ['Rome', 0.3],
//   ]}, {
//     id: 3, location: 'East London', lag: [
//     ['South London', 0.3],
//     ['Berlin'], 0.5],
//     ['Rome', 0.2],
//   ]}, {
//     id: 4, location: 'Rome', lag: [
//     ['South London', 0.2],
//     ['East London', 0.5],
//     ['Berlin'], 0.1],
//   ]}
//   // ...
// ]



/******************************************************************************
  STATE
******************************************************************************/
const storage = [] // append only log to assign unique id's to entries

/******************************************************************************
  LOOKUP - IMMUTABLE
******************************************************************************/
const userByAddress = {} // address
const feedByKey = {
  // { key: id }
}
const userIDByNoiseKey = {}
const userIDBySigningKey = {}
const lookups = { // for immutable components
  userByAddress,
  userIDBySigningKey,
  userIDByNoiseKey,
  feedByKey,
}
/******************************************************************************
  ONCHAIN STATUS
******************************************************************************/
const idleHosters = [] // user ids
const idleEncoders = [] // user ids
const idleAttestors = [] // user ids
const status = {
  idleHosters,
  idleEncoders,
  idleAttestors,
}
const attestorsJobQueue = [] // { fnName: 'makePerformanceChallenge', opts: contractID ) }
const pendingAmendments = [] // { planID, feedID, set }
// TODO: merge into single queue
const queues = {
  pendingAmendments, // ammendments => contract.update
  attestorsJobQueue,
}


// ----------------------------------------------------------------------------
// @NOTE:
// ...
// * do they need to be prioritized and/or grouped?
// * how should this be efficiently structured?
// * is `doesQualify` related? (what else?)
//
// => we want RANDOM for security
// => we want SPECIFIC for best quality of service

// - location



// makeX.js
// function make (opts) {

//   return {
//     push(type, peerID) {
//       var arr = ALL[type]
//       if (!arr) ALL[type] = []
//       arr.push(peerID)
//     }
//   }
// }


// removeJobForRole
// giveJobToRoles
// tryNextChallenge
// select

// const opts = {}
// const idleHosters = make(opts) // should be a `new Set()`
// const idleEncoders = make(opts)
// const idleAttestors = make(opts)


// const idlePeers = make(opts)
// idlePeers.push('attestor', peerID)


// idleHosters.push(peerID)


// const providers = idlehosters.select(jobID)

// idlehosters.select(jobID)
// idlehosters.select(jobID)
// const providers  = {}
// ----------------------------------------------------------------------------


/******************************************************************************
  OFFCHAIN STATUS
******************************************************************************/
const storageChallenges = {
/*
  challengeID1: true,
  challengeID_2: true,
  ...
*/
}
const performanceChallenges = {
/*
  challengeID1: true,
  challengeID_2: true,
  ...
*/
}
const active = {
  // activeAmmendments (or contracts)
  performanceChallenges,
  storageChallenges
}
/*****************************************************************************/
const DB = { storage, lookups, active, queues, status }
module.exports = DB
