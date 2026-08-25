/**
 * @file habitTrackerView.js
 * Habit Tracker View Controller.
 * Supports Weekly matrix view (Mon-Sun) and Monthly matrix view with consistency metrics.
 */

import { DateUtils } from '../domain/models.js';
import { HabitUtils, HABIT_DEFAULT_ICONS } from '../domain/habitsModel.js';
import { store } from '../state/store.js';

export const HabitTrackerView = {
  container: null,
  modalContainer: null,
  editingHabitId: null,

  init() {
    this.container = document.getElementById('habit-view-container');
    this.modalContainer = document.getElementById('habit-modal-container');
    if (!this.container) return;

    store.subscribe((state) => {
      if (state.viewMode === 'habits') {
        this.render(state);
      }
    });

    if (store.getState().viewMode === 'habits') {
      this.render(store.getState());
    }

    this.initModal();
  },

  render(state) {
    if (!this.container) return;

    const { habits, weekDays, habitViewMode, habitMonthDate, todayDate } = state;

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const currentMonthName = `${monthNames[habitMonthDate.getMonth()]} de ${habitMonthDate.getFullYear()}`;

    this.container.innerHTML = `
      <div class="habits-view-container">
        <!-- Habit Header Controls -->
        <div class="habits-header">
          <div class="habits-header-left">
            <h2 class="habits-title">🎯 Rastreador de Hábitos</h2>
            <div class="habits-subtitle">
              ${habitViewMode === 'week' ? `Semana de ${DateUtils.formatWeekRange(state.currentMonday)}` : currentMonthName}
            </div>
          </div>

          <div class="habits-header-actions">
            <!-- View Mode Switcher: Semana vs Mês -->
            <div class="view-switcher">
              <button type="button" class="view-btn ${habitViewMode === 'week' ? 'active' : ''}" data-habit-mode="week">Semana</button>
              <button type="button" class="view-btn ${habitViewMode === 'month' ? 'active' : ''}" data-habit-mode="month">Mês</button>
            </div>

            ${habitViewMode === 'month' ? `
              <div class="week-nav" style="margin-left: 8px;">
                <button type="button" class="nav-arrow-btn" id="btn-habit-prev-month" title="Mês anterior">‹</button>
                <span style="font-size: 0.85rem; font-weight: 600; padding: 0 8px;">${monthNames[habitMonthDate.getMonth()].slice(0, 3)}</span>
                <button type="button" class="nav-arrow-btn" id="btn-habit-next-month" title="Próximo mês">›</button>
              </div>
            ` : ''}

            <button type="button" class="btn-primary" id="btn-add-habit" style="margin-left: var(--space-xs);">
              <span>+</span>
              <span>Novo Hábito</span>
            </button>
          </div>
        </div>

        <!-- Habits Content Area -->
        ${habits.length === 0 ? `
          <div class="habits-empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🎯</div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">Nenhum hábito cadastrado ainda</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 400px; margin: 6px auto 16px auto;">
              Crie hábitos diários para acompanhar sua consistência semana a semana e mês a mês.
            </p>
            <button type="button" class="btn-primary" id="btn-empty-add-habit">+ Adicionar Primeiro Hábito</button>
          </div>
        ` : (habitViewMode === 'week' ? this.renderWeeklyView(habits, weekDays, todayDate) : this.renderMonthlyView(habits, habitMonthDate))}
      </div>
    `;

    this.attachEvents();
  },

  /**
   * Render Weekly Grid (Mon - Sun)
   */
  renderWeeklyView(habits, weekDays, todayDate) {
    return `
      <div class="habits-table-card">
        <div class="habits-table-responsive">
          <table class="habits-table">
            <thead>
              <tr>
                <th style="min-width: 200px; text-align: left;">Hábito</th>
                ${weekDays.map((day, idx) => {
                  const isToday = DateUtils.isSameDay(day, todayDate);
                  const shortName = DateUtils.dayNamesShort[idx];
                  const dayNumber = day.getDate();
                  return `
                    <th class="habit-day-th ${isToday ? 'today-col' : ''}">
                      <div>${shortName}</div>
                      <div class="habit-day-num">${dayNumber}</div>
                    </th>
                  `;
                }).join('')}
                <th style="width: 140px; text-align: center;">Progresso</th>
              </tr>
            </thead>
            <tbody>
              ${habits.map(habit => {
                const stats = HabitUtils.getWeeklyStats(habit, weekDays);
                return `
                  <tr class="habit-row" data-habit-id="${habit.id}">
                    <td class="habit-name-cell" data-edit-habit="${habit.id}" title="Clique para editar este hábito">
                      <span class="habit-icon">${habit.icon || '🎯'}</span>
                      <span class="habit-name">${this.escapeHtml(habit.name)}</span>
                    </td>

                    ${weekDays.map(day => {
                      const key = DateUtils.formatDateKey(day);
                      const isToday = DateUtils.isSameDay(day, todayDate);
                      const isDone = HabitUtils.isCompletedOnDate(habit, key);
                      return `
                        <td class="habit-check-cell ${isToday ? 'today-col' : ''}">
                          <button
                            type="button"
                            class="habit-check-btn ${isDone ? 'checked' : ''}"
                            data-toggle-habit="${habit.id}"
                            data-date="${key}"
                            title="${isDone ? 'Desmarcar' : 'Marcar como feito'} (${key})"
                          >
                            ${isDone ? '✓' : ''}
                          </button>
                        </td>
                      `;
                    }).join('')}

                    <td class="habit-progress-cell">
                      <div class="habit-progress-wrap">
                        <div class="habit-progress-bar-bg">
                          <div class="habit-progress-bar-fill" style="width: ${stats.percentage}%;"></div>
                        </div>
                        <span class="habit-progress-text">${stats.completedCount}/7</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * Render Monthly Matrix View
   */
  renderMonthlyView(habits, monthDate) {
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();

    return `
      <div class="habits-monthly-container">
        ${habits.map(habit => {
          const stats = HabitUtils.getMonthStats(habit, year, monthIndex);
          return `
            <div class="habit-month-card">
              <div class="habit-month-header">
                <div class="habit-name-cell" data-edit-habit="${habit.id}" style="cursor: pointer;">
                  <span class="habit-icon">${habit.icon || '🎯'}</span>
                  <span class="habit-name" style="font-size: 1rem; font-weight: 700;">${this.escapeHtml(habit.name)}</span>
                </div>
                <div class="habit-month-stats">
                  <span class="habit-consistency-badge">${stats.percentage}% consistência</span>
                  <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${stats.completedCount} de ${stats.totalDays} dias</span>
                </div>
              </div>

              <!-- Month Day Dots Grid -->
              <div class="habit-month-grid">
                ${stats.days.map(d => `
                  <button
                    type="button"
                    class="habit-month-day-btn ${d.isCompleted ? 'active' : ''} ${d.isToday ? 'is-today' : ''}"
                    data-toggle-habit="${habit.id}"
                    data-date="${d.dateKey}"
                    title="${d.dayNumber}: ${d.isCompleted ? 'Concluído' : 'Não concluído'}"
                  >
                    <span>${d.dayNumber}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  attachEvents() {
    // Mode Switcher
    this.container.querySelectorAll('[data-habit-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.habitMode;
        store.setHabitViewMode(mode);
      });
    });

    // Month navigation
    const prevBtn = this.container.querySelector('#btn-habit-prev-month');
    const nextBtn = this.container.querySelector('#btn-habit-next-month');
    if (prevBtn) prevBtn.addEventListener('click', () => store.prevHabitMonth());
    if (nextBtn) nextBtn.addEventListener('click', () => store.nextHabitMonth());

    // Toggle Habit Checkbox
    this.container.querySelectorAll('[data-toggle-habit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.toggleHabit;
        const dateKey = e.currentTarget.dataset.date;
        store.toggleHabitDate(id, dateKey);
      });
    });

    // Add Habit Button
    const addBtn = this.container.querySelector('#btn-add-habit');
    const emptyAddBtn = this.container.querySelector('#btn-empty-add-habit');
    if (addBtn) addBtn.addEventListener('click', () => this.openHabitModal(null));
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => this.openHabitModal(null));

    // Edit Habit
    this.container.querySelectorAll('[data-edit-habit]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.editHabit;
        this.openHabitModal(id);
      });
    });
  },

  /* ------------------------------------------------------------------------
     Habit Creation / Edit Modal
     ------------------------------------------------------------------------ */
  initModal() {
    if (!this.modalContainer) return;
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) this.closeModal();
    });
  },

  openHabitModal(habitId = null) {
    this.editingHabitId = habitId;
    const state = store.getState();
    const habit = habitId ? state.habits.find(h => h.id === habitId) : null;

    const initialIcon = habit ? habit.icon : '💧';
    const initialName = habit ? habit.name : '';

    this.modalContainer.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width: 440px;">
        <div class="modal-header">
          <h2 class="modal-title">${habit ? 'Editar Hábito' : 'Novo Hábito'}</h2>
          <button type="button" class="modal-close-btn" id="habit-modal-close">&times;</button>
        </div>

        <form id="habit-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="habit-name-input">Nome do Hábito *</label>
              <input
                type="text"
                id="habit-name-input"
                class="form-input"
                placeholder="Ex: Beber 2L de água, Leitura, Exercício..."
                value="${this.escapeHtml(initialName)}"
                required
                autocomplete="off"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Escolha um Ícone</label>
              <div class="habit-icon-picker">
                ${HABIT_DEFAULT_ICONS.map(icon => `
                  <button type="button" class="habit-icon-btn ${icon === initialIcon ? 'selected' : ''}" data-icon="${icon}">
                    ${icon}
                  </button>
                `).join('')}
              </div>
              <input type="hidden" id="habit-selected-icon" value="${initialIcon}" />
            </div>
          </div>

          <div class="modal-footer">
            ${habit ? `
              <button type="button" class="btn-danger" id="btn-delete-habit">Excluir Hábito</button>
            ` : '<div></div>'}

            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn-secondary" id="btn-habit-cancel">Cancelar</button>
              <button type="submit" class="btn-primary">${habit ? 'Salvar' : 'Criar Hábito'}</button>
            </div>
          </div>
        </form>
      </div>
    `;

    this.modalContainer.classList.add('open');

    // Modal listeners
    this.modalContainer.querySelector('#habit-modal-close').addEventListener('click', () => this.closeModal());
    this.modalContainer.querySelector('#btn-habit-cancel').addEventListener('click', () => this.closeModal());

    const iconInput = this.modalContainer.querySelector('#habit-selected-icon');
    this.modalContainer.querySelectorAll('.habit-icon-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.modalContainer.querySelectorAll('.habit-icon-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        iconInput.value = btn.dataset.icon;
      });
    });

    if (habit) {
      const delBtn = this.modalContainer.querySelector('#btn-delete-habit');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          if (confirm(`Deseja realmente excluir o hábito "${habit.name}"?`)) {
            store.deleteHabit(habit.id);
            this.closeModal();
          }
        });
      }
    }

    const form = this.modalContainer.querySelector('#habit-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.modalContainer.querySelector('#habit-name-input').value;
      const icon = iconInput.value || '🎯';

      if (!name.trim()) return;

      if (habit) {
        store.updateHabit(habit.id, { name, icon });
      } else {
        store.addHabit({ name, icon });
      }
      this.closeModal();
    });

    setTimeout(() => {
      const input = this.modalContainer.querySelector('#habit-name-input');
      if (input) input.focus();
    }, 50);
  },

  closeModal() {
    if (this.modalContainer) {
      this.modalContainer.classList.remove('open');
    }
    this.editingHabitId = null;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
