# ringpop-ui

Ringpop UI is a tool to onboard Ringpop instances and inspect various properties about the cluster. This includes membership lists,
percentage of faulty/suspect/healthy nodes, keyspace distribution lookup, and display of historical data such as cluster size history and
the state changes of individual nodes over the past 24 hours.


## Setup
`npm install`

If you are running locally, Ringpop UI listens on port 9000 by default.
`npm run local` 

RUI currently saves topology and membership information to your local redis instance.

Get your instance up and running by installing Redis through Homebrew.
`brew install redis && redis-server'

A background poller is currently in development. It uses Redis as the store to save membership information.
By default, RUI listens for Redis on port 6379.

`npm run config`
This prompts you for information to configure the background poller.

`npm start poller`
Runs the background poller, which will continuously check the cluster it is configured to connect to for state changes.

