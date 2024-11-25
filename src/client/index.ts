import express from 'express';
import { engine } from 'express-handlebars';
import { getDatabaseConnection } from './database/init';
import { List } from './models/List';
import { websiteRoutes } from './routes/Website.routes';
import { apiRoutes } from './routes/Api.routes';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

/* DATABASE */
const localDb = getDatabaseConnection();

/* MODELS */
const listModel = new List(localDb);


/* ROUTES */
app.use('/', websiteRoutes(listModel));
app.use('/api', apiRoutes(listModel));

/* PORT */

const port = process.argv[2] || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

