const dateLabel = document.querySelector("#dateLabel");
const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const taskList = document.querySelector("#taskList");
const note = document.querySelector("#note");
const timer = document.querySelector("#timer");
const startTimer = document.querySelector("#startTimer");
const resetTimer = document.querySelector("#resetTimer");

const TASKS_KEY = "focus-board-tasks";
const NOTE_KEY = "focus-board-note";
const DEFAULT_SECONDS = 25 * 60;

let secondsLeft = DEFAULT_SECONDS;
let intervalId = null;

const today = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric"
}).format(new Date());

dateLabel.textContent = today;
note.value = localStorage.getItem(NOTE_KEY) || "";

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  const tasks = loadTasks();
  taskList.innerHTML = "";

  for (const task of tasks) {
    const item = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTasks(tasks);
      renderTasks();
    });

    const label = document.createElement("span");
    label.textContent = task.text;
    if (task.done) label.classList.add("done");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      saveTasks(tasks.filter((entry) => entry.id !== task.id));
      renderTasks();
    });

    item.append(checkbox, label, remove);
    taskList.append(item);
  }
}

function updateTimer() {
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  timer.textContent = `${minutes}:${seconds}`;
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  const tasks = loadTasks();
  tasks.push({ id: crypto.randomUUID(), text, done: false });
  saveTasks(tasks);
  taskInput.value = "";
  renderTasks();
});

note.addEventListener("input", () => {
  localStorage.setItem(NOTE_KEY, note.value);
});

startTimer.addEventListener("click", () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    startTimer.textContent = "Start";
    return;
  }

  startTimer.textContent = "Pause";
  intervalId = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    updateTimer();

    if (secondsLeft === 0) {
      clearInterval(intervalId);
      intervalId = null;
      startTimer.textContent = "Start";
    }
  }, 1000);
});

resetTimer.addEventListener("click", () => {
  clearInterval(intervalId);
  intervalId = null;
  secondsLeft = DEFAULT_SECONDS;
  startTimer.textContent = "Start";
  updateTimer();
});

renderTasks();
updateTimer();
