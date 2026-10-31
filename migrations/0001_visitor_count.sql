CREATE TABLE visitors (id TEXT PRIMARY KEY NOT NULL) WITHOUT ROWID;
CREATE TABLE visitor_count (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL CHECK (total >= 0));
INSERT INTO visitor_count (id, total) VALUES (1, 0);
CREATE TRIGGER count_new_visitor AFTER INSERT ON visitors BEGIN UPDATE visitor_count SET total = total + 1 WHERE id = 1; END;
