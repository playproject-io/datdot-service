# DatDot
a p2p solution for hosting files with Dat protocol ([...more](https://github.com/playproject-io/datdot-substrate/issues/12))

join our [telegram](https://t.me/joinchat/CgTftxXJvp6iYayqDjP7lQ) or [gitter](https://gitter.im/playproject-io/community) chat

![](https://i.imgur.com/oGPIbZQ.jpg)

## Building

Clone
##### `git clone https://github.com/playproject-io/datdot-service.git`

Install dependencies
##### `npm install`


To run the service, you will also need to run the [datdot-substrate](https://github.com/playproject-io/datdot-substrate) chain


Clone

##### `git clone https://github.com/playproject-io/datdot-substrate.git`

Build

##### `cargo build -p datdot-node --release`

## Running
This scenario is part of our first milestone (Phase 1). To run it together with the chain, use:

##### `node cli.js`

To re-run the scenario, you will need to each time purge the chain storage using `./target/release/datdot-node purge-chain --dev`.

If you want, you can also run the chain and the service as independent processes:

Service

##### `DEBUG=*,-hypercore-protocol node lab/scenarios/mvp-1.js`

Chain

##### `./target/release/datdot-node --dev`


## License

MIT
