module.exports = priorityQueue

function priorityQueue (compare) {
  if (typeof compare !== 'function') throw new Error('missing `compare` function')
  const state = { list: [] }
  return { size, add, take, peek, drop }
  function size () { return state.list.length }
  function add (item) {
    state.list.push(item)
    state.list.sort(compare)
  }
  function take (index = 0) { return state.list.splice(index, 1)[0] }
  function peek (index = 0) { return state.list[index] }
  // function drop (keep) { state.list = state.list.filter(keep) }
  function drop (ids) { state.list = state.list.filter(id => !ids.includes(id)) }
}

/*


const dropped = queue.drop([id])
if (!dropped) queue.drop(new_plan.contracts)
const queue = priorityQueue(function compare (a, b) { return a.id < b.id ? -1 : 1 })
// queue.size()
// queue.add(item) // add item at correct position into queue
// queue.take(index=0) // get front item and remove it from the queue
// queue.peek(index=0) // check front item
// queue.drop(function keep (x) { return item.contract !== id })

*/
