import * as zmq from 'zeromq';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

let serverConf
    : { 
        num_virtual_nodes: number, 
        num_replicas: number,
        ports: number[] 
    } = JSON.parse(readFileSync('servers.json', 'utf-8'));

// Holds server port : [virtual node hashes]
const regServers: Map<number, string[]> = new Map();

// Holds virtual node hash : zmq server socket identifier
const hashes: { hash: string, socket: Buffer }[] = [];

const frontend = new zmq.Router();
const backend = new zmq.Router();

async function start() {
    await frontend.bind('tcp://127.0.0.1:5556');
    await backend.bind('tcp://127.0.0.1:5555');

    for await (const [sender, _blank, header, ...rest] of backend) {
        switch (header.toString()) {
            case 'ready':
                const port = parseInt(rest[0].toString());
                if (regServers.has(port)) {
                    backend.send([sender, null, 'error', 'server already registered']);
                } else {
                    regServers.set(port, []);
                    for (let i = 0; i < serverConf.num_virtual_nodes; i++) {
                        const hash = createHash('sha256').update(`${port}:${i}`).digest('hex');
                        regServers.get(port)?.push(hash);

                        for (let j = 0; j < hashes.length; j++) {
                            if (hashes[j].hash > hash) {
                                hashes.splice(j, 0, { hash, socket: sender });
                            }
                        }
                    }
                }

                break;
            case 'reply':
                const client = rest[0];
                await frontend.send([client, null, ...rest.slice(1)]);

                // make worker available
                break;
            case 'disconnect':
                // unregister server
                break;
            default:
                console.error(`unknown header: ${header.toString()} from ${sender.toString("hex")}`);
                break;
        }
    }

    for await (const [sender, _blank, ...rest] of frontend) {
        // check hash and where to send request
    }
}

process.stdin.on('data', (data) => {
    const command = data.toString().trim();
    switch (command) {
        case 'exit':
            if (!frontend.closed) frontend.close();
            if (!backend.closed) backend.close();

            process.exit(0);
        
        default:
            console.log(`Unknown command: ${command}`);
            break;
    }
});

start();