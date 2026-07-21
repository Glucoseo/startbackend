import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

// Имитируем базу данных в памяти сервера
const mockBoards = [
  { id: 1, title: "Планы на лето", owner_id: 42 },
  { id: 2, title: "Изучение TypeScript", owner_id: 42 },
  { id: 3, title: "Разработка API", owner_id: 99 }
];

// Главная страница
app.get('/', (req, res) => {
  res.send('Корневой маршрут. Попробуй перейти на /api/boards');
});

// Новый эндпоинт для получения списка всех досок
app.get('/api/boards', (req, res) => {
  // Отправляем массив данных в формате JSON
  res.json(mockBoards);
});

//code writen by myself
app.get('/api/boards/:id', (req, res) => {
  const boardId = Number(req.params.id);
  const currentBoard = mockBoards.find(board => board.id === boardId);
  if (currentBoard) {
      // Если нашли — отдаем эту доску
      res.json(currentBoard);
    } else {
      // Если не нашли — отдаем статус ошибки 404 (Не найдено)
      res.status(404).json({ error: "Доска не найдена, бро!" });
    }
});

// POST запрос на тот же адрес /api/boards
app.post('/api/boards', (req, res) => {
  // Тело запроса (то, что прислал пользователь) лежит в req.body
  const { title, owner_id } = req.body;

  // Проверяем, передал ли пользователь обязательные поля
  if (!title || !owner_id) {
    res.status(400).json({ error: "Не хватает названия доски или ID владельца!" });
    return; // Останавливаем выполнение функции
  }

  // Создаем новый объект доски
  const newBoard = {
    id: mockBoards.length + 1, // Генерируем новый ID на основе длины массива
    title: title,
    owner_id: Number(owner_id)
  };

  // Добавляем новинку в наш массив-"базу данных"
  mockBoards.push(newBoard);

  // Возвращаем созданную доску и статус 201 (Успешно создано)
  res.status(201).json(newBoard);
});

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

// DELETE запрос для удаления доски по ID
app.delete('/api/boards/:id', (req, res) => {
  const boardId = Number(req.params.id);

  // Ищем индекс доски
  const boardIndex = mockBoards.findIndex(b => b.id === boardId);

  if (boardIndex !== -1) {
    // Метод .splice(индекс, сколько_элементов_удалить) вырезает элемент из массива
    const deletedBoard = mockBoards.splice(boardIndex, 1);

    res.json({ message: "Доска успешно удалена!", board: deletedBoard[0] });
  } else {
    res.status(404).json({ error: "Доска с таким ID не найдена!" });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
