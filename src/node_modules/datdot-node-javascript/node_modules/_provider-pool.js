// manage idle providers

module.exports = {
  getProviders
}


// const jobID = planID
// const doesQualifyFn = role => id => doesQualify(id)
// const providers = await getProviders({ hosters: 3, attestors: 1, encoders: 3 }, doesQualifyFn) // hosting
// const providers = await getProviders({ attestors: 5 }, doesQualifyFn) // proof of performance
// const providers = await getProviders({ attestors: 1 }, doesQualifyFn) // proof of storage

async function getProviders (opts = {}, doesQualifyFn, avoid = []) {
  const providers = {}
  const roles = Object.keys(opts)
  const idles = await getItems(roles, avoid)
  return find(roles, 0)
  async function find (roles, i, count = 0) { // TODO: maybe replace `find()` with another loop
    if (!roles.length) return providers
    const role = roles[i] // e.g. ['hosters', 'attestors', 'encoders']
    const role_ids = idles[role] // e.g. idleHosters
    const amount = opts[role]
    const nextCombination = random_walker(role_ids, amount)
    const expected = count + amount
    var combination
    while (combination = nextCombination()) {
      if (combination.length < amount) return
      providers[role] = combination
      if (countAllUnique(providers) === expected) {
        const _providers = find(roles, i + 1, expected)
        if (_providers) return providers
      }
    }
  }

  function getItems (roles, avoid) {
    const idles = {}
    const items = []
    const qualifies = roles.map(doesQualifyFn)
    const avoided = id => !avoid.includes(id)
    return new Promise (async (resolve, reject) => {
      for (var r = 0, len = roles.length; r < len; r++) items[r] = db.get(`idle_${roles[r]}`)
      items = await Promise.all(items)
      for (var r = 0, len = roles.length; r < len; r++) {
        const role = roles[r] // @NOTE: optimize later by using a lazy filter module
        idles[role] = items[r].filter(avoided).filter(qualifies[r])
      }
      resolve(idles)
    })
  }
  function countAllUnique (providers) {
    const array = Object.entries(providers).flatMap(([role, ids]) => ids)
    return [...new Set(array)].length
  }
  function random_walker (idles, amount) {
    if (amount <= 0) throw new Error('amount must be bigger than zero')
    const len = idles.length // e.g. 10
    if (len < amount) return []
    const combination = [...new Array(amount)].map((_, i) => i) // e.g. [0, 1, 2] or [0]
    const steps = randomly_sort_indexes(idles) // e.g. [0, 9, 1, 8, 2, 7, 3, 6, 4, 5]
    var pos = combination.length - 1
    return function next () {
      if (combination[pos] < len) return getCombination()
      else { // amount = 8, len = 10
        pos -= 1 // pos = 7, [0, 1, 2, 3, 4, 5, 7, (10)]
        for (var i = pos; i > 0; i--) { // i = 6. pos = 6, [0, 1, 2, 3, 4, 5, (7), 10]
          var max = len - (amount - pos)
          if (combination[i] < max) { // pos = 6, [0, 1, 2, 3, 4, 5, (8), 10]
            combination[i] += 1
            for (var k = i + 1; i < amount; k++) combination[k] = combination[k - 1] + 1
            } // k = 7 pos = 7, [0, 1, 2, 3, 4, 5, 8, (10->9)]
            return getCombination()
          } // [0, 1, 2, 3, 4, (5), 8, 10], pos = 5, amount = 8, len = 10
        }
      }
    }
    function getCombination () {
      const selected = select(combination)
      combination[pos] += 1 // e.g [0, 1, 2] ... [0, 1, 9]
      return selected // e.g [0, 1, 3] ... [0, 1, 10]
    }
    function select (index /* e.g. [0, 1, 2] */) {
      for (var i = 0, providers = [], size = index.length; i < size; i++) {
        const digit_i = index[i] // e.g. 0
        const pseudo_random_pos = steps[digit_i]
        providers.push(idles[pseudo_random_pos])
      }
      return providers
    }
  }
  function randomIntFromInterval (min, max) { // min & max included
    return Math.floor(Math.random() * (max - min + 1) + min)
  }
  function randomly_sort_indexes (items) {
    const indexes = Object.keys(items) // e.g. [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], because: len = 10
    const walk = []
    while (indexes.length) {
     const i = randomIntFromInterval(0, indexes.length - 1)
     walk.push(indexes.splice(i, 1))
    }
    return walk // e.g. [0, 9, 1, 8, 2, 7, 3, 6, 4, 5]
  }
}
