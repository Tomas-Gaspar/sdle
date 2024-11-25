import { getDatabaseConnection } from './database/init';
import { List } from './models/List';

const localDb = getDatabaseConnection();

/* MODELS */
const listModel = new List(localDb);

async function printAllLists(listModel: List) : Promise<void> {
    const listsIDs = await listModel.getAllListsIDs();
    const lists = await Promise.all(listsIDs.map(id => listModel.getList(id)));
    console.log(lists);
}


printAllLists(listModel);
