// ========================================
// Mobile-Optimized Ivy Lee Planner
// ========================================

// State Management
const state = {
    currentWeekStart: null,
    weeklyData: {},
    streak: 0,
    currentDayIndex: 0,
    touchStartX: 0,
    touchEndX: 0
};

// ========================================
// Utility Functions
// ========================================

function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDate(date) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatWeekRange(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${weekStart.getDate()} ${months[weekStart.getMonth()]} - ${weekEnd.getDate()} ${months[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;
}

function getDayName(date) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
}

function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Local Storage Functions
// ========================================

function saveToLocalStorage() {
    localStorage.setItem('ivyLeeWeeklyData', JSON.stringify(state.weeklyData));
    localStorage.setItem('ivyLeeStreak', state.streak.toString());
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('ivyLeeWeeklyData');
    const savedStreak = localStorage.getItem('ivyLeeStreak');

    if (savedData) {
        state.weeklyData = JSON.parse(savedData);
    }

    if (savedStreak) {
        state.streak = parseInt(savedStreak, 10);
    }
}

// ========================================
// Task Management
// ========================================

function initializeDayData(dateKey) {
    if (!state.weeklyData[dateKey]) {
        state.weeklyData[dateKey] = {
            tasks: [],
            completed: false
        };
    }
}

function addTask(dateKey, taskText) {
    initializeDayData(dateKey);
    const dayData = state.weeklyData[dateKey];

    if (dayData.tasks.length >= 6) {
        alert('⚠️ Método Ivy Lee: Máximo 6 tareas por día.\n\nPara agregar una nueva tarea, primero completa o elimina una existente.');
        return false;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        priority: dayData.tasks.length + 1
    };

    dayData.tasks.push(task);
    saveToLocalStorage();
    return true;
}

function toggleTask(dateKey, taskId) {
    const dayData = state.weeklyData[dateKey];
    if (!dayData) return;

    const task = dayData.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage();
        renderCurrentDay();
        updateStatistics();
        checkStreak();
    }
}

function deleteTask(dateKey, taskId) {
    const dayData = state.weeklyData[dateKey];
    if (!dayData) return;

    dayData.tasks = dayData.tasks.filter(t => t.id !== taskId);

    // Reorder priorities
    dayData.tasks.forEach((task, index) => {
        task.priority = index + 1;
    });

    saveToLocalStorage();
    renderCurrentDay();
    updateStatistics();
}

function moveTask(dateKey, taskId, direction) {
    const dayData = state.weeklyData[dateKey];
    if (!dayData) return;

    const taskIndex = dayData.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const newIndex = direction === 'up' ? taskIndex - 1 : taskIndex + 1;

    if (newIndex < 0 || newIndex >= dayData.tasks.length) return;

    // Swap tasks
    [dayData.tasks[taskIndex], dayData.tasks[newIndex]] = [dayData.tasks[newIndex], dayData.tasks[taskIndex]];

    // Update priorities
    dayData.tasks.forEach((task, index) => {
        task.priority = index + 1;
    });

    saveToLocalStorage();
    renderCurrentDay();
}

// ========================================
// Rendering Functions
// ========================================

function renderCurrentDay() {
    const date = new Date(state.currentWeekStart);
    date.setDate(state.currentWeekStart.getDate() + state.currentDayIndex);
    const dateKey = getDateKey(date);

    // Select the specific day card based on current index
    const dayCard = document.querySelector(`.day-card[data-index="${state.currentDayIndex}"]`);
    if (!dayCard) return;

    const dayData = state.weeklyData[dateKey] || { tasks: [] };
    const tasksList = dayCard.querySelector('.tasks-list');

    // Clear existing tasks
    tasksList.innerHTML = '';

    if (dayData.tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="9" x2="15" y2="9"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                    <line x1="9" y1="17" x2="13" y2="17"/>
                </svg>
                <p>No hay tareas programadas</p>
                <p style="font-size: 0.75rem;">Agrega hasta 6 tareas para este día</p>
            </div>
        `;
    } else {
        dayData.tasks.forEach((task, index) => {
            const taskItem = createTaskElement(task, dateKey, index, dayData.tasks.length);
            tasksList.appendChild(taskItem);
        });
    }

    updateDayProgress(dateKey);
}

function createTaskElement(task, dateKey, index, totalTasks) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskItem.innerHTML = `
        <div class="task-priority">${task.priority}</div>
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-task-id="${task.id}"></div>
        <div class="task-content">
            <div class="task-text">${escapeHtml(task.text)}</div>
        </div>
        <div class="task-actions">
            ${index > 0 ? `
                <button class="task-btn move-up-btn" data-task-id="${task.id}" title="Mover arriba">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 15l-6-6-6 6"/>
                    </svg>
                </button>
            ` : ''}
            ${index < totalTasks - 1 ? `
                <button class="task-btn move-down-btn" data-task-id="${task.id}" title="Mover abajo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </button>
            ` : ''}
            <button class="task-btn delete-btn" data-task-id="${task.id}" title="Eliminar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;

    // Event listeners
    const checkbox = taskItem.querySelector('.task-checkbox');
    checkbox.addEventListener('click', () => toggleTask(dateKey, task.id));

    const deleteBtn = taskItem.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar esta tarea?')) {
                deleteTask(dateKey, task.id);
            }
        });
    }

    const moveUpBtn = taskItem.querySelector('.move-up-btn');
    if (moveUpBtn) {
        moveUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveTask(dateKey, task.id, 'up');
        });
    }

    const moveDownBtn = taskItem.querySelector('.move-down-btn');
    if (moveDownBtn) {
        moveDownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveTask(dateKey, task.id, 'down');
        });
    }

    return taskItem;
}

function updateDayProgress(dateKey) {
    // Select the specific day card by date key
    const dayCard = document.querySelector(`.day-card[data-date="${dateKey}"]`);
    if (!dayCard) return;

    const dayData = state.weeklyData[dateKey] || { tasks: [] };
    const totalTasks = dayData.tasks.length;
    const completedTasks = dayData.tasks.filter(t => t.completed).length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const progressText = dayCard.querySelector('.progress-text');
    const progressPercent = dayCard.querySelector('.progress-percent');
    const progressFill = dayCard.querySelector('.progress-fill');

    if (progressText) {
        progressText.textContent = `${completedTasks}/${totalTasks}`;
    }

    if (progressPercent) {
        progressPercent.textContent = `${percentage}%`;
    }

    if (progressFill) {
        const circumference = 2 * Math.PI * 20;
        const offset = circumference - (percentage / 100) * circumference;
        progressFill.style.strokeDasharray = circumference;
        progressFill.style.strokeDashoffset = offset;
    }

    if (totalTasks > 0 && completedTasks === totalTasks) {
        dayCard.classList.add('completed');
    } else {
        dayCard.classList.remove('completed');
    }
}

function renderWeek() {
    const carousel = document.getElementById('daysCarousel');
    const dots = document.getElementById('dayDots');

    carousel.innerHTML = '';
    dots.innerHTML = '';

    // Create carousel inner container
    const carouselInner = document.createElement('div');
    carouselInner.className = 'days-carousel-inner';
    carouselInner.id = 'carouselInner';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's index
    let todayIndex = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date(state.currentWeekStart);
        date.setDate(state.currentWeekStart.getDate() + i);
        const dateKey = getDateKey(date);

        const isToday = date.getTime() === today.getTime();
        if (isToday) todayIndex = i;

        const dayData = state.weeklyData[dateKey] || { tasks: [] };

        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.setAttribute('data-date', dateKey);
        dayCard.setAttribute('data-index', i);

        dayCard.innerHTML = `
            <div class="day-header">
                <div class="day-title">
                    <div class="day-name">${getDayName(date)}${isToday ? ' 🌟' : ''}</div>
                    <div class="day-date">${formatDate(date)}</div>
                </div>
                <div class="day-progress">
                    <div class="progress-text">0/0</div>
                    <div class="progress-circle">
                        <svg class="progress-svg" width="48" height="48" viewBox="0 0 48 48">
                            <defs>
                                <linearGradient id="progressGradient${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:hsl(260, 85%, 55%);stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:hsl(290, 85%, 60%);stop-opacity:1" />
                                </linearGradient>
                            </defs>
                            <circle class="progress-bg" cx="24" cy="24" r="20"/>
                            <circle class="progress-fill" cx="24" cy="24" r="20" stroke="url(#progressGradient${i})"/>
                        </svg>
                        <div class="progress-percent">0%</div>
                    </div>
                </div>
            </div>
            
            <div class="tasks-list"></div>
            
            <div class="add-task-section">
                <input 
                    type="text" 
                    class="add-task-input" 
                    placeholder="Nueva tarea (Enter para agregar)"
                    maxlength="200"
                    data-date="${dateKey}"
                />
                ${dayData.tasks.length >= 6 ?
                '<div class="task-limit-warning">⚠️ Límite de 6 tareas alcanzado</div>' :
                `<button class="add-task-btn" data-date="${dateKey}">+ Agregar Tarea</button>`
            }
            </div>
        `;

        carouselInner.appendChild(dayCard);

        // Create dot
        const dot = document.createElement('div');
        dot.className = `day-dot ${i === todayIndex ? 'active' : ''}`;
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', () => goToDay(i));
        dots.appendChild(dot);

        // Event listener for add task input
        const input = dayCard.querySelector('.add-task-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                const success = addTask(dateKey, input.value.trim());
                if (success) {
                    input.value = '';
                    renderCurrentDay();
                    updateStatistics();
                }
            }
        });

        // Event listener for add task button
        const addBtn = dayCard.querySelector('.add-task-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                input.focus();
            });
        }
    }

    carousel.appendChild(carouselInner);

    // Render tasks for all days
    renderAllDays();

    // Set initial day to today
    state.currentDayIndex = todayIndex;
    goToDay(todayIndex);

    // Add touch events for swiping
    setupTouchEvents();

    updateStatistics();
}

// ========================================
// Render All Days' Tasks
// ========================================

function renderAllDays() {
    for (let i = 0; i < 7; i++) {
        const date = new Date(state.currentWeekStart);
        date.setDate(state.currentWeekStart.getDate() + i);
        const dateKey = getDateKey(date);

        const dayCard = document.querySelector(`.day-card[data-index="${i}"]`);
        if (!dayCard) continue;

        const dayData = state.weeklyData[dateKey] || { tasks: [] };
        const tasksList = dayCard.querySelector('.tasks-list');

        // Clear existing tasks
        tasksList.innerHTML = '';

        if (dayData.tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="9" y1="9" x2="15" y2="9"/>
                        <line x1="9" y1="13" x2="15" y2="13"/>
                        <line x1="9" y1="17" x2="13" y2="17"/>
                    </svg>
                    <p>No hay tareas programadas</p>
                    <p style="font-size: 0.75rem;">Agrega hasta 6 tareas para este día</p>
                </div>
            `;
        } else {
            dayData.tasks.forEach((task, index) => {
                const taskItem = createTaskElement(task, dateKey, index, dayData.tasks.length);
                tasksList.appendChild(taskItem);
            });
        }

        updateDayProgress(dateKey);
    }
}

// ========================================
// Touch Events for Swipe Navigation
// ========================================

function setupTouchEvents() {
    const carousel = document.getElementById('carouselInner');

    carousel.addEventListener('touchstart', (e) => {
        state.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
        state.touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = state.touchStartX - state.touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next day
            if (state.currentDayIndex < 6) {
                goToDay(state.currentDayIndex + 1);
            }
        } else {
            // Swipe right - previous day
            if (state.currentDayIndex > 0) {
                goToDay(state.currentDayIndex - 1);
            }
        }
    }
}

function goToDay(index) {
    state.currentDayIndex = index;
    const carousel = document.getElementById('carouselInner');
    const offset = -index * 100;
    carousel.style.transform = `translateX(${offset}%)`;

    // Update dots
    document.querySelectorAll('.day-dot').forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Render current day
    renderCurrentDay();
}

// ========================================
// Statistics
// ========================================

function updateStatistics() {
    const weekStart = state.currentWeekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    let totalTasks = 0;
    let completedTasks = 0;

    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateKey = getDateKey(d);
        const dayData = state.weeklyData[dateKey];

        if (dayData) {
            totalTasks += dayData.tasks.length;
            completedTasks += dayData.tasks.filter(t => t.completed).length;
        }
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    document.getElementById('currentStreak').textContent = state.streak;
}

function checkStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayKey = getDateKey(today);
    const yesterdayKey = getDateKey(yesterday);

    const todayData = state.weeklyData[todayKey];
    const yesterdayData = state.weeklyData[yesterdayKey];

    if (todayData && todayData.tasks.length > 0) {
        const todayCompleted = todayData.tasks.every(t => t.completed);

        if (todayCompleted) {
            if (yesterdayData && yesterdayData.tasks.length > 0 && yesterdayData.tasks.every(t => t.completed)) {
                state.streak++;
            } else {
                state.streak = 1;
            }
            saveToLocalStorage();
            updateStatistics();
        }
    }
}

// ========================================
// Week Navigation
// ========================================

function changeWeek(direction) {
    const newWeekStart = new Date(state.currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
    state.currentWeekStart = newWeekStart;

    updateWeekDisplay();
    renderWeek();
}

function updateWeekDisplay() {
    document.getElementById('currentWeek').textContent = formatWeekRange(state.currentWeekStart);
}

// ========================================
// Export Functionality
// ========================================

function exportWeeklyPlan() {
    const weekStart = state.currentWeekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    let exportText = `═══════════════════════════════════════════════════\n`;
    exportText += `       IVY LEE METHOD - PLAN SEMANAL\n`;
    exportText += `═══════════════════════════════════════════════════\n\n`;
    exportText += `Semana: ${formatWeekRange(weekStart)}\n\n`;

    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateKey = getDateKey(d);
        const dayData = state.weeklyData[dateKey];

        exportText += `───────────────────────────────────────────────────\n`;
        exportText += `📅 ${getDayName(d)} - ${formatDate(d)}\n`;
        exportText += `───────────────────────────────────────────────────\n`;

        if (dayData && dayData.tasks.length > 0) {
            dayData.tasks.forEach((task, index) => {
                const status = task.completed ? '✅' : '⬜';
                exportText += `  ${index + 1}. ${status} ${task.text}\n`;
            });

            const completed = dayData.tasks.filter(t => t.completed).length;
            const total = dayData.tasks.length;
            const percentage = Math.round((completed / total) * 100);
            exportText += `\n  Progreso: ${completed}/${total} (${percentage}%)\n`;
        } else {
            exportText += `  Sin tareas programadas\n`;
        }
        exportText += `\n`;
    }

    exportText += `═══════════════════════════════════════════════════\n`;
    exportText += `                  ESTADÍSTICAS\n`;
    exportText += `═══════════════════════════════════════════════════\n`;

    let totalTasks = 0;
    let completedTasks = 0;

    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateKey = getDateKey(d);
        const dayData = state.weeklyData[dateKey];

        if (dayData) {
            totalTasks += dayData.tasks.length;
            completedTasks += dayData.tasks.filter(t => t.completed).length;
        }
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    exportText += `Total de tareas: ${totalTasks}\n`;
    exportText += `Tareas completadas: ${completedTasks}\n`;
    exportText += `Tasa de cumplimiento: ${completionRate}%\n`;
    exportText += `Racha actual: ${state.streak} días\n\n`;

    exportText += `═══════════════════════════════════════════════════\n`;
    exportText += `  "Do the most important thing first each day"\n`;
    exportText += `═══════════════════════════════════════════════════\n`;

    // Create download
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IvyLee_Plan_${getDateKey(weekStart)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ========================================
// Clear All
// ========================================

function clearAllData() {
    if (confirm('⚠️ ¿Estás seguro de que quieres eliminar todos los datos?\n\nEsta acción no se puede deshacer.')) {
        if (confirm('🔴 ÚLTIMA CONFIRMACIÓN: Se borrarán todas tus tareas y progreso.')) {
            state.weeklyData = {};
            state.streak = 0;
            saveToLocalStorage();
            renderWeek();
            updateStatistics();
        }
    }
}

// ========================================
// Mobile Menu
// ========================================

function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    menuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
            mobileMenu.classList.remove('active');
        }
    });

    // Menu buttons
    document.getElementById('eatFrogBtnMobile').addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        document.getElementById('eatFrogModal').classList.add('active');
    });

    document.getElementById('clearAllBtnMobile').addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        clearAllData();
    });

    document.getElementById('exportBtnMobile').addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        exportWeeklyPlan();
    });
}

// ========================================
// Collapsible Explanation
// ========================================

function initExplanationToggle() {
    const toggle = document.getElementById('explanationToggle');
    const card = document.getElementById('explanationCard');

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        card.classList.toggle('active');
    });
}

// ========================================
// Eat That Frog Modal
// ========================================

function initEatFrogModal() {
    const modal = document.getElementById('eatFrogModal');
    const closeBtn = document.getElementById('closeModal');
    const overlay = modal.querySelector('.modal-overlay');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    overlay.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Tab switching
    const tabBtns = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');

            if (tabName === 'frog') {
                loadTodayFrogSelector();
            }
        });
    });

    // ABCDE Method button
    document.getElementById('applyABCDE').addEventListener('click', () => {
        alert('💡 Consejo del Método ABCDE:\n\nRevisa tus 6 tareas de hoy y clasifícalas:\n\n✅ Prioriza las tareas "A" y "B"\n⏸️ Pospone las tareas "C"\n👥 Delega las tareas "D"\n❌ Elimina las tareas "E"\n\nRecuerda: Nunca hagas una tarea B si tienes una tarea A pendiente.');
    });

    // Pareto button
    document.getElementById('identifyHighImpact').addEventListener('click', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = getDateKey(today);
        const todayData = state.weeklyData[todayKey];

        if (!todayData || todayData.tasks.length === 0) {
            alert('📋 No tienes tareas programadas para hoy.\n\nAgrega tus tareas primero en el planificador semanal.');
            return;
        }

        const taskCount = todayData.tasks.length;
        const highImpactCount = Math.max(1, Math.ceil(taskCount * 0.2));

        alert(`🎯 Regla 80/20 Aplicada:\n\nDe tus ${taskCount} tareas de hoy, las primeras ${highImpactCount} tareas son tu 20% de alto impacto.\n\n💡 Enfócate PRIMERO en estas ${highImpactCount} tareas para obtener el 80% de tus resultados.\n\n¿Están actualmente en las posiciones correctas? Si no, reordénalas en tu planificador.`);
    });
}

function loadTodayFrogSelector() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = getDateKey(today);
    const todayData = state.weeklyData[todayKey];

    const frogSelector = document.getElementById('todayFrogSelector');

    if (!todayData || todayData.tasks.length === 0) {
        frogSelector.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                <p>📋 No tienes tareas programadas para hoy.</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">Agrega tus tareas en el planificador semanal primero.</p>
            </div>
        `;
        return;
    }

    frogSelector.innerHTML = '';

    todayData.tasks.forEach((task, index) => {
        const option = document.createElement('div');
        option.className = 'frog-task-option';
        option.innerHTML = `
            <span class="frog-emoji">${index === 0 ? '🐸' : '🔹'}</span>
            <div style="flex: 1;">
                <strong>Tarea ${task.priority}</strong>: ${escapeHtml(task.text)}
            </div>
            ${task.completed ? '<span style="color: var(--success);">✅</span>' : ''}
        `;

        if (index === 0) {
            option.classList.add('selected');
        }

        option.addEventListener('click', () => {
            frogSelector.querySelectorAll('.frog-task-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');

            alert(`🐸 ¡Excelente elección!\n\n"${task.text}"\n\n✅ Esta es tu SAPO del día.\n✅ Concéntrate en esta tarea PRIMERO.\n✅ No pases a otra tarea hasta completarla.\n✅ Tendrás la satisfacción de saber que lo peor ya pasó.`);
        });

        frogSelector.appendChild(option);
    });
}

// ========================================
// Initialization
// ========================================

function init() {
    loadFromLocalStorage();
    state.currentWeekStart = getWeekStart();
    updateWeekDisplay();
    renderWeek();

    // Event listeners
    document.getElementById('prevWeekBtn').addEventListener('click', () => changeWeek(-1));
    document.getElementById('nextWeekBtn').addEventListener('click', () => changeWeek(1));

    // Initialize components
    initMobileMenu();
    initExplanationToggle();
    initEatFrogModal();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
