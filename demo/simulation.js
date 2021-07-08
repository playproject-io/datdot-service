process.env.DEBUG = '*,-hypercore-protocol'
const spawn = require('cross-spawn')
const path = require('path')

run()

async function run (){
  await new Promise(resolve => setTimeout(resolve, 250))
    
  const [scenarioName, flag] = process.argv.slice(2)
  process.env.REPORT = `*
   +**,-
   +*:*:**@bar#xxx;

   alice:chain
  
   asdf@fooo#x
   asdf@fooo
   asdf#x
   @fooo#x
   asdf
   @fooo
   #x
  `
  
  if (!scenarioName) return console['log'](`
    USAGE:    npm run simulation <scenario-filename>

              (To customise logs,
               edit "demo/simulation.js"
               and change "process.env.REPORT")

    SCENARIOS:
      ./demo/scenarios/1.js
      ./demo/scenarios/2.js
      ./demo/scenarios/foo.js

    EXAMPLE 1
      > npm run simulation 1

    EXAMPLE 2
      > npm run simulation foo.js
  `)

  const scenario = require(`./scenarios/${scenarioName}`)

  const all = [process]
  const url = 'ws://localhost'
  const config = JSON.stringify({ chain: [url, 3399], chat: [url, 6697] })
  
  if (flag === '--production') {
    throw new Error('"--production" is currently unsuported')
    // const command1 = path.join(__dirname, '../datdot-substrate/target/release/datdot-node')
    // const child = spawn(command1, ['--dev'], { stdio: 'inherit' })
    // all.push(child)
  } else {
    const args1 = [path.join(__dirname, '../src/node_modules/datdot-node-javascript/chain.js'), config, /*logkeeper*/9001]
    const chain = spawn('node', args1, { stdio: 'inherit' })
    all.push(chain)
  }
  
  const args2 = [path.join(__dirname, '../src/node_modules/_chat/server.js'), config, /*logkeeper*/ 9002]
  const chatserver = spawn('node', args2, { stdio: 'inherit' })
  all.push(chatserver)
  
  const users = scenario
  const PORTS = [9001, 9002]
  const file = path.join(__dirname, '../src/node_modules/datdot-simulate-user/user.js')
  for (var i = 0, len = users.length; i < len; i++) {
    const scenario = JSON.stringify(users[i])
    const logkeeper_port = 9003 + i
    PORTS.push(logkeeper_port)
    const args = [file, scenario, config, logkeeper_port]
    const child = spawn('node', args, { stdio: 'inherit' })
    all.push(child)
  }
  
  const args3 = [path.join(__dirname, '../src/node_modules/datdot-explorer/datdot-explorer.js'), JSON.stringify(PORTS), 9000]
  const logkeeper = spawn('node', args3, { stdio: 'inherit' })
  all.push(logkeeper)
  
  
  process.on('SIGINT', () => {
    console['log']("\n Terminating all processes")
    const [main, ...processes] = all
    for (var i = 0, len = processes.length; i < len; i++) {
      const child = processes[i]
      child.kill()
    }
    console['log']('done')
    main.exit(0)
  })
}
