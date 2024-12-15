import * as zmq from 'zeromq';
import { readFileSync, writeFile } from 'fs';
import { createHash } from 'crypto';

const serverConf
    : { 
        num_virtual_nodes: number, 
        num_replicas: number,
        ports: number[] 
    } = JSON.parse(readFileSync('servers.json', 'utf-8'));

const portHashes: Map<number, { hashes: string[] }> = new Map();
const hashes: { hash: string, socket: Buffer | undefined, replica: number }[] = [];

const portStandby: { port: number, socket: Buffer }[] = [];

serverConf.ports.forEach(port => {
    portHashes.set(port, { hashes: [] });
    for (let i = 0; i < serverConf.num_virtual_nodes; i++) {
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
const pub = new zmq.Publisher();

async function handleFrontend() {
    for await (const [sender, _blank, ...rest] of frontend) {
        // rest = ['put'/'get', 'list_id', (list)?]
        const hash = createHash('sha256').update(rest[1]).digest('hex');

        for (let i = 0; i < hashes.length; i++) {
            if (hash < hashes[i].hash || i === hashes.length - 1) {
                // If the hash is greater than the last hash, the primary server is the first server
                if (hash >= hashes[i].hash) {
                    i = 0;
                }
                // This is the primary server and replica indicates the replica number that was last used
                let replica = hashes[i].replica;
                let sent = false;
                // Traverse the replicas starting from the last used replica until one that is connected is found
                for (let j = 0; j < serverConf.num_replicas && !sent; j++) {
                    const socket = hashes[(i + replica) % hashes.length].socket;
                    replica = (replica + 1) % serverConf.num_replicas;

                    if (socket !== undefined) {
                        // Store the last used replica number in the primary server
                        hashes[i].replica = replica;

                        sent = true;
                        backend.send([socket, null, 'request', sender, ...rest]);
                    }
                }

                if (!sent) {
                    frontend.send([sender, 'error', 'no servers available']);
                }
                break;
            }
        }
    }
}

async function handleBackend() {
    for await (const [sender, _blank, header, ...rest] of backend) {
        switch (header.toString()) {
            case 'ready':
                const port = parseInt(rest[0].toString());
                const portInfo = portHashes.get(port);
                if (portInfo) {
                    for (const h of hashes) {
                        if (portInfo.hashes.includes(h.hash)) {
                            h.socket = sender;
                        }
                    }
                    backend.send([sender, null, 'ready', serverConf.num_virtual_nodes.toString(), serverConf.num_replicas.toString(), serverConf.ports.join(',')]);
                    console.log(`Server on port ${port} is ready`);
                } else {
                    // port is not part of the hashring, if it is later added, the server will be notified
                    backend.send([sender, null, 'standby']);
                    portStandby.push({ port, socket: sender });
                    console.log(`Server on port ${port} is on standby`);
                }

                break;
            case 'reply':
                const client = rest[0];
                if (client.length !== 0)
                    frontend.send([client, null, 'reply', ...rest.slice(1)]);

                break;
            case 'error':
                const clientError = rest[0];
                if (clientError.length !== 0)
                    frontend.send([clientError, 'error', ...rest.slice(1)]);

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
}

async function start() {
    await frontend.bind('tcp://127.0.0.1:5556');
    await backend.bind('tcp://127.0.0.1:5555');
    await pub.bind('tcp://127.0.0.1:5554');

    setTimeout(() => {
        // Make sure the subscribers have time to connect/reconnect
        pub.send(['proxy_up']);
    }, 500);

    await Promise.all([
        handleFrontend(), 
        handleBackend()
    ]);
}

function addNode(port: number) {
    if (serverConf.ports.includes(port)) {
        console.error('Port is already in the hashring');
        return;
    }

    let socket = undefined;
    let idx = portStandby.findIndex(p => p.port === port);
    if (idx !== -1) {
        socket = portStandby.splice(idx, 1)[0].socket;
    }

    portHashes.set(port, { hashes: [] });
    for (let i = 0; i < serverConf.num_replicas; i++) {
        const hash = {
            hash: createHash('sha256').update(`${port}:${i}`).digest('hex'),
            socket: socket,
            replica: 0
        };
        // insert hash preserving the order
        idx = hashes.findIndex(h => h.hash > hash.hash);
        hashes.splice(idx === -1 ? hashes.length : idx, 0, hash);
        portHashes.get(port)?.hashes.push(hash.hash);
    }

    pub.send(['ring_update', 'add', port.toString()]);

    if (socket) {
        backend.send([socket, null, 'ready', serverConf.num_virtual_nodes.toString(), serverConf.num_replicas.toString(), serverConf.ports.join(',')]);
    }

    serverConf.ports.push(port);
    writeFile('servers.json', JSON.stringify(serverConf, null, 4), (err) => {
        if (err) {
            console.error('Error saving changes to servers.json');
        }
    });
}

function removeNode(port: number) {
    if (!serverConf.ports.includes(port)) {
        console.error('Port is not in the hashring');
        return;
    }

    portHashes.get(port)?.hashes.forEach(hash => {
        const idx = hashes.findIndex(h => h.hash === hash);
        hashes.splice(idx, 1);
    });

    portHashes.delete(port);

    pub.send(['ring_update', 'remove', port.toString()]);

    serverConf.ports.splice(serverConf.ports.indexOf(port), 1);
    writeFile('servers.json', JSON.stringify(serverConf, null, 4), (err) => {
        if (err) {
            console.error('Error saving changes to servers.json');
        }
    });
}

process.stdin.on('data', (data) => {
    const unknownCommand = (command: string[]) => console.log(`Unknown command: ${command.join(' ')}`);

    const command = data.toString().trim().split(' ');

    if (command.length === 0) 
        return;
    else if (command.length === 1) {
        if (command[0] === 'exit') {
            if (!frontend.closed) frontend.close();
            if (!backend.closed) backend.close();

            process.exit(0);
        } else unknownCommand(command);

    }
    else if (command.length === 2) {
        if (command[0] === 'add') {
            const port = parseInt(command[1]);
            if (isNaN(port)) {
                console.log('Invalid port');
                return;
            }
            addNode(port);
        }
        else if (command[0] === 'remove') {
            const port = parseInt(command[1]);
            if (isNaN(port)) {
                console.log('Invalid port');
                return;
            }
            removeNode(port);
        }
        else unknownCommand(command);
    }
    else unknownCommand(command);
});

start();