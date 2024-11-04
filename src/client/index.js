import express from 'express';
import { engine } from 'express-handlebars';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/', (req, res) => {
    res.render('home');
});

const port = process.argv[2] || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});