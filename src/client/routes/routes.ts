import { Router } from 'express';
import { ListModel } from '../../common/ListModel';
import { v4 as uuidv4 } from 'uuid';
import { Dealer, Request } from 'zeromq';
import { AWORStructure } from '../../common/crdt/AWORStructure';

const dealer = new Dealer();
dealer.connect('tcp://localhost:5556');

const currState = {
    internet: true,
    page: undefined as string | undefined
};

function processReply(listModel: ListModel, reply: Buffer[]) {
    if (reply[0].toString() === 'error') {
        console.error('Error: ' + reply[1].toString());
        return;
    } else if (reply[0].toString() === '') {
        reply.shift();
    }

    const id = reply[1].toString();
    const title = reply[2].toString();
    const crdt = AWORStructure.fromString(reply[3].toString());

    return listModel.getList(id).then((list) => {
        list.crdt.join(crdt);
        listModel.saveList(id, title, list.crdt);
    }).catch(() => {
        listModel.saveList(id, title, crdt);
    });
}

async function receiveServer(listModel: ListModel) {
    for await (const reply of dealer) {
        processReply(listModel, reply);
    }
}

setInterval(async () => {
    if (currState.page && currState.internet) {
        console.log("INTERACTOR: Requesting page from the server");
        dealer.send([null, 'get', currState.page]);
    }
}, 2500);

const apiRoutes = (listModel: ListModel) => {
    const router = Router();

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
                dealer.send([null, 'put', req.body.listId, list.title, list.crdt.toString()]);
            }

            res.json(req.body.itemName);
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    router.post('/download', async (req, res) => {
      try {
        if (currState.internet) {
          console.log("INTERACTOR: Downloading list from the server");
          const listId = req.body.listId;

          const request = new Request({receiveTimeout: 1000});
          request.connect('tcp://localhost:5556')

          await request.send(['get', listId])
          await processReply(listModel, await request.receive());

          request.disconnect('tcp://localhost:5556');

          const list = await listModel.getList(listId);
          res.json({ internet: true, id: listId, title: list.title });

        }
        else res.json({internet: false});

        res.status(200).send();
      } catch (err) {
        console.log(err)
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
                dealer.send([null, 'put', listId, list.title, list.crdt.toString()]);
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
                dealer.send([null, 'put', req.body.listId, list.title, list.crdt.toString()]);
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
                dealer.send([null, 'put', req.body.listId, list.title, list.crdt.toString()]);
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
                dealer.send([null, 'put', req.body.listId, list.title, list.crdt.toString()]);
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
                    dealer.send([null, 'put', listId, list.title, list.crdt.toString()]);
                }
            } else {
                console.log("INTERACTOR: Internet OFF");
                currState.internet = false;
            }

            res.json({ internet: currState.internet });
            res.status(200).send();
        } catch (err) {
            res.status(500).send();
        }
    });

    return router;
};

const websiteRoutes = (listModel: ListModel) => {
    const router = Router();
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

export { apiRoutes, websiteRoutes, receiveServer };