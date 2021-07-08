module.exports = makeSets

function makeSets ({ ranges, setSize }) {
  const sets = []
  for (var i = 0; i < ranges.length; i++) fillTheSet(ranges[i], sets, setSize)
  formatSets(sets)
  // if (sets[0] === setSize) formatSets(sets)
  return sets
}

var counter = 0
function fillTheSet (range, sets, setSize) {
  const [min, max] = range // [7,23]
  for (var i = min; i < max + 1; i++) {
    if (!sets[counter]) sets[counter] = []
    if (sets[counter].length < setSize) { sets[counter].push(i) }
    if (sets[counter].length === setSize) counter++
  }
}

function formatSets (sets) {
  var prev
  for (var i = 0; i < sets.length; i++) { // [[0,1,2,3,4,5,6,7,8,9],[10,11,12,13,14,15,16,17,18,19],[20,21,22,23,24,25,28,29,30,31],[32,33,34,35,36,37,39,40,42,43],[72,73,74,75,76,77,78,79,80,81],[82,83,84,85,86,87,88,89,90,91],[92,93,94,95,96,97,98,99,100]]
    const set = sets[i]
    var count = 0
    sets[i] = []
    for (var j = 0; j < set.length; j++) { // [0,1,2,3,4,5,6,7,8,9]
      const current = set[j]
      if (!sets[i][count]) sets[i][count] = [current, undefined]
      // current is last el & current - prev > 1
      if (j === set.length-1 && current - prev !== 1 && prev !== undefined) {
        sets[i][count][1] = prev
        count++
        sets[i][count] = [current, current]
      }
      // current - prev > 1
      else if (current - prev !== 1 && prev !== undefined && j !== 0) {
        sets[i][count][1] = prev
        count++
        sets[i][count] = [current, undefined]
      }
      // current is last el & current - prev = 1
      else if (j === set.length-1 && current - prev === 1) {
        sets[i][count][1] = current
      }
      prev = current
    }
  }
}
