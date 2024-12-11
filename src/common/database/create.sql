PRAGMA FOREIGN_KEYS = ON;

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
    FOREIGN KEY (list_id) REFERENCES List(id) ON DELETE CASCADE
);

INSERT INTO List (id, title, context) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 'Groceries', '{A:1}');

INSERT INTO Item (dot, name, context_pos, context_neg, list_id) VALUES 
('A:1', 'Milk', '', '', '123e4567-e89b-12d3-a456-426614174000'),
('B:2', 'Bread', '', '', '123e4567-e89b-12d3-a456-426614174000'),
('A:2', 'Eggs', '', '', '123e4567-e89b-12d3-a456-426614174000');