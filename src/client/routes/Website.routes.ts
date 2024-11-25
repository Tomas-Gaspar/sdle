import { Router } from 'express';
import { List } from '../models/List';

const router = Router();

const websiteRoutes = (listModel: List) => {
    router.get('/', async (req, res) => {
        const listsIDs = await listModel.getAllListsIDs();
        const lists: any = await Promise.all(listsIDs.map((id: any) => listModel.getList(id)));

        res.render('home', { lists: lists, img: 'img/woman.png' });
    });
  
    router.get('/:id', async (req, res) => {
        const listId = parseInt(req.params.id, 10);
        const list = await listModel.getList(listId);

        res.render('list', { list: list, img: 'img/woman.png' });
    });
  
    router.get('/:id/edit', async (req, res) => {
        const listId = parseInt(req.params.id, 10);
        const list = await listModel.getList(listId);
        
        res.render('edit', { list: list, img: '../img/woman.png' });
    });
  
    return router;
};
  
export { websiteRoutes };
