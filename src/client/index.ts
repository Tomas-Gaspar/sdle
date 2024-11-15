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
        id: 1,
        name: "Mom's House",
        items: ["Item 1", "Item 2", "Item 3"]
    },
    {
        id: 2,
        name: "FEUP CAFFÉ",
        items: ["Item 4", "Item 5", "Item 6"]
    },
    {
        id: 3,
        name: "My Appartment",
        items: ["Item 7", "Item 8", "Item 9"]
    }
]

app.get('/', (req, res) => {
    res.render('home', {lists: lists, img: 'img/woman.png'});
});

app.get('/login', (req, res) => {
    res.render('login', { img: 'img/woman.png' });
  });

app.get('/register', (req, res) => {
    res.render('register', { img: 'img/woman.png' });
});

/* PORT */

const port = process.argv[2] || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});