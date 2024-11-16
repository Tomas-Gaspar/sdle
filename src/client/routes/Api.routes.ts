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

  router.post('/create', async (req, res) => {
    try {
      await listModel.createList(req.body.listName);
      res.json(req.body.listName);
      res.status(200).send();
    } catch (err) {
      res.status(500).send();
    }
  });

  return router;
};

export { apiRoutes };