const zlib = require('zlib')
const EncoderDecoder = {
  encode: (data) => new Promise((resolve, reject) => {
    // @TODO refine options
    const deflater = new zlib.BrotliCompress({
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY
      }
    })
    deflater.end(data)
    deflater.on('data', encoded => resolve(encoded))
  }),

  decode: (encoded) => new Promise((resolve, reject) => {
    // @TODO refine options
    const inflater = new zlib.BrotliDecompress()
    inflater.end(encoded)
    inflater.on('data', decoded => resolve(decoded))
  })
}

module.exports = EncoderDecoder
