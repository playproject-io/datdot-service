module.exports = getRangesCount

function getRangesCount (ranges) {
  let counter = 0
  for (var i = 0, len = ranges.length; i < len; i++) {
    const [min, max] = ranges[i]
    for (var j = min; j < max + 1; j++) {
      counter++
    }
  }
  return counter
}
