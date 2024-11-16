import express from 'express';
import { engine } from 'express-handlebars';
import { getDatabaseConnection } from './database/init';
import { List } from './models/List';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static('public'));

/* DATABASE */
const localDb = getDatabaseConnection();

/* MODELS */
const listModel = new List(localDb);


/* ROUTES */

app.get('/', async (req, res) => {
    const listsIDs = await listModel.getAllListsIDs();
    const lists = await Promise.all(listsIDs.map(id => listModel.getList(id)));
    res.render('home', {lists: lists, img: 'img/woman.png'});
});

app.get('/:id', async (req, res) => {
    const listId = parseInt(req.params.id, 10);
    const list = await listModel.getList(listId);
    res.render('list', { list: list, img: 'img/woman.png' });
  });

app.get('/:id/edit', async (req, res) => {
    const listId = parseInt(req.params.id, 10);
    const list = await listModel.getList(listId);
    res.render('edit', { list: list, img: 'img/woman.png' });
});

/* PORT */

const port = process.argv[2] || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

