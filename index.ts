import express from 'express';
import { open } from 'sqlite';
import * as sqlite3 from 'sqlite3';

const app = express();
const PORT = 3000;

app.use(express.json());

let db: any;

async function initDb() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      owner_id INTEGER NOT NULL
    )
  `);

  console.log("База данных SQLite успешно подключена!");
}

initDb();

app.get('/', (req, res) => {
  res.send('Корневой маршрут. Попробуй перейти на /api/boards');
});

app.get('/api/boards', async (req, res) => {
  const currentBoard = await db.get("SELECT * FROM boards");
  res.json(currentBoard);
});

app.get('/api/boards/:id', async (req, res) => {
  const boardId = Number(req.params.id);

  try {
    // Ждем ответа от базы данных через await
    const currentBoard = await db.get("SELECT * FROM boards WHERE id = ?", [boardId]);

    if (currentBoard) {
      res.json(currentBoard);
    } else {
      res.status(404).json({ error: "Доска не найдена, бро!" });
    }
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера при поиске доски" });
  }
});

app.post('/api/boards', async (req, res) => {
  // Тело запроса (то, что прислал пользователь) лежит в req.body
  const { title, owner_id } = req.body;

  // Проверяем, передал ли пользователь обязательные поля
  if (!title || !owner_id) {
    res.status(400).json({ error: "Не хватает названия доски или ID владельца!" });
    return; // Останавливаем выполнение функции
  }

  try {
      // Вставляем запись в таблицу.
      // Знаки '?' — это параметризованный запрос (защищает от SQL-инъекций!)
      const result = await db.run(
        'INSERT INTO boards (title, owner_id) VALUES (?, ?)',
        [title, Number(owner_id)]
      );

      // result.lastID возвращает ID только что созданной строки
      res.status(201).json({
        id: result.lastID,
        title,
        owner_id: Number(owner_id)
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка при создании доски в БД" });
    }
});

app.put('/api/boards/:id', async (req, res) => {
  // Тело запроса (то, что прислал пользователь) лежит в req.body
  const { title } = req.body;
  const boardId = Number(req.params.id)
  // Проверяем, передал ли пользователь обязательные поля
  if (!title) {
    res.status(400).json({ error: "Не хватает названия доски!" });
    return; // Останавливаем выполнение функции
  }

  try {
      // Вставляем запись в таблицу.
      // Знаки '?' — это параметризованный запрос (защищает от SQL-инъекций!)
      const result = await db.run('UPDATE boards SET title = ? WHERE id = ?',[title, boardId]);

      // 2. Execute the statement by passing variables sequentially
      //stmt.run( title ,boardId );
      //const result = db.run(
      //  'INSERT INTO boards (title, owner_id) VALUES (?, ?)',
      //  [title, Number(owner_id)]
      //);
      const ownerResult = await db.get("SELECT owner_id FROM boards WHERE id = ?", [boardId]);
      // result.lastID возвращает ID только что созданной строки
    if (result.changes === 0) {
      res.status(404).json({ error: "Доска с таким ID не найдена!" })
    }
    else {
      res.status(200).json({
        id: boardId,
        title,
        owner_id: Number(ownerResult.owner_id)
      });
    }
    } catch (error) {
      res.status(500).json({ error: "Ошибка при изменении доски в БД" });
  }
});
/*
app.put('/api/boards/:id', (req, res) => {
  const { title } = req.body;
  const boardId = Number(req.params.id)
  if (!title) {
    res.status(400).json({ error: "Не хватает названия доски!" });
    return;
  }

  const board = mockBoards.find(b => b.id === boardId);

  if (board) {
    board.title = title
    res.json({ message: "Доска успешно обновлена!", updatedBoard: board });
  }
  else {
    res.status(404).json({ error: "Доска не найдена, нечего обновлять!" });
  }

});
*/

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
