PRAGMA FOREIGN_KEY = ON;

DROP TABLE IF EXISTS Item;
DROP TABLE IF EXISTS List;

CREATE TABLE List(
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    title VARCHAR(30) NOT NULL,
    context TEXT NOT NULL,
    CHECK (LENGTH(id) = 36 AND id LIKE '________-____-____-____-____________')
);

CREATE TABLE Item(
    name VARCHAR(30) NOT NULL,
    dot TEXT NOT NULL,
    context_pos TEXT NOT NULL,
    context_neg TEXT NOT NULL,
    list_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (name, list_id),
    FOREIGN KEY (list_id) REFERENCES List(id)
);

INSERT INTO List (id, title, context) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 'Groceries', '{A:1}');

INSERT INTO Item (dot, name, context_pos, context_neg, list_id) VALUES 
('A:1', 'Milk', '{A:1}', '{}', '123e4567-e89b-12d3-a456-426614174000'),
('B:2', 'Bread', '{A:2}', '{A:1}', '123e4567-e89b-12d3-a456-426614174000'),
('A:2', 'Eggs', '{B:1}', '{A:2}', '123e4567-e89b-12d3-a456-426614174000');