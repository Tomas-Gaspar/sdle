import { parentPort } from 'worker_threads';
import { ListModel } from './common/ListModel';

parentPort?.on('message', async (message: any) => {
    if (!message.internet) {
        message.needsToSendAll = false;
        parentPort?.postMessage("No internet");
    }
    else if (message.needsToSendAll) {
        message.needsToSendAll = true;
        // Send ALL ListIds to the server and receive the lists (ids + names)
        parentPort?.postMessage("All data updated");
    }
    else if (message.page === "/") {
        // Send ALL ListIds to the server and receive the lists (ids + names)
        parentPort?.postMessage("Home page updated");
    } else {
        // Send a specific listId and corresponding items to the server and receive the list (id + name + items)
        parentPort?.postMessage("List page updated");
    }
});