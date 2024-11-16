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

async function getAllLists(listModel: List) : Promise<{ id: number, title: string, items: { id: number, name: string, quantity: number }[] }[]> {
    const listsIDs = await listModel.getAllListsIDs();
    const lists = await Promise.all(listsIDs.map(id => listModel.getList(id)));
    return lists;
}

/* ROUTES */

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login', { img: 'img/woman.png' });
  });

app.get('/register', (req, res) => {
    res.render('register', { img: 'img/woman.png' });
});


app.get('/lists', async (req, res) => {
    const lists = await getAllLists(listModel);
    res.render('lists', {lists: lists});
});

/* PORT */

const port = process.argv[2] || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});