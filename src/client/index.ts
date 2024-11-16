import express from 'express';
import { engine } from 'express-handlebars';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static('public'));

/* ROUTES */

let lists = [
    {   
        id: '1',
        name: "Mom's House",
        items: ["Item 1", "Item 2", "Item 3"]
    },
    {
        id: '2',
        name: "FEUP CAFFÉ",
        items: ["Item 4", "Item 5", "Item 6"]
    },
    {
        id: '3',
        name: "My Appartment",
        items: ["Item 7", "Item 8", "Item 9"]
    }
]

app.get('/', (req, res) => {
    res.render('home', {lists: [], img: 'img/woman.png'});
});

app.get('/:id', (req, res) => {
    const listId = req.params.id;
    const list = lists.find(item => item.id === listId);
    res.render('list', { list: list, img: 'img/woman.png' });
  });

app.get('/:id/edit', (req, res) => {
    const listId = req.params.id;
    const list = lists.find(item => item.id === listId);
    res.render('edit', { list: list, img: 'img/woman.png' });
});

/* PORT */

const port = process.argv[2] || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});