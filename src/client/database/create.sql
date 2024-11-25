PRAGMA FOREIGN_KEY = ON;

DROP TABLE IF EXISTS Item;
DROP TABLE IF EXISTS List;

CREATE TABLE List(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(30) NOT NULL
);

CREATE TABLE Item(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(30) NOT NULL,
    quantity INTEGER NOT NULL,
    list_id INTEGER NOT NULL,
    FOREIGN KEY(list_id) REFERENCES List(id)
);

INSERT INTO List(title) VALUES('Grocery List');
INSERT INTO Item(name, quantity, list_id) VALUES('bananas', 5, 1);
INSERT INTO Item(name, quantity, list_id) VALUES('pears', 2, 1);