import * as zmq from 'zeromq';
import { createHash } from 'crypto';

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
const hashesPort: { hash: string, port: number}[] = [];

const socket = new zmq.Request();

// To be used for gossiping
const pub = new zmq.Publisher();
const sub = new zmq.Subscriber();

async function handleProxy() {
    for await (const [header, ...req] of socket) {
        switch (header.toString()) {
            case 'ready':
                serverConf = {
                    num_virtual_nodes: parseInt(req[0].toString()),
                    num_replicas: parseInt(req[1].toString()),
                    ports: req[2].toString().split(',').map(port => parseInt(port))
                };
                serverConf.ports.forEach(port => {
                    for (let i = 0; i < serverConf.num_replicas; i++) {
                        hashesPort.push({
                            hash: createHash('sha256').update(`${port}:${i}`).digest('hex'),
                            port: port
                        })
                    }
                });
                hashesPort.sort((a, b) => a.hash < b.hash ? -1 : 1);

                const subscribe = new Set<number>();
                for (let i = 0; i < hashesPort.length; i++) {
                    if (hashesPort[i].port === parseInt(process.argv[2])) {
                        for (let j = 1; j <= serverConf.num_replicas; j++) {
                            let idx = i - j;
                            if (idx < 0) {
                                idx = hashesPort.length + idx;
                            }
                            subscribe.add(hashesPort[idx].port);
                        }
                    }
                }

                for (const port of subscribe)
                    sub.connect(`tcp://127.0.0.1:${port}`);

                sub.subscribe();

                socket.send(['reply', null]);
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

async function handleGossip() {
    for await (const [...req] of sub) {
        console.log(req.map(r => r.toString()));
    }
}

async function start() {
    await pub.bind(`tcp://127.0.0.1:${process.argv[2]}`);
    socket.connect('tcp://127.0.0.1:5555');
    socket.send(['ready', process.argv[2]]);

    await Promise.all([
        handleProxy(),
        handleGossip()
    ]);
}

async function stop() {
    if (!socket.closed) {
        await socket.send(['disconnect']);
        socket.close()
    }
    if (!pub.closed) {
        pub.close();
    }
    if (!sub.closed) {
        sub.close();
    }
}

process.stdin.on('data', (data) => {
    const command = data.toString().trim();
    switch (command) {
        case 'exit':
            stop().then(() => process.exit(0));
            break;
        case 'send':
            pub.send(['abc', 'boas']);
            break;
        default:
            console.log(`Unknown command: ${command}`);
            break;
    }
});

start();