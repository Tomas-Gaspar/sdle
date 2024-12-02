import { Router } from 'express';
import { list, ListModel } from '../../common/ListModel';

const router =  Router();

const websiteRoutes = (listModel: ListModel) => {
    router.get('/', async (req, res) => {
        const listsIDs = await listModel.getAllListsIDs();

        Promise.all(
            listsIDs.map(async ({ id }) => {
                const listCrdt = await listModel.getList(id);
                const l = ListModel.crdtToList(listCrdt.crdt);
                return { id: id, title: listCrdt.title, items: l.items };
            })
        ).then((lists) => res.render('home', { lists: lists, img: 'img/woman.png' }))
        .catch(() => res.status(500).send('Error fetching lists'));
    });
  
    router.get('/:id', async (req, res) => {
        const listId = req.params.id
        listModel.getList(listId).then((listCrdt) => {
            const l = ListModel.crdtToList(listCrdt.crdt);

            res.render('list', { list: {id: listId, title: listCrdt.title, items: l.items}, img: 'img/woman.png' });
        }).catch(() => res.status(404).send('List not found'));
    });
  
    return router;
};
  
export { websiteRoutes };
