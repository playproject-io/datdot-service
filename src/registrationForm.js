module.exports = registrationForm

function registrationForm (role, duration) {
  const resource_items = [{
    bandwidth: { speed: { upload: 15, download: 50}, guarantee: 80 }, // bitspersecond, percentage_decimal
    // { upload, download, },
    cpu: 4, // guarantees? availibility?
    // hdd, // guarantees? availibility?
    storage: 100000, // in kilobytes // guarantees? availibility? 1000000000 //1 GB to bytes is 1e+9
    RAM: 3, // guarantees? availibility?
    // net: {
    //   bit: 'bit rate'
    //   cap: 'capacity'
    //   ingress, // download per second
    //   egress,  // upload per second
    //   lag, // (=latency), depends on region
    //   mtbf,  // https://en.wikipedia.org/wiki/Mean_time_between_failures
    //   // RWIN is the TCP Receive Window and RTT is the round-trip time for the path.
    //   // goodput = (max no of pkts recvd by the rx in sequence)*packetsize
    //            // / measurement interval
    //   // departure rate vs. arrival rate
    // },
    // availability: {
    //   uptime,
    //   downtime: '%/'
    // }
    // guarantee: {
    //   // https://en.wikipedia.org/wiki/Total_resolution_time
    //   //
    //   mtbf: {
    //     start: ,
    //     stop: '',
    //   }
    //   // https://en.wikipedia.org/wiki/Mean_time_between_failures
    // }
  }]
  const performance_items = [{ // OPTIONAL
    availability: '', // percentage_decimal
    bandwidth: { /*'speed', 'guarantee'*/ }, // bitspersecond, percentage_decimal
    latency: { /*'lag', 'guarantee'*/ }, // milliseconds, percentage_decimal
  }]
  const region_items = [{ geohash: 'X3F' }]
  const timetable_items = [
    {
      duration :  1200, // milliseconds
      delay    :  200, // milliseconds
      interval :  25000, // milliseconds
      repeat   :  3, // number
    },{
      duration :  void 0, // milliseconds
      delay    :  void 0, // milliseconds
      interval :  void 0, // milliseconds
      repeat   :  void 0, // number
    }
  ]
  const form = {
    duration,
    timetables  : [-1],
    regions      : [-1],
    performances : [-1],
    resources   : [-1],
    // ENCODER cpu => 1 (10%) + 9
    // ATTESTOR bandwidth => 1
    // HOSTER storage, bandwidth => 1
    components: { timetable_items, region_items, performance_items, resource_items },
  }
  return form
}
