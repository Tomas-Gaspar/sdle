import { Router } from 'express';
import { List } from '../models/List';

const router = Router();

const apiRoutes = (listModel: List) => {
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
      await listModel.deleteItem(req.body.itemId);
      res.json(req.body.itemId);
      res.status(200).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  router.post('/create', async (req, res) => {
    try {
      const listId = await listModel.createList(req.body.listName);
      const list = await listModel.getList(listId);
      res.json(list);
      res.status(200).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  router.post('/item/create', async (req, res) => {
    try {
      const itemId = await listModel.insertItem(req.body.listId, req.body.itemName, req.body.itemQuantity);
      const item = await listModel.getItem(itemId);
      res.json(item);
      res.status(200).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  return router;
};

export { apiRoutes };