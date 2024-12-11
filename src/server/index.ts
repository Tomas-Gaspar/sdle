import * as zmq from 'zeromq';
import { createHash } from 'crypto';
import { getDatabaseConnection } from '../common/database/init';
import { ListModel } from '../common/ListModel';
import { AWORStructure } from '../common/crdt/AWORStructure';

if (process.argv.length < 3 || isNaN(parseInt(process.argv[2]))) {
    console.error('Usage: node index.js <port>');
    process.exit(1);
}

const db = getDatabaseConnection(parseInt(process.argv[2]));
const listModel = new ListModel(db, process.argv[2]);

let serverConf
    : { 
        num_virtual_nodes: number, 
        num_replicas: number,
        ports: number[] 
    };
const hashesPort: { hash: string, port: number}[] = [];

const socket = new zmq.Request();

// To be used for gossiping
const xpub = new zmq.XPublisher();
const sub = new zmq.Subscriber();

const pubQueue:any[] = [];

const portsSubscribe = new Set<number>();
const hashesSubscribe = new Set<string>();

async function handeRequests() {
    for await (const [header, ...req] of socket) {
        switch (header.toString()) {
            case 'ready':
                serverConf = {
                    num_virtual_nodes: parseInt(req[0].toString()),
                    num_replicas: parseInt(req[1].toString()),
                    ports: req[2].toString().split(',').map(port => parseInt(port))
                };
                serverConf.ports.forEach(port => {
                    for (let i = 0; i < serverConf.num_virtual_nodes; i++) {
                        hashesPort.push({
                            hash: createHash('sha256').update(`${port}:${i}`).digest('hex'),
                            port: port
                        })
                    }
                });
                hashesPort.sort((a, b) => a.hash < b.hash ? -1 : 1);

                for (let i = 0; i < hashesPort.length; i++) {
                    if (hashesPort[i].port === parseInt(process.argv[2])) {
                        // Subscribe to nodes whose replicas this node is responsible for
                        for (let j = 1; j <= serverConf.num_replicas; j++) {
                            let idx = i - j;
                            if (idx < 0) {
                                idx = hashesPort.length + idx;
                            }
                            portsSubscribe.add(hashesPort[idx].port);
                            hashesSubscribe.add(hashesPort[idx].hash);
                        }
                    }
                }

                for (const port of portsSubscribe)
                    sub.connect(`tcp://127.0.0.1:${port}`);
                sub.connect('tcp://127.0.0.1:5554');

                for (const hash of hashesSubscribe)
                    sub.subscribe(hash);
                sub.subscribe('ring_update');

                socket.send(['reply', null]);
                break;
            case 'request':
                processRequest(req);
                break;
            case 'error':
                throw new Error(`Error: ${req[0].toString()}`);
            default:
                break;
        }
    }
}

function processRequest(req: Buffer[]) {
    const client = req[0];

    switch (req[1].toString()) {
        // [ 'request', 'get', 'list_id' ]
        case 'get':
            listModel.getList(req[2].toString()).then(list => {
                socket.send(['reply', client, list.title, list.crdt.toString()]);
            }).catch(err => {
                socket.send(['error', client, err.message]);
            });
            break;
        // [ 'request', 'put', 'list_id', 'list_title', 'list' ]
        case 'put':
            listModel.getList(req[2].toString()).then(list => {
                list.crdt.join(AWORStructure.fromString(req[4].toString()));
                listModel.saveList(req[2].toString(), list.title, list.crdt).then(() => {
                    const hash = createHash('sha256').update(req[2]).digest('hex');
                    if (pubQueue.length === 50)
                        pubQueue.shift();

                    const messageList = [list.title, list.crdt.toString()];
                    const message = [hash, 'update', req[2], ...messageList];
                    pubQueue.push(message);
                    
                    xpub.send(message);
                    socket.send(['reply', client, ...messageList]);
                }).catch(err => {
                    socket.send(['error', client, err.message]);
                });
            }).catch(err => {
                socket.send(['error', client, err.message]);
            });
            break;
        default:
            break;
    }
    
}

async function handlePublisher() {
    for await (const [event] of xpub) {
        // When there is a new subscription send the last messages that were published (max 50)
        if (event[0] === 0x01) {
            console.log(`Replaying last ${pubQueue.length} messages`);
            for (const message of pubQueue) {
                xpub.send(message)
            }
        }
    }
}

async function handleSubscriptions() {
    for await (const [header, ...req] of sub) {
        switch (header.toString()) {
            // [ 'update', 'list_id', 'list_title', 'list' ]
            case 'update':
                listModel.getList(req[1].toString()).then(list => {
                    list.crdt.join(AWORStructure.fromString(req[3].toString()));
                    listModel.saveList(req[1].toString(), list.title, list.crdt);
                });
            case 'ring_update':
                if (req[0].toString() === 'add') {
                    const port = parseInt(req[1].toString());
                    if (port === parseInt(process.argv[2])) {
                        // everything was done in the ready message
                        break;
                    }
                    addServer(port);
                }
                else if (req[0].toString() === 'remove') {
                    const port = parseInt(req[1].toString());
                    removeServer(port);
                }
                break;
            default:
                break;
        }
    }
}

function addServer(port: number) {
    const newHashes = [];
    for (let i = 0; i < serverConf.num_virtual_nodes; i++) {
        newHashes.push({
            hash: createHash('sha256').update(`${port}:${i}`).digest('hex'),
            port: port
        });
    }
    newHashes.sort((a, b) => a.hash < b.hash ? -1 : 1);

    for (let i = 0; i < hashesPort.length && newHashes.length > 0; i++) {
        if (newHashes[0].hash > hashesPort[i].hash) {
            const newHash = newHashes.shift();
            if (newHash) {
                hashesPort.splice(i++, 0, newHash);
                if (!portsSubscribe.has(newHash.port)) {
                    sub.connect(`tcp://127.0.0.1:${newHash.port}`);
                    portsSubscribe.add(newHash.port);
                }
            }

            for (let j = 1; j <= serverConf.num_replicas; j++) {
                const idx = (i + j) % hashesPort.length;

                if (hashesPort[idx].port === parseInt(process.argv[2])) {
                    // Subscribe to the new node
                    sub.subscribe(hashesPort[i].hash);
                    hashesSubscribe.add(hashesPort[i].hash);

                    let replicaIdx = i - j;
                    if (replicaIdx < 0) {
                        replicaIdx = hashesPort.length + replicaIdx;
                    }
                    sub.unsubscribe(hashesPort[replicaIdx].hash);
                    hashesSubscribe.delete(hashesPort[replicaIdx].hash);
                }
            }
        }
    }
}

function removeServer(port: number) {
    if (port === parseInt(process.argv[2])) {
        // Unsubscribe and disconnect from all nodes
        sub.unsubscribe('ring_update');
        for (const hash of hashesSubscribe)
            sub.unsubscribe(hash);

        for (const port of portsSubscribe)
            sub.disconnect(`tcp://127.0.0.1:${port}`);
        sub.disconnect('tcp://127.0.0.1:5554');

        // Clear the sets in case the node is added back
        hashesSubscribe.clear();
        portsSubscribe.clear();

        hashesPort.splice(0, hashesPort.length);

        return;
    }

    const newPorts = new Set<number>();
    const newHashes = new Set<string>();
    const indexes = [];

    for (let i = 0; i < hashesPort.length; i++) {
        if (hashesPort[i].port === parseInt(process.argv[2])) {
            for (let j = 1; j <= serverConf.num_replicas; j++) {
                let idx = i - j;
                if (idx < 0) {
                    idx = hashesPort.length + idx;
                }

                if (hashesPort[idx].port === port) {
                    // Unsubscribe from the removed node
                    sub.unsubscribe(hashesPort[idx].hash);
                    hashesSubscribe.delete(hashesPort[idx].hash);

                    const newReplica = idx === 0 ? hashesPort.length - 1 : idx - 1;
                    newPorts.add(hashesPort[newReplica].port);
                    newHashes.add(hashesPort[newReplica].hash);

                    indexes.push(idx);
                }
            }
        }
    }

    for (const idx of indexes)
        hashesPort.splice(idx, 1);

    for (const port of newPorts)
        sub.connect(`tcp://127.0.0.1:${port}`);

    for (const hash of newHashes)
        sub.subscribe(hash);

    portsSubscribe.delete(port);
    sub.disconnect(`tcp://127.0.0.1:${port}`);
}

async function start() {
    await xpub.bind(`tcp://127.0.0.1:${process.argv[2]}`);
    socket.connect('tcp://127.0.0.1:5555');
    socket.send(['ready', process.argv[2]]);

    await Promise.all([
        handeRequests(),
        handlePublisher(),
        handleSubscriptions()
    ]);
}

async function stop() {
    if (!socket.closed) {
        await socket.send(['disconnect']);
        socket.close()
    }
    if (!xpub.closed) {
        xpub.close();
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
        default:
            console.log(`Unknown command: ${command}`);
            break;
    }
});

start();