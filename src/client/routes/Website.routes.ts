import { Router } from 'express';
import { list, ListModel } from '../../common/ListModel';

const router =  Router();

const websiteRoutes = (listModel: ListModel) => {
    router.get('/', async (req, res) => {
        const listsIDs = await listModel.getAllListsIDs();

        const lists: list[] = await Promise.all(
            listsIDs.map(async (id) => {
                const listCrdt = await listModel.getList(id);
                const l = ListModel.crdtToList(listCrdt.crdt);
                return { id: id, title: listCrdt.title, items: l.items };
            })
        );

        res.render('home', { lists: lists, img: 'img/woman.png' });
    });
  
    router.get('/:id', async (req, res) => {
        const listId = req.params.id
        const listCrdt = await listModel.getList(listId);
        const l = ListModel.crdtToList(listCrdt.crdt);

        res.render('list', { list: {id: listId, title: listCrdt.title, items: l.items}, img: 'img/woman.png' });
    });
  
    return router;
};
  
export { websiteRoutes };
