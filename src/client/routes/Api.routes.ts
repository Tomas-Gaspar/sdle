import { Router } from 'express';
import { ListModel } from '../../common/ListModel';

const router = Router();

const apiRoutes = (listModel: ListModel) => {
  router.post('/remove', async (req, res) => {
    try {
      console.log(req.body.listId);
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
      await listModel.saveList(req.body.listId, req.body.listName);
      res.json({ id: req.body.listId, title: req.body.listName, items: [] });
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

  return router;
};

export { apiRoutes };