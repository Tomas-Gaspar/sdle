import { Router } from 'express';
import { ListModel } from '../../common/ListModel';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'zeromq';
import { AWORStructure } from '../../common/crdt/AWORStructure';

const router = Router();

const req = new Request();
req.connect('tcp://localhost:5556');

const currState = {
    internet: true,
    page: undefined as string | undefined
};

const apiRoutes = (listModel: ListModel) => {
    router.post('/remove', async (req, res) => {
        try {
            await listModel.deleteList(req.body.listId);
            res.json(req.body.listId);
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    router.post('/item/remove', async (req, res) => {
        try {
            await listModel.deleteItem(req.body.listId, req.body.itemName);

            if (currState.internet) {
                console.log("INTERACTOR: Sending remove item to the server");

                const list = await listModel.getList(req.body.listId);
                requestServer('put', req.body.listId, [list.title, list.crdt.toString()]);
            }

            res.json(req.body.itemName);
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    router.post('/create', async (req, res) => {
        try {
            const listId = uuidv4();
            await listModel.saveList(listId, req.body.listName);

            if (currState.internet) {
                console.log("INTERACTOR: Sending create list to the server");

                const list = await listModel.getList(listId);
                requestServer('put', listId, [list.title, list.crdt.toString()]);
            }

            res.json({ id: listId, title: req.body.listName, items: [] });
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    router.post('/item/create', async (req, res) => {
        try {
            await listModel.insertItem(req.body.listId, req.body.itemName, req.body.itemQuantity);

            if (currState.internet) {
                console.log("INTERACTOR: Sending create item to the server");

                const list = await listModel.getList(req.body.listId);
                requestServer('put', req.body.listId, [list.title, list.crdt.toString()]);
            }

            res.json({ name: req.body.itemName, quantity: req.body.itemQuantity });
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    router.post('/item/increase', async (req, res) => {
        try {
            const newQuantity = await listModel.incItem(req.body.listId, req.body.itemName, 1);
            if (newQuantity <= 0) throw new Error("Invalid quantity");

            if (currState.internet) {
                console.log("INTERACTOR: Sending increase item to the server");

                const list = await listModel.getList(req.body.listId);
                requestServer('put', req.body.listId, [list.title, list.crdt.toString()]);
            }

            res.json({ name: req.body.itemName, quantity: newQuantity });
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    router.post('/item/decrease', async (req, res) => {
        try {
            const newQuantity = await listModel.decItem(req.body.listId, req.body.itemName, 1);
            if (newQuantity < 0) throw new Error("Invalid quantity");

            if (currState.internet) {
                console.log("INTERACTOR: Sending decrease item to the server");

                const list = await listModel.getList(req.body.listId);
                requestServer('put', req.body.listId, [list.title, list.crdt.toString()]);
            }

            res.json({ name: req.body.itemName, quantity: newQuantity });
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    router.post('/internet', async (req, res) => {
        try {
            const internetStatus = req.body["internet"] == "true" ? true : false;

            if (internetStatus) {
                console.log("INTERACTOR: Internet ON");

                currState.internet = true;
                for (const listId of await listModel.getAllListsIDs()) {
                    const list = await listModel.getList(listId);
                    requestServer('put', listId, [list.title, list.crdt.toString()]);
                }

                createInterval();
            } else {
                console.log("INTERACTOR: Internet OFF");

                currState.internet = false;
                killInterval();
            }

            res.json({ internet: currState.internet });
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    async function requestServer(method: string, listId: string, payload?: string[]) {
        if (payload)
            req.send([method, listId, ...payload]);
        else
            req.send([method, listId]);
    
        const localList = await listModel.getList(listId);
    
        req.receive().then(async ([...response]) => {
            const responseStr = response[0].toString();
            if (responseStr === 'error') {
                console.error('Error in the server');
                return;
            }
            
            const title = response[1].toString();
            const crdt = AWORStructure.fromString(response[2].toString());
            localList.crdt.join(crdt);

            await listModel.saveList(listId, title, localList.crdt);
        });
    }
    
    let sendDataInterval: NodeJS.Timeout | null;
    const createInterval = () => {
        if (sendDataInterval || !currState.internet) return;
    
        console.log("INTERACTOR: Creating interval to send data to the server");
    
        sendDataInterval = setInterval(async () => {
            if (currState.page)
                requestServer('get', currState.page);
        }, 5000);
    };
    
    const killInterval = () => {
        console.log("INTERACTOR: Killing interval to send data to the server");
    
        if (sendDataInterval) {
            clearInterval(sendDataInterval);
            sendDataInterval = null;
        }
    };

    return router;
};

const websiteRoutes = (listModel: ListModel) => {
    router.get('/', async (req, res) => {
        const listsIDs = await listModel.getAllListsIDs();

        Promise.all(
            listsIDs.map(async (id) => {
                const listCrdt = await listModel.getList(id);
                const l = ListModel.crdtToList(listCrdt.crdt);
                return { id: id, title: listCrdt.title, items: l.items };
            })
        ).then((lists) => res.render('home', { internet: currState.internet, lists: lists, img: 'img/woman.png' }))
            .catch(() => res.status(500).send('Error fetching lists'));
        currState.page = undefined;
    });

    router.get('/:id', async (req, res) => {
        const listId = req.params.id
        listModel.getList(listId).then((listCrdt) => {
            const l = ListModel.crdtToList(listCrdt.crdt);

            res.render('list', { internet: currState.internet, list: { id: listId, title: listCrdt.title, items: l.items }, img: 'img/woman.png' });
        }).catch(() => res.status(404).send('List not found'));
        currState.page = listId;
    });

    return router;
};

export { apiRoutes, websiteRoutes };