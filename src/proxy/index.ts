import * as zmq from 'zeromq';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const serverConf
    : { 
        num_virtual_nodes: number, 
        num_replicas: number,
        ports: number[] 
    } = JSON.parse(readFileSync('servers.json', 'utf-8'));

const portHashes: Map<number, { hashes: string[] }> = new Map();
const hashes: { hash: string, socket: Buffer | undefined, replica: number }[] = [];

serverConf.ports.forEach(port => {
    portHashes.set(port, { hashes: [] });
    for (let i = 0; i < serverConf.num_replicas; i++) {
        const hash = {
            hash: createHash('sha256').update(`${port}:${i}`).digest('hex'),
            socket: undefined,
            replica: 0
        };
        hashes.push(hash);
        portHashes.get(port)?.hashes.push(hash.hash);
    }
});
hashes.sort((a, b) => a.hash < b.hash ? -1 : 1);

const frontend = new zmq.Router();
const backend = new zmq.Router();

async function start() {
    await frontend.bind('tcp://127.0.0.1:5556');
    await backend.bind('tcp://127.0.0.1:5555');

    for await (const [sender, _blank, header, ...rest] of backend) {
        switch (header.toString()) {
            case 'ready':
                backend.send([sender, null, 'ready', serverConf.num_virtual_nodes.toString(), serverConf.num_replicas.toString(), serverConf.ports.join(',')]);

                const port = parseInt(rest[0].toString());
                const portInfo = portHashes.get(port);
                if (portInfo) {
                    for (const h of hashes) {
                        if (portInfo.hashes.includes(h.hash)) {
                            h.socket = sender;
                        }
                    }
                } else {
                    backend.send([sender, null, 'error', 'port not part of hash ring']);
                }

                break;
            case 'reply':
                const client = rest[0];
                if (client.length !== 0)
                    frontend.send([client, null, ...rest.slice(1)]);

                break;
            case 'disconnect':
                for (const h of hashes) {
                    if (h.socket === sender) {
                        h.socket = undefined;
                    }
                }
                break;
            default:
                console.error(`unknown header: ${header.toString()} from ${sender.toString("hex")}`);
                break;
        }
    }

    for await (const [sender, _blank, ...rest] of frontend) {
        const hash = createHash('sha256').update(rest[0]).digest('hex');

        for (let i = 0; i < hashes.length; i++) {
            if (hash > hashes[i].hash) {
                let replica = hashes[(i+1) % hashes.length].replica;
                let sent = false;
                for (let j = 0; j < serverConf.num_replicas && !sent; j++) {
                    const socket = hashes[(i + 1 + replica) % hashes.length].socket;
                    replica = (replica + 1) % serverConf.num_replicas;

                    if (socket !== undefined) {
                        hashes[(i+1) % hashes.length].replica = replica;

                        sent = true;
                        backend.send([socket, null, 'request', sender, ...rest]);
                    }
                }

                if (!sent) {
                    frontend.send([sender, null, 'error', 'no servers available']);
                }
                break;
            }
        }
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