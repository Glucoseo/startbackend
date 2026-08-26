import express from 'express';
import cors from 'cors'; // <- Добавляем импорт
import { open,Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

const app = express();
const PORT = 3000;
app.use(cors()); // <- Включаем CORS для всех запросов
app.use(express.json());

let db: Database;

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
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      board_id INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `);

  await db.exec('PRAGMA foreign_keys = ON;');

  console.log("База данных SQLite успешно подключена!");
}

initDb();

app.get('/', (req, res) => {
  res.send('Корневой маршрут. Попробуй перейти на /api/boards');
});

app.get('/api/boards', async (req, res) => {
  const currentBoard = await db.all("SELECT * FROM boards");
  res.json(currentBoard);
});

app.get('/api/tasks', async(req, res) => {
  const currentTasks = await db.all("SELECT * FROM tasks")
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

app.get('/api/boards/:id/tasks', async (req, res) => {
  const boardId = Number(req.params.id);

  try {
    // Ждем ответа от базы данных через await
    const tasks = await db.all("SELECT * FROM tasks WHERE board_id = ?", [boardId]);
    if (tasks.length > 0) {
      res.json(tasks);
    } else {
      res.status(404).json({ error: "Задач привязанных к этой доске не найдено!" });
    }
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера при поиске задач" });
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
//POST /api/boards/tasks
app.post('/api/boards/:id/tasks', async (req, res) => {
  // Тело запроса (то, что прислал пользователь) лежит в req.body
  const { title, is_completed } = req.body;
  const boardId = Number(req.params.id);

  // Проверяем, передал ли пользователь обязательные поля
  if (!is_completed || !title) {
    res.status(400).json({ error: "Не хватает статуса задачи или названия!" });
    return; // Останавливаем выполнение функции
  }

  try {
      // Вставляем запись в таблицу.
      // Знаки '?' — это параметризованный запрос (защищает от SQL-инъекций!)
      const result = await db.run(
        'INSERT INTO tasks (title, board_id, is_completed) VALUES (?, ?, ?)',
        [title, Number(boardId), is_completed? 1 : 0]
      );

      // result.lastID возвращает ID только что созданной строки
      res.status(201).json({
        id: result.lastID,
        title,
        owner_id: Number(boardId),
        is_completed: Boolean(is_completed)
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка при создании задачи в БД" });
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

app.patch('/api/tasks/:id', async (req, res) => {
  const { title, is_completed } = req.body;
  const taskId = Number(req.params.id)
  if (title === undefined && is_completed === undefined) {
      res.status(400).json({ error: "Не переданы данные для обновления!" });
      return;
    }
  try {
      const currentTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

      if (!currentTask) {
        res.status(404).json({ error: "Задача не найдена!" });
        return;
      }
    const newTitle = !title ? currentTask.title : title;
    const newIsCompleted = is_completed === undefined ? currentTask.is_completed : is_completed;
    await db.run(
          'UPDATE tasks SET title = ?, is_completed = ? WHERE id = ?',
          [newTitle, newIsCompleted, taskId]
        );

      // result.lastID возвращает ID только что созданной строки
      res.status(201).json({
        id: taskId,
        title: newTitle,
        isCompleted: Boolean(newIsCompleted)
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка при создании задачи в БД" });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const taskId = Number(req.params.id);

  try {
    const taskToDelete = await db.get("SELECT * FROM tasks WHERE id = ?", [taskId]);

    if (!taskToDelete) {
      res.status(404).json({ error: "Задача с таким ID не найдена!" });
      return;
    }

    // 2. Удаляем её из базы данных
    await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);

    // 3. Возвращаем клиенту сообщение и ту самую удаленную доску
    res.status(200).json({
      message: "Задача успешно удалена!",
      deletedTask: taskToDelete
    });

  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении задачи из БД" });
  }
});

app.delete('/api/boards/:id', async (req, res) => {
  const boardId = Number(req.params.id);

  try {
    // 1. Сначала находим доску, которую собираемся удалить, чтобы сохранить её данные
    const boardToDelete = await db.get("SELECT * FROM boards WHERE id = ?", [boardId]);

    if (!boardToDelete) {
      res.status(404).json({ error: "Доска с таким ID не найдена!" });
      return;
    }

    // 2. Удаляем её из базы данных
    await db.run('DELETE FROM boards WHERE id = ?', [boardId]);

    // 3. Возвращаем клиенту сообщение и ту самую удаленную доску
    res.status(200).json({
      message: "Доска успешно удалена!",
      board: boardToDelete
    });

  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении доски из БД" });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
