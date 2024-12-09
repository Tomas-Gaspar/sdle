import { Router } from 'express';
import { list, ListModel } from '../../common/ListModel';
import { AWORStructure, AWORVal } from '../../common/crdt/AWORStructure';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const currState = {
    "internet": true,
    "page": ""
}

let sendDataInterval: NodeJS.Timeout | null;

const sendData = async (id: String, crdt: AWORStructure<AWORVal>) => {
    const url = "http://localhost:XXXX/api/" + id;
    const response = null;

    return crdt;
};

const receiveData = async (id: string) => {
    const url = "http://localhost:XXXX/api/" + id;
    const response = null;
    const crdt = new AWORStructure<AWORVal>(id);

    return crdt;
}

const createInterval = (listModel: ListModel) => {
    if (sendDataInterval || !currState.internet) return;

    console.log("INTERACTOR: Creating interval to send data to the server");

    sendDataInterval = setInterval(async () => {
      if (currState.page !== "") {
        const receivedCrdt = await receiveData(currState.page);
        const title = (await listModel.getList(currState.page)).title;
        // listModel.saveList(currState.page, title, receivedCrdt);

        console.log("Sending data of page", currState.page);
      }
    }
    , 5000);
};

const killInterval = () => {
    console.log("INTERACTOR: Killing interval to send data to the server");

    if (sendDataInterval) {
        clearInterval(sendDataInterval);
        sendDataInterval = null;
    }
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
            const crdt = list.crdt;
            const newCrdt = await sendData(req.body.listId, crdt);
            // listModel.saveList(req.body.listId, list.title, newCrdt);
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

          const listId = req.body.listId;
          const crdt = await receiveData(listId);

          /* console.log("INTERACTOR: Sending create list to the server");
  
          const list = await listModel.getList(listId);
          const crdt = list.crdt;
          const newCrdt = await sendData(listId, crdt); */
          // listModel.saveList(listId, list.title, newCrdt);

          res.json({ internet: true, id: listId, title: '' });

        }
        else res.json({internet: false});

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
            const crdt = list.crdt;
            const newCrdt = await sendData(listId, crdt);
            // listModel.saveList(listId, list.title, newCrdt);
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
            const crdt = list.crdt;
            const newCrdt = await sendData(req.body.listId, crdt);
            // listModel.saveList(req.body.listId, list.title, newCrdt);
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
            const crdt = list.crdt;
            const newCrdt = await sendData(req.body.listId, crdt);
            // listModel.saveList(req.body.listId, list.title, newCrdt);
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
            const crdt = list.crdt;
            const newCrdt = await sendData(req.body.listId, crdt);
            // listModel.saveList(req.body.listId, list.title, newCrdt);
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
              const crdt = list.crdt;
              const newCrdt = await sendData(listId, crdt);
              // await listModel.saveList(listId, list.title, newCrdt);
            }
            
            createInterval(listModel);
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
        currState.page = "";
    });
  
    router.get('/:id', async (req, res) => {
        const listId = req.params.id
        listModel.getList(listId).then((listCrdt) => {
            const l = ListModel.crdtToList(listCrdt.crdt);

            res.render('list', { internet: currState.internet, list: {id: listId, title: listCrdt.title, items: l.items}, img: 'img/woman.png' });
        }).catch(() => res.status(404).send('List not found'));
        currState.page = listId;
    });
  
    return router;
};

export { apiRoutes, websiteRoutes };