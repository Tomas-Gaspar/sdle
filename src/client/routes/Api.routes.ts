import { Router } from 'express';
import { ListModel } from '../../common/ListModel';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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
      res.json({ id: listId, title: req.body.listName, items: [] });
      res.status(200).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  router.post('/item/create', async (req, res) => {
    try {
      await listModel.insertItem(req.body.listId, req.body.itemName, req.body.itemQuantity);
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
      res.json({ name: req.body.itemName, quantity: newQuantity });
      res.status(200).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  return router;
};

export { apiRoutes };