# Ringpop-UI
A nice little user interface to quickly consume information about a ringpop instance embedded in your application.
Onboard your application and a known address in Ringpop to make the magic happen.

## Setup
`npm install`

If you're running locally. Ringpop UI listens on port 9000 by default.

`npm run local` 


RUI currently saves topology and membership information to your local redis instance.
Get your instance up and running by installing Redis through Homebrew.

`brew install redis && redis-server'

A background poller is currently in development. It uses redis as the store to save membership information.
By default, RUI listens for redis on port 6379.

This prompts you for a service and coordinating node to onboard to the poller and begin saving
membership information.


`npm run config`

To start the poller


`npm start poller`
