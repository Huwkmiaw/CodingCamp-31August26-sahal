/* Personal Dashboard To-Do — app logic (100% Vanilla JS) */

// ============================================================
// Storage Module
// Abstraksi tunggal di atas localStorage.
// ============================================================
const Storage = (() => {
  const PREFIX = 'pdt_'; // personal-dashboard-todo

  // Feature detection: coba setItem/removeItem dalam try-catch
  const available = (() => {
    try {
      const testKey = PREFIX + '__test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function get(key, defaultValue) {
    if (!available) return defaultValue;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      try { localStorage.removeItem(PREFIX + key); } catch (_) {}
      return defaultValue;
    }
  }

  function set(key, value) {
    if (!available) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage quota exceeded for key:', PREFIX + key);
    }
  }

  function remove(key) {
    if (!available) return;
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {}
  }

  function isAvailable() {
    return available;
  }

  return { get, set, remove, isAvailable };
})();

// ============================================================
// ThemeController Module
// Mengelola toggle light/dark mode menggunakan CSS custom properties.
// Bebas emoji — menggunakan SVG stroke icon dan aria-label.
// ============================================================
const ThemeController = (() => {
  const STORAGE_KEY = 'theme';
  const TOGGLE_BTN_ID = 'theme-toggle';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById(TOGGLE_BTN_ID);
    if (btn) {
      btn.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'
      );
    }
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Storage.set(STORAGE_KEY, next);
  }

  function init() {
    const currentTheme =
      document.documentElement.getAttribute('data-theme') ||
      Storage.get(STORAGE_KEY, 'light');

    applyTheme(currentTheme);

    const btn = document.getElementById(TOGGLE_BTN_ID);
    if (btn) {
      btn.addEventListener('click', toggle);
    }
  }

  return { init, toggle };
})();

// ============================================================
// GreetingWidget Module
// Menampilkan jam, tanggal, dan sapaan personal minimalis.
// ============================================================
const GreetingWidget = (() => {
  const CLOCK_ID  = 'clock';
  const DATE_ID   = 'date-display';
  const GREET_ID  = 'greeting-display';
  const NAME_KEY  = 'customName';

  const HARI  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  let currentName = '';
  let lastHour    = -1;

  function getGreetingText(hour) {
    if (hour >= 5  && hour <= 11) return 'Selamat Pagi';
    if (hour >= 12 && hour <= 14) return 'Selamat Siang';
    if (hour >= 15 && hour <= 17) return 'Selamat Sore';
    return 'Selamat Malam';
  }

  function formatDate(date) {
    const hari   = HARI[date.getDay()];
    const tgl    = date.getDate();
    const bulan  = BULAN[date.getMonth()];
    const tahun  = date.getFullYear();
    return `${hari}, ${tgl} ${bulan} ${tahun}`;
  }

  function truncateName(name) {
    if (name.length <= 50) return name;
    return name.slice(0, 50) + '\u2026';
  }

  function renderGreeting(greetingText, name) {
    const el = document.getElementById(GREET_ID);
    if (!el) return;
    const trimmed = name ? name.trim() : '';
    if (trimmed) {
      el.textContent = `${greetingText}, ${truncateName(trimmed)}.`;
    } else {
      el.textContent = `${greetingText}.`;
    }
  }

  function tick() {
    const now  = new Date();
    const hour = now.getHours();
    const mins = now.getMinutes();

    const clockEl = document.getElementById(CLOCK_ID);
    if (clockEl) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(mins).padStart(2, '0');
      clockEl.textContent = `${hh}:${mm}`;
    }

    const dateEl = document.getElementById(DATE_ID);
    if (dateEl) {
      dateEl.textContent = formatDate(now);
    }

    if (hour !== lastHour) {
      lastHour = hour;
      renderGreeting(getGreetingText(hour), currentName);
    }
  }

  function startClock() {
    tick();
    setInterval(tick, 1000);
  }

  function init() {
    currentName = Storage.get(NAME_KEY, '');
    startClock();

    document.addEventListener('nameUpdated', function (e) {
      currentName = e.detail || '';
      renderGreeting(getGreetingText(new Date().getHours()), currentName);
    });

    // Tombol ubah nama di samping salam
    const editNameBtn = document.getElementById('btn-edit-name');
    if (editNameBtn) {
      editNameBtn.addEventListener('click', function () {
        WelcomeModalController.open();
      });
    }
  }

  return { init, getGreetingText, formatDate, truncateName };
})();

// ============================================================
// NameSettingController Module
// Mengelola input nama di header dan penyimpanan nama kustom.
// ============================================================
const NameSettingController = (() => {
  const NAME_KEY    = 'customName';
  const INPUT_ID    = 'name-input';
  const SAVE_BTN_ID = 'name-save-btn';
  const ERROR_ID    = 'name-error';

  function validateName(value) {
    const trimmed = value ? value.trim() : '';
    if (!trimmed) {
      return { valid: false, error: 'Nama tidak boleh kosong' };
    }
    if (trimmed.length > 50) {
      return { valid: false, error: 'Nama maksimal 50 karakter' };
    }
    return { valid: true };
  }

  function showError(message) {
    const el = document.getElementById(ERROR_ID);
    if (el) el.textContent = message;
  }

  function clearError() {
    const el = document.getElementById(ERROR_ID);
    if (el) el.textContent = '';
  }

  function handleSave(inputValue) {
    clearError();

    const result = validateName(inputValue);
    if (!result.valid) {
      showError(result.error);
      return false;
    }

    const trimmedName = inputValue.trim();
    Storage.set(NAME_KEY, trimmedName);

    const inputEl = document.getElementById(INPUT_ID);
    if (inputEl) {
      inputEl.value = trimmedName;
    }

    document.dispatchEvent(new CustomEvent('nameUpdated', { detail: trimmedName }));
    return true;
  }

  function init() {
    const inputEl  = document.getElementById(INPUT_ID);
    const saveBtn  = document.getElementById(SAVE_BTN_ID);

    const savedName = Storage.get(NAME_KEY, '');
    if (inputEl && savedName) {
      inputEl.value = savedName;
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        const value = inputEl ? inputEl.value : '';
        handleSave(value);
      });
    }

    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          handleSave(inputEl.value);
        }
      });

      inputEl.addEventListener('input', function () {
        clearError();
      });
    }
  }

  return { init, validateName, handleSave, showError, clearError };
})();

// ============================================================
// WelcomeModalController Module
// Modal dialog selamat datang minimalis saat user membuka dashboard.
// ============================================================
const WelcomeModalController = (() => {
  const MODAL_ID     = 'welcome-modal';
  const INPUT_ID     = 'welcome-name-input';
  const ERROR_ID     = 'welcome-name-error';
  const SUBMIT_BTN_ID= 'welcome-submit-btn';
  const SKIP_BTN_ID  = 'welcome-skip-btn';
  const DISMISSED_KEY= 'welcomeDismissed';

  function open() {
    const modal = document.getElementById(MODAL_ID);
    const input = document.getElementById(INPUT_ID);
    const error = document.getElementById(ERROR_ID);

    if (error) error.textContent = '';
    if (input) {
      input.value = Storage.get('customName', '');
    }

    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => { if (input) input.focus(); }, 50);
    }
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.add('hidden');
    }
    Storage.set(DISMISSED_KEY, true);
  }

  function handleSubmit() {
    const input = document.getElementById(INPUT_ID);
    const error = document.getElementById(ERROR_ID);
    const val   = input ? input.value : '';

    const validation = NameSettingController.validateName(val);
    if (!validation.valid) {
      if (error) error.textContent = validation.error;
      return;
    }

    const saved = NameSettingController.handleSave(val);
    if (saved) {
      close();
    }
  }

  function init() {
    const submitBtn = document.getElementById(SUBMIT_BTN_ID);
    const skipBtn   = document.getElementById(SKIP_BTN_ID);
    const input     = document.getElementById(INPUT_ID);

    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', close);
    }

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') close();
      });
      input.addEventListener('input', function () {
        const error = document.getElementById(ERROR_ID);
        if (error) error.textContent = '';
      });
    }

    // Tampilkan saat pertama kali jika belum ada nama tersimpan
    const savedName = Storage.get('customName', '');
    const dismissed = Storage.get(DISMISSED_KEY, false);
    if (!savedName && !dismissed) {
      open();
    }
  }

  return { init, open, close };
})();

// ============================================================
// TimerModule (with Custom Timer Support)
// Mendukung countdown fleksibel: preset 15/25/45/60m & kustom menit.
// ============================================================
const TimerModule = (() => {
  const DISPLAY_ID       = 'timer-display';
  const START_BTN_ID     = 'timer-start';
  const STOP_BTN_ID      = 'timer-stop';
  const RESET_BTN_ID     = 'timer-reset';
  const COMPLETE_ID      = 'timer-complete-msg';
  const BADGE_ID         = 'timer-status-badge';
  const CUSTOM_INPUT_ID  = 'custom-timer-minutes';
  const CUSTOM_APPLY_ID  = 'custom-timer-apply';
  const CUSTOM_ERROR_ID  = 'custom-timer-error';
  const WIDGET_CLASS     = 'widget--timer';

  let currentDurationSeconds = 1500; // default 25 menit
  let secondsLeft = 1500;
  let intervalId  = null;
  let running     = false;

  function formatTime(seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function setStatusBadge(text) {
    const badge = document.getElementById(BADGE_ID);
    if (badge) badge.textContent = text;
  }

  function render() {
    const el = document.getElementById(DISPLAY_ID);
    if (el) {
      el.textContent = formatTime(secondsLeft);
    }
  }

  function updateButtonStates(isRunning) {
    const startBtn = document.getElementById(START_BTN_ID);
    const stopBtn  = document.getElementById(STOP_BTN_ID);

    if (startBtn) startBtn.disabled = isRunning;
    if (stopBtn)  stopBtn.disabled  = !isRunning;
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
    running    = false;
    updateButtonStates(false);
    if (secondsLeft > 0) {
      setStatusBadge('Jeda');
    }
  }

  function tick() {
    secondsLeft -= 1;
    render();
    if (secondsLeft === 0) {
      onComplete();
    }
  }

  function start() {
    if (running || secondsLeft <= 0) return;
    intervalId = setInterval(tick, 1000);
    running    = true;
    updateButtonStates(true);
    setStatusBadge('Fokus');

    const msgEl = document.getElementById(COMPLETE_ID);
    if (msgEl) msgEl.classList.add('hidden');

    const section = document.querySelector('.' + WIDGET_CLASS);
    if (section) section.classList.remove('timer--completed');
  }

  function reset() {
    stop();
    secondsLeft = currentDurationSeconds;
    render();
    setStatusBadge('Siap');

    const msgEl = document.getElementById(COMPLETE_ID);
    if (msgEl) msgEl.classList.add('hidden');

    const section = document.querySelector('.' + WIDGET_CLASS);
    if (section) section.classList.remove('timer--completed');
  }

  function onComplete() {
    stop();
    setStatusBadge('Selesai');

    const section = document.querySelector('.' + WIDGET_CLASS);
    if (section) section.classList.add('timer--completed');

    const msgEl = document.getElementById(COMPLETE_ID);
    if (msgEl) {
      msgEl.classList.remove('hidden');
    }
  }

  /**
   * Mengatur durasi timer dalam menit
   * @param {number} minutes
   */
  function setDuration(minutes) {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 180) {
      return false;
    }

    stop();
    currentDurationSeconds = mins * 60;
    secondsLeft = currentDurationSeconds;
    render();
    setStatusBadge('Siap');

    // Update active preset button jika cocok
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      const btnMin = parseInt(btn.dataset.minutes, 10);
      if (btnMin === mins) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const msgEl = document.getElementById(COMPLETE_ID);
    if (msgEl) msgEl.classList.add('hidden');

    const section = document.querySelector('.' + WIDGET_CLASS);
    if (section) section.classList.remove('timer--completed');

    return true;
  }

  function init() {
    render();
    updateButtonStates(false);
    setStatusBadge('Siap');

    const startBtn = document.getElementById(START_BTN_ID);
    const stopBtn  = document.getElementById(STOP_BTN_ID);
    const resetBtn = document.getElementById(RESET_BTN_ID);

    if (startBtn) startBtn.addEventListener('click', start);
    if (stopBtn)  stopBtn.addEventListener('click', stop);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    // Preset buttons (15m, 25m, 45m, 60m)
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const mins = parseInt(this.dataset.minutes, 10);
        setDuration(mins);
        const errEl = document.getElementById(CUSTOM_ERROR_ID);
        if (errEl) errEl.textContent = '';
      });
    });

    // Custom minutes input & apply button
    const customInput = document.getElementById(CUSTOM_INPUT_ID);
    const customApply = document.getElementById(CUSTOM_APPLY_ID);
    const customError = document.getElementById(CUSTOM_ERROR_ID);

    function handleCustomApply() {
      if (!customInput) return;
      const mins = parseInt(customInput.value, 10);
      if (isNaN(mins) || mins < 1 || mins > 180) {
        if (customError) customError.textContent = 'Masukkan durasi antara 1 hingga 180 menit';
        return;
      }
      if (customError) customError.textContent = '';
      setDuration(mins);
    }

    if (customApply) customApply.addEventListener('click', handleCustomApply);
    if (customInput) {
      customInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleCustomApply();
      });
      customInput.addEventListener('input', function () {
        if (customError) customError.textContent = '';
      });
    }
  }

  return { init, setDuration };
})();

// ============================================================
// SortController Module
// Mengelola preferensi pengurutan daftar tugas.
// Mendukung tombol filter memanjang horizontal dan <select>.
// ============================================================
const SortController = (() => {
  const STORAGE_KEY  = 'sortMode';
  const SELECT_ID    = 'sort-select';
  const VALID_MODES  = ['default', 'incomplete', 'complete'];

  let currentMode = 'default';

  function saveMode(mode) {
    Storage.set(STORAGE_KEY, mode);
  }

  function applySort(tasks, mode) {
    const sorted = [...tasks];

    if (mode === 'default') {
      sorted.sort((a, b) => a.addedAt - b.addedAt);
    } else if (mode === 'incomplete') {
      sorted.sort((a, b) => {
        const diff = (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
        if (diff !== 0) return diff;
        return a.addedAt - b.addedAt;
      });
    } else if (mode === 'complete') {
      sorted.sort((a, b) => {
        const diff = (a.completed ? 0 : 1) - (b.completed ? 0 : 1);
        if (diff !== 0) return diff;
        return a.addedAt - b.addedAt;
      });
    } else {
      sorted.sort((a, b) => a.addedAt - b.addedAt);
    }

    return sorted;
  }

  function getCurrentMode() {
    return currentMode;
  }

  function syncTabs(mode) {
    const tabs = document.querySelectorAll('.sort-tab');
    tabs.forEach(tab => {
      const match = tab.dataset.mode === mode;
      tab.classList.toggle('active', match);
      tab.setAttribute('aria-selected', String(match));
    });

    const selectEl = document.getElementById(SELECT_ID);
    if (selectEl) {
      selectEl.value = mode;
    }
  }

  function init(onSortChange) {
    const saved = Storage.get(STORAGE_KEY, 'default');
    currentMode = VALID_MODES.includes(saved) ? saved : 'default';

    syncTabs(currentMode);

    // Event listener untuk Filter Memanjang Horizontal
    const tabs = document.querySelectorAll('.sort-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        const newMode = this.dataset.mode;
        if (!VALID_MODES.includes(newMode) || newMode === currentMode) return;
        currentMode = newMode;
        saveMode(newMode);
        syncTabs(newMode);
        if (typeof onSortChange === 'function') {
          onSortChange(newMode);
        }
      });
    });

    // Event listener untuk select element (jika diubah secara programmatic)
    const selectEl = document.getElementById(SELECT_ID);
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        const newMode = VALID_MODES.includes(this.value) ? this.value : 'default';
        currentMode = newMode;
        saveMode(newMode);
        syncTabs(newMode);
        if (typeof onSortChange === 'function') {
          onSortChange(newMode);
        }
      });
    }
  }

  return { init, applySort, getCurrentMode };
})();

// ============================================================
// Helper: generateId
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ============================================================
// TodoManager Module
// Mengelola CRUD tugas, penghitungan statistik, dan rendering.
// Bebas emoji.
// ============================================================
const TodoManager = (() => {
  const STORAGE_KEY   = 'tasks';
  const INPUT_ID      = 'task-input';
  const ADD_BTN_ID    = 'task-add-btn';
  const ERROR_ID      = 'task-error';
  const LIST_ID       = 'task-list';
  const EMPTY_ID      = 'task-empty-state';
  const MAX_LEN       = 200;

  let tasks       = [];
  let currentMode = 'default';

  function validateText(text, maxLen) {
    const trimmed = text ? text.trim() : '';
    if (!trimmed) {
      return { valid: false, error: 'Teks tugas tidak boleh kosong' };
    }
    if (trimmed.length > maxLen) {
      return { valid: false, error: `Teks tugas maksimal ${maxLen} karakter` };
    }
    return { valid: true };
  }

  function showError(message) {
    const el = document.getElementById(ERROR_ID);
    if (el) el.textContent = message;
  }

  function clearError() {
    const el = document.getElementById(ERROR_ID);
    if (el) el.textContent = '';
  }

  function persist() {
    Storage.set(STORAGE_KEY, tasks);
    updateStats();
  }

  function updateStats(displayedCount) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;

    const totalEl = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    const completedEl = document.getElementById('stat-completed');
    const emptyEl = document.getElementById(EMPTY_ID);

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (completedEl) completedEl.textContent = completed;

    if (emptyEl) {
      const count = typeof displayedCount === 'number' ? displayedCount : total;
      if (count === 0) {
        if (total === 0) {
          emptyEl.textContent = 'Belum ada tugas dalam daftar.';
        } else if (currentMode === 'incomplete') {
          emptyEl.textContent = 'Semua tugas telah selesai.';
        } else if (currentMode === 'complete') {
          emptyEl.textContent = 'Belum ada tugas yang selesai.';
        } else {
          emptyEl.textContent = 'Belum ada tugas dalam daftar ini.';
        }
        emptyEl.classList.remove('hidden');
      } else {
        emptyEl.classList.add('hidden');
      }
    }
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' task-item--completed' : '');
    li.dataset.id = task.id;

    // Normal view
    const normalView = document.createElement('div');
    normalView.className = 'task-normal-view';

    // Minimalist Checkbox
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'task-toggle';
    toggleBtn.setAttribute('aria-label', task.completed ? 'Tandai belum selesai' : 'Tandai selesai');
    toggleBtn.setAttribute('aria-pressed', String(task.completed));

    const checkIcon = document.createElement('span');
    checkIcon.className = 'task-toggle-icon';
    toggleBtn.appendChild(checkIcon);

    toggleBtn.addEventListener('click', function () {
      toggleTask(task.id);
    });

    // Task text
    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;

    // Actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    // Edit button (Teks minimalis tanpa emoji)
    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn task-action-btn--edit';
    editBtn.setAttribute('aria-label', 'Edit tugas');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', function () {
      showEditView(li, task);
    });

    // Delete button (Teks minimalis tanpa emoji)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn task-action-btn--delete';
    deleteBtn.setAttribute('aria-label', 'Hapus tugas');
    deleteBtn.textContent = 'Hapus';
    deleteBtn.addEventListener('click', function () {
      deleteTask(task.id);
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    normalView.appendChild(toggleBtn);
    normalView.appendChild(textSpan);
    normalView.appendChild(actionsDiv);

    li.appendChild(normalView);
    return li;
  }

  function showEditView(li, task) {
    const normalView = li.querySelector('.task-normal-view');
    if (normalView) normalView.style.display = 'none';

    let editView = li.querySelector('.task-edit-view');
    if (!editView) {
      editView = document.createElement('div');
      editView.className = 'task-edit-view';

      const row = document.createElement('div');
      row.className = 'task-edit-row';

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'task-edit-input';
      editInput.maxLength = MAX_LEN;
      editInput.setAttribute('aria-label', 'Edit teks tugas');
      editInput.value = task.text;

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary task-edit-save';
      saveBtn.setAttribute('aria-label', 'Simpan perubahan tugas');
      saveBtn.textContent = 'Simpan';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary task-edit-cancel';
      cancelBtn.setAttribute('aria-label', 'Batal edit tugas');
      cancelBtn.textContent = 'Batal';

      const editError = document.createElement('span');
      editError.className = 'error-msg task-edit-error';
      editError.setAttribute('role', 'alert');

      function doSave() {
        const newText = editInput.value;
        const result = validateText(newText, MAX_LEN);
        if (!result.valid) {
          editError.textContent = result.error;
          return;
        }
        editError.textContent = '';
        editTask(task.id, newText);
      }

      function doCancel() {
        editView.style.display = 'none';
        if (normalView) normalView.style.display = '';
      }

      saveBtn.addEventListener('click', doSave);
      cancelBtn.addEventListener('click', doCancel);

      editInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSave();
        if (e.key === 'Escape') doCancel();
      });

      row.appendChild(editInput);
      row.appendChild(saveBtn);
      row.appendChild(cancelBtn);

      editView.appendChild(row);
      editView.appendChild(editError);
      li.appendChild(editView);

      setTimeout(() => editInput.focus(), 50);
    } else {
      const editInput = editView.querySelector('.task-edit-input');
      if (editInput) {
        editInput.value = task.text;
        setTimeout(() => editInput.focus(), 50);
      }
      const editError = editView.querySelector('.task-edit-error');
      if (editError) editError.textContent = '';
      editView.style.display = '';
    }
  }

  function render() {
    const listEl = document.getElementById(LIST_ID);
    if (!listEl) return;

    const sorted = SortController.applySort(tasks, currentMode);

    // Filter: sembunyikan tugas yang tidak sesuai filter yang dipilih
    let displayedTasks = sorted;
    if (currentMode === 'incomplete') {
      displayedTasks = sorted.filter(function (task) { return !task.completed; });
    } else if (currentMode === 'complete') {
      displayedTasks = sorted.filter(function (task) { return task.completed; });
    }

    listEl.innerHTML = '';
    displayedTasks.forEach(function (task) {
      listEl.appendChild(createTaskElement(task));
    });

    updateStats(displayedTasks.length);
  }

  function addTask(text) {
    const result = validateText(text, MAX_LEN);
    if (!result.valid) {
      showError(result.error);
      return;
    }
    clearError();

    const trimmed = text.trim();
    const newTask = {
      id:        generateId(),
      text:      trimmed,
      completed: false,
      addedAt:   Date.now()
    };

    tasks.push(newTask);
    persist();
    render();
  }

  function editTask(id, newText) {
    const result = validateText(newText, MAX_LEN);
    if (!result.valid) return;

    const trimmed = newText.trim();
    const task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      task.text = trimmed;
      persist();
      render();
    }
  }

  function toggleTask(id) {
    const task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      task.completed = !task.completed;
      persist();
      render();
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(function (t) { return t.id !== id; });
    persist();
    render();
  }

  function init() {
    tasks = Storage.get(STORAGE_KEY, []);
    if (!Array.isArray(tasks)) tasks = [];

    SortController.init(function (mode) {
      currentMode = mode;
      render();
    });
    currentMode = SortController.getCurrentMode();

    render();
    updateStats();

    const inputEl  = document.getElementById(INPUT_ID);
    const addBtn   = document.getElementById(ADD_BTN_ID);

    function handleAdd() {
      const value = inputEl ? inputEl.value : '';
      addTask(value);
      if (inputEl) inputEl.value = '';
    }

    if (addBtn) {
      addBtn.addEventListener('click', handleAdd);
    }

    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleAdd();
      });
      inputEl.addEventListener('input', function () {
        clearError();
      });
    }
  }

  return {
    init,
    validateText,
    addTask,
    editTask,
    toggleTask,
    deleteTask,
    getTasks: function () { return tasks; }
  };
})();

// ============================================================
// LinkManager Module
// Mengelola CRUD Quick Links dengan kartu minimalis modern.
// ============================================================
const LinkManager = (() => {
  const STORAGE_KEY   = 'links';
  const LABEL_ID      = 'link-label';
  const URL_ID        = 'link-url';
  const ADD_BTN_ID    = 'link-add-btn';
  const ERROR_ID      = 'link-error';
  const GRID_ID       = 'links-grid';
  const BADGE_ID      = 'links-count-badge';
  const EMPTY_ID      = 'links-empty-state';
  const MAX_LINKS     = 20;

  let links = [];

  function normalizeUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  }

  function validateLink(label, url) {
    const errors = {};

    const trimmedLabel = label ? label.trim() : '';
    const trimmedUrl   = url   ? url.trim()   : '';

    if (!trimmedLabel) {
      errors.label = 'Label tidak boleh kosong';
    }
    if (!trimmedUrl) {
      errors.url = 'URL tidak boleh kosong';
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  function showError(message) {
    const el = document.getElementById(ERROR_ID);
    if (el) el.textContent = message;
  }

  function clearError() {
    const el = document.getElementById(ERROR_ID);
    if (el) el.textContent = '';
  }

  function persist() {
    Storage.set(STORAGE_KEY, links);
    updateBadge();
  }

  function updateBadge() {
    const badge = document.getElementById(BADGE_ID);
    if (badge) badge.textContent = `${links.length}/${MAX_LINKS}`;

    const empty = document.getElementById(EMPTY_ID);
    if (empty) empty.classList.toggle('hidden', links.length > 0);
  }

  function render() {
    const gridEl = document.getElementById(GRID_ID);
    if (!gridEl) return;

    gridEl.innerHTML = '';

    if (!Storage.isAvailable()) {
      const infoEl = document.createElement('p');
      infoEl.className = 'error-msg';
      infoEl.textContent = 'Penyimpanan tidak tersedia. Tautan tidak akan tersimpan.';
      gridEl.appendChild(infoEl);
    }

    links.forEach(function (link) {
      const card = document.createElement('div');
      card.className = 'link-card';
      card.dataset.id = link.id;

      const mainLink = document.createElement('a');
      mainLink.className = 'link-main';
      mainLink.href = link.url;
      mainLink.target = '_blank';
      mainLink.rel = 'noopener noreferrer';

      // Badge inisial huruf pertama minimalis
      const badge = document.createElement('span');
      badge.className = 'link-icon-badge';
      badge.textContent = (link.label || 'L').charAt(0).toUpperCase();

      const labelText = document.createElement('span');
      labelText.className = 'link-label-text';
      labelText.textContent = link.label;

      mainLink.appendChild(badge);
      mainLink.appendChild(labelText);

      // Tombol hapus minimalis teks "Hapus"
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'link-delete-btn';
      deleteBtn.textContent = 'Hapus';
      deleteBtn.setAttribute('aria-label', 'Hapus tautan ' + link.label);
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteLink(link.id);
      });

      card.appendChild(mainLink);
      card.appendChild(deleteBtn);
      gridEl.appendChild(card);
    });

    updateBadge();
  }

  function addLink(label, url) {
    if (links.length >= MAX_LINKS) {
      showError('Jumlah tautan maksimal ' + MAX_LINKS + ' entri');
      return;
    }

    const result = validateLink(label, url);
    if (!result.valid) {
      const firstError = result.errors.label || result.errors.url || 'Input tidak valid';
      showError(firstError);
      return;
    }

    clearError();

    const newLink = {
      id:    generateId(),
      label: label.trim(),
      url:   normalizeUrl(url.trim())
    };

    links.push(newLink);
    persist();
    render();
  }

  function deleteLink(id) {
    links = links.filter(function (l) { return l.id !== id; });
    persist();
    render();
  }

  function init() {
    links = Storage.get(STORAGE_KEY, []);
    if (!Array.isArray(links)) links = [];

    render();

    const labelEl  = document.getElementById(LABEL_ID);
    const urlEl    = document.getElementById(URL_ID);
    const addBtn   = document.getElementById(ADD_BTN_ID);

    function handleAdd() {
      const labelVal = labelEl ? labelEl.value : '';
      const urlVal   = urlEl   ? urlEl.value   : '';
      addLink(labelVal, urlVal);

      const errEl = document.getElementById(ERROR_ID);
      if (!errEl || !errEl.textContent) {
        if (labelEl) labelEl.value = '';
        if (urlEl)   urlEl.value   = '';
      }
    }

    if (addBtn) {
      addBtn.addEventListener('click', handleAdd);
    }

    [labelEl, urlEl].forEach(function (inputEl) {
      if (inputEl) {
        inputEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') handleAdd();
        });
        inputEl.addEventListener('input', function () {
          clearError();
        });
      }
    });
  }

  return {
    init,
    normalizeUrl,
    validateLink,
    addLink,
    deleteLink,
    getLinks: function () { return links; }
  };
})();

// ============================================================
// Bootstrap — inisialisasi semua modul saat DOM ready
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  if (!Storage.isAvailable()) {
    const banner = document.getElementById('storage-warning');
    if (banner) banner.classList.remove('hidden');
  }

  ThemeController.init();
  GreetingWidget.init();
  NameSettingController.init();
  WelcomeModalController.init();
  TimerModule.init();
  TodoManager.init();
  LinkManager.init();
});
