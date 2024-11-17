import * as zmq from 'zeromq';

if (process.argv.length < 3 || isNaN(parseInt(process.argv[2]))) {
    console.error('Usage: node index.js <port>');
    process.exit(1);
}

const socket = new zmq.Request();

async function start() {
    socket.connect('tcp://127.0.0.1:5555');

    await socket.send(['ready', process.argv[2]]);

    for await (const [header, ...req] of socket) {
        switch (header.toString()) {
            case 'error':
                throw new Error(req[0].toString());
            case 'request':
                break;
            default:
                break;
        }
    }
}

async function stop() {
    if (!socket.closed) {
        await socket.send(['disconnect', '"service"'])
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