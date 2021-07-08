module.exports = hypercore_append

async function hypercore_append (feed, data) {
  return new Promise((resolve, reject) => {
    feed.append(data, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}