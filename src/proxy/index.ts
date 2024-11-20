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
const hashes: { hash: string, socket: Buffer | undefined }[] = [];
const availableSocks: Set<Buffer> = new Set();

serverConf.ports.forEach(port => {
    portHashes.set(port, { hashes: [] });
    for (let i = 0; i < serverConf.num_replicas; i++) {
        const hash = {
            hash: createHash('sha256').update(`${port}:${i}`).digest('hex'),
            socket: undefined
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
                            if (h.socket)
                                availableSocks.delete(h.socket);

                            h.socket = sender;
                        }
                    }
                } else {
                    backend.send([sender, null, 'error', 'port not part of hash ring']);
                }

                break;
            case 'reply':
                availableSocks.add(sender);
                
                const client = rest[0];
                if (client.length !== 0)
                    frontend.send([client, null, ...rest.slice(1)]);

                break;
            case 'disconnect':
                availableSocks.delete(sender);
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
                let sent = false;
                for (let j = i + 1; j <= (i + 1) + serverConf.num_replicas; j++) {
                    const socket = hashes[j % hashes.length].socket;
                    if (socket !== undefined && availableSocks.has(socket)) {
                        availableSocks.delete(socket);
                        sent = true;

                        backend.send([socket, null, 'request', sender, ...rest]);
                        break;
                    }
                }

                if (!sent) {
                    // send back error, no available servers
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