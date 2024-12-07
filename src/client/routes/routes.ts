import { Router } from 'express';
import { list, ListModel } from '../../common/ListModel';
import { create } from 'domain';
import { send } from 'process';

const router = Router();

const currState = {
    "internet": true,
    "page": ""
}

let sendDataInterval: NodeJS.Timeout | null;

const sendData = async (action: string, data: any) => {
    const url = "http://localhost:XXXX/api/" + action;
    const response = null;

    switch (action) {
        case "allData":
            break;
        case "removeItem":
            break;
        case "pageData":
            break;
        case "createList":
            break;
        case "createItem":
            break;
        default:
            break;
    }

    return response;
};

const createInterval = (listModel: ListModel) => {
    if (sendDataInterval || !currState.internet) return;

    console.log("INTERACTOR: Creating interval to send data to the server");

    sendDataInterval = setInterval(async () => {
        if (currState.page !== "") {
            await sendData("pageData", listModel.getList(currState.page));
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
        await sendData("removeItem", { listId: req.body.listId, itemName: req.body.itemName });
      }

      res.json(req.body.itemName);
      res.status(200).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  router.post('/create', async (req, res) => {
    try {
      await listModel.saveList(req.body.listId, req.body.listName);

      if (currState.internet) {
        console.log("INTERACTOR: Sending create list to the server");
        await sendData("createList", { listId: req.body.listId, listName: req.body.listName });
      }

      res.json({ id: req.body.listId, title: req.body.listName, items: [] });
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
        await sendData("createItem", { listId: req.body.listId, itemName: req.body.itemName, itemQuantity: req.body.itemQuantity });
      }

      res.json({ name: req.body.itemName, quantity: req.body.itemQuantity });
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
        await sendData("allData", listModel);
        
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
  
        const lists: list[] = await Promise.all(
            listsIDs.map(async ({ id }) => {
                const listCrdt = await listModel.getList(id);
                const l = ListModel.crdtToList(listCrdt.crdt);
                return { id: id, title: listCrdt.title, items: l.items };
            })
        );
  
        res.render('home', { internet: currState.internet, lists: lists, img: 'img/woman.png' });

        console.log("INTERACTOR: Set page to home");
        currState.page = "";
    });
  
    router.get('/:id', async (req, res) => {
        const listId = req.params.id
        const listCrdt = await listModel.getList(listId);
        const l = ListModel.crdtToList(listCrdt.crdt);
  
        res.render('list', { internet: currState.internet, list: {id: listId, title: listCrdt.title, items: l.items}, img: 'img/woman.png' });

        console.log("INTERACTOR: Set page to", listId);
        currState.page = listId;
    });
  
    return router;
  };
  
  export { apiRoutes, websiteRoutes };