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
  const { title } = req.body;
  const boardId = Number(req.params.id);

  if (!title) {
    res.status(400).json({ error: "Не хватает названия доски!" });
    return;
  }

  try {
    const result = await db.run(
      'UPDATE boards SET title = ? WHERE id = ?',
      [title, boardId]
    );

    // 1. Сначала проверяем, изменилось ли что-то
    if (result.changes === 0) {
      res.status(404).json({ error: "Доска с таким ID не найдена!" });
      return;
    }

    // 2. Если доска существует, достаем её из БД для красивого ответа
    const updatedBoard = await db.get("SELECT * FROM boards WHERE id = ?", [boardId]);

    // 3. Отдаем статус 200 и обновленный объект
    res.status(200).json({
      message: "Доска успешно обновлена!",
      board: updatedBoard
    });

  } catch (error) {
    res.status(500).json({ error: "Ошибка при изменении доски в БД" });
  }
});

// DELETE запрос для удаления доски по ID
app.delete('/api/boards/:id', async (req, res) => {
  const boardId = Number(req.params.id);

  // Ищем индекс доски
  // const boardIndex = mockBoards.findIndex(b => b.id === boardId);

  if (boardIndex !== -1) {
    // Метод .splice(индекс, сколько_элементов_удалить) вырезает элемент из массива
    const deletedBoard = mockBoards.splice(boardIndex, 1);

    res.json({ message: "Доска успешно удалена!", board: deletedBoard[0] });
  } else {
    res.status(404).json({ error: "Доска с таким ID не найдена!" });
  }
});

app.put('/api/boards/:id', async (req, res) => {
  const boardId = Number(req.params.id);

  try {
    const result = await db.run('DELETE FROM boards WHERE id = ?', [boardId])

    // 1. Сначала проверяем, изменилось ли что-то
    if (result.changes === 0) {
      res.status(404).json({ error: "Доска с таким ID не найдена!" });
      return;
    }

    // 2. Если доска существует, достаем её из БД для красивого ответа
    const deletedBoard = await db.get("SELECT * FROM boards");

    // 3. Отдаем статус 200 и обновленный объект
    res.status(200).json({
      message: "Доска успешно обновлена!",
      board: deletedBoard
    });

  } catch (error) {
    res.status(500).json({ error: "Ошибка при изменении доски в БД" });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
