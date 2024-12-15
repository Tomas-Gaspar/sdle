# SDLE Assignment

SDLE Assignment of group T7G11.

Group members:

1. Pedro Madureira (up202108866@up.pt)
2. Sofia Pinto (up202108682@up.pt)
3. Tomás Gaspar (up202108828@up.pt)

## How to build and run

First, navigate to the _src_ folder and install the necessary dependencies:
```bash
$ cd src
$ npm install
```

### Running the proxy
The ports used by the proxy are predefined: `5554`, `5555`, and `5556`. 
```bash
$ cd proxy
$ npm start
```

### Running clients
To simulate different clients, different port numbers are used. If you wish to run more than one client, you should specify the port number as an argument. If no port is specified, the default port is 3000.
```bash
$ cd client
$ npm start [port]
```
You can access the client interface by opening a web browser and navigating to [Shopify](http://localhost:3000) (default).

### Running servers
To simulate different servers, different port numbers are used. If you wish to run more than one server, you should specify the port number as an argument.

***Note:*** The ports that belong to the hashring on startup are defined in the [servers.json](src/proxy/servers.json) file. Ports may be added or removed from the hashring by using the commands `add [port]` and `remove [port]` in the proxy terminal.

```bash
$ cd server
$ npm start [port]
```