module.exports = hypercore_ready

async function hypercore_ready (feed) {
  return new Promise((resolve, reject) => {
    feed.on('ready', () => {
      resolve()
    })
  })
}