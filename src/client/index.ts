import { Worker } from 'worker_threads';
import express from 'express';
import { engine } from 'express-handlebars';
import { getDatabaseConnection } from '../common/database/init';
import { websiteRoutes } from './routes/Website.routes';
import { apiRoutes } from './routes/Api.routes';
import { ListModel } from '../common/ListModel';
import path from 'path';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const port = process.argv[2] || '3000';

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const db = getDatabaseConnection(parseInt(port));
const listModel = new ListModel(db, port);

const currState = {
    "internet": true,
    "needsToSendAll": false,
    "page": "/"
}

function createServerInteractionWorker() {
    const serverInteractionWorker = new Worker('./workers/serverInteraction.js');

    serverInteractionWorker.on('message', (message) => {
        console.log('Server interaction worker message: ', message);
    });

    return serverInteractionWorker;
}


/* ROUTES */
app.use('/', websiteRoutes(listModel, currState));
app.use('/api', apiRoutes(listModel, currState));

const serverInteractionWorker = createServerInteractionWorker();

setInterval(() => {
    serverInteractionWorker.postMessage(currState);
}, 1000);
