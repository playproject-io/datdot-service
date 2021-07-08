const sodium = require('sodium-universal')

module.exports = deriveTopicKey

function deriveTopicKey ({ id, senderKey, feedKey, receiverKey }) {
  const topic = id + senderKey + feedKey + receiverKey
  return topic
}