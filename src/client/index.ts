import express from 'express';
import { engine } from 'express-handlebars';
import { getDatabaseConnection } from '../common/database/init';
import { apiRoutes, websiteRoutes } from './routes/routes';
import { ListModel } from '../common/ListModel';
import Handlebars from 'handlebars';
import fs from 'fs';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const port = process.argv[2] || '3000';

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const db = getDatabaseConnection(parseInt(port));
const listModel = new ListModel(db, port);

Handlebars.registerHelper('includeSvg', function (filePath: string) {
    try {
      return new Handlebars.SafeString(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      return 'X';
    }
});

/* ROUTES */
app.use('/', websiteRoutes(listModel));
app.use('/api', apiRoutes(listModel));
