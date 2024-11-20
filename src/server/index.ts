import * as zmq from 'zeromq';

if (process.argv.length < 3 || isNaN(parseInt(process.argv[2]))) {
    console.error('Usage: node index.js <port>');
    process.exit(1);
}

let serverConf
    : { 
        num_virtual_nodes: number, 
        num_replicas: number,
        ports: number[] 
    };

const socket = new zmq.Request();

async function start() {
    socket.connect('tcp://127.0.0.1:5555');
    socket.send(['ready', process.argv[2]]);

    for await (const [header, ...req] of socket) {
        switch (header.toString()) {
            case 'ready':
                serverConf = {
                    num_virtual_nodes: parseInt(req[0].toString()),
                    num_replicas: parseInt(req[1].toString()),
                    ports: req[2].toString().split(',').map(port => parseInt(port))
                };
                socket.send(['ready', null]);
                break;
            case 'request':
                processRequest(req);
            case 'error':
                throw new Error(`Error: ${req[0].toString()}`);
            default:
                break;
        }
    }
}

function processRequest(req: Buffer[]) {
    const client = req[0];
    
}

async function stop() {
    if (!socket.closed) {
        await socket.send(['disconnect']);
        socket.close()
    }
}

process.stdin.on('data', (data) => {
    const command = data.toString().trim();
    switch (command) {
        case 'exit':
            stop().then(() => process.exit(0));
            break;

        default:
            console.log(`Unknown command: ${command}`);
            break;
    }
});

start();