
const DB = {}
const UID = {}

module.exports = tempDB

async function tempDB (uid) {
  if (UID[uid]) throw new Error(`taskdb for "${uid}" was already initialized`)
  const storage = DB[uid] = { len: 0 } // TODO: also persist storage to disk
  const db = UID[uid] = {
    add,
    del,
    list,
  }
  return db
  async function add (info, ref) {
    const tid = storage.len++
    storage[tid] = { info, ref}
    return new Promise(ok => ok(tid))
  }
  async function del (id) {
    const data = storage[tid]
    const bool = data ? true : false
    delete storage[tid]
    return new Promise(ok => ok(bool))
  }
  function list () {
    const all = Object.keys(storage).filter(x => x === 'len')
    return new Promise(ok => ok(all))
  }
}
