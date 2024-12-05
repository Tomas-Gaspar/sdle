import { Router } from 'express';
import { list, ListModel } from '../../common/ListModel';

const router =  Router();

type state = {
    "internet": boolean,
    "needsToSendAll": boolean,
    "page": string
}

const websiteRoutes = (listModel: ListModel, currState: state) => {
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
        currState.page = "/";
    });
  
    router.get('/:id', async (req, res) => {
        const listId = req.params.id
        const listCrdt = await listModel.getList(listId);
        const l = ListModel.crdtToList(listCrdt.crdt);

        res.render('list', { internet: currState.internet, list: {id: listId, title: listCrdt.title, items: l.items}, img: 'img/woman.png' });
        currState.page = listId;
    });
  
    return router;
};
  
export { websiteRoutes };
