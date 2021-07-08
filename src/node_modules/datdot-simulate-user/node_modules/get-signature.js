module.exports = get_signature

async function get_signature (feed, index) {
  return new Promise((resolve, reject) => {
    feed.signature(index, (err, res) => {
      if (err) reject(err)
      resolve(res.signature)
    })
  })
}