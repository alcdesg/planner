/**
 * @file habitTrackerView.js
 * Habit Tracker View Controller.
 * Supports Weekly matrix view (Mon-Sun) and Monthly matrix view with canonical DOM sanitization.
 */

import { DateUtils } from '../domain/models.js';
import { HabitUtils, HABIT_DEFAULT_ICONS } from '../domain/habitsModel.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';

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
        <div class="habits-header">
          <div class="habits-header-left">
            <h2 class="habits-title">🎯 Rastreador de Hábitos</h2>
            <div class="habits-subtitle">
              ${habitViewMode === 'week' ? `Semana de ${Sanitizer.escape(DateUtils.formatWeekRange(state.currentMonday))}` : Sanitizer.escape(currentMonthName)}
            </div>
          </div>

          <div class="habits-header-actions">
            <div class="view-switcher">
              <button type="button" class="view-btn ${habitViewMode === 'week' ? 'active' : ''}" data-habit-mode="week">Semana</button>
              <button type="button" class="view-btn ${habitViewMode === 'month' ? 'active' : ''}" data-habit-mode="month">Mês</button>
            </div>

            ${habitViewMode === 'month' ? `
              <div class="week-nav" style="margin-left: 8px;">
                <button type="button" class="nav-arrow-btn" id="btn-habit-prev-month" title="Mês anterior">‹</button>
                <span style="font-size: 0.85rem; font-weight: 600; padding: 0 8px;">${Sanitizer.escape(monthNames[habitMonthDate.getMonth()].slice(0, 3))}</span>
                <button type="button" class="nav-arrow-btn" id="btn-habit-next-month" title="Próximo mês">›</button>
              </div>
            ` : ''}

            <button type="button" class="btn-primary" id="btn-add-habit" style="margin-left: var(--space-xs);">
              <span>+</span>
              <span>Novo Hábito</span>
            </button>
          </div>
        </div>

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
                      <div>${Sanitizer.escape(shortName)}</div>
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
                const safeName = Sanitizer.escape(habit.name);
                const safeIcon = Sanitizer.escape(habit.icon || '🎯');
                const safeId = Sanitizer.escape(habit.id);

                return `
                  <tr class="habit-row" data-habit-id="${safeId}">
                    <td class="habit-name-cell" data-edit-habit="${safeId}" title="Clique para editar este hábito">
                      <span class="habit-icon">${safeIcon}</span>
                      <span class="habit-name">${safeName}</span>
                    </td>

                    ${weekDays.map(day => {
                      const key = DateUtils.formatDateKey(day);
                      const isToday = DateUtils.isSameDay(day, todayDate);
                      const isDone = HabitUtils.isCompletedOnDate(habit, key);
                      const safeKey = Sanitizer.escape(key);

                      return `
                        <td class="habit-check-cell ${isToday ? 'today-col' : ''}">
                          <button
                            type="button"
                            class="habit-check-btn ${isDone ? 'checked' : ''}"
                            data-toggle-habit="${safeId}"
                            data-date="${safeKey}"
                            title="${isDone ? 'Desmarcar' : 'Marcar como feito'} (${safeKey})"
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

  renderMonthlyView(habits, monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    return `
      <div class="habits-monthly-container">
        ${habits.map(habit => {
          const stats = HabitUtils.getMonthStats(habit, year, month);
          const safeName = Sanitizer.escape(habit.name);
          const safeIcon = Sanitizer.escape(habit.icon || '🎯');
          const safeId = Sanitizer.escape(habit.id);

          return `
            <div class="habit-month-card" data-habit-id="${safeId}">
              <div class="habit-month-header">
                <div class="habit-name-cell" data-edit-habit="${safeId}" style="cursor: pointer;">
                  <span class="habit-icon">${safeIcon}</span>
                  <span class="habit-name">${safeName}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="habit-consistency-badge">
                    ${stats.percentage}% consistência (${stats.completedCount}/${daysInMonth} dias)
                  </span>
                </div>
              </div>

              <div class="habit-month-grid">
                ${Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isDone = HabitUtils.isCompletedOnDate(habit, dateKey);
                  const isToday = DateUtils.isSameDay(new Date(year, month, dayNum), today);
                  const safeDateKey = Sanitizer.escape(dateKey);

                  return `
                    <button
                      type="button"
                      class="habit-month-day-btn ${isDone ? 'active' : ''} ${isToday ? 'is-today' : ''}"
                      data-toggle-habit="${safeId}"
                      data-date="${safeDateKey}"
                      title="${dayNum} - ${isDone ? 'Concluído' : 'Não feito'}"
                    >
                      ${dayNum}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  initModal() {
    if (!this.modalContainer) return;

    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) {
        this.closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    });
  },

  isModalOpen() {
    return this.modalContainer && this.modalContainer.classList.contains('open');
  },

  openModal(habitId = null) {
    this.editingHabitId = habitId;
    const state = store.getState();
    const habit = habitId ? state.habits.find(h => h.id === habitId) : null;

    const initialName = habit ? habit.name : '';
    const initialIcon = habit ? habit.icon : '🎯';
    const initialTarget = habit ? habit.targetDays : 7;

    this.modalContainer.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 440px;">
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
                placeholder="Ex: Ler 15 páginas, Meditar, Beber 2L de água..."
                value="${Sanitizer.escape(initialName)}"
                required
                maxlength="150"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Ícone / Emoji Representativo</label>
              <div class="habit-icon-picker">
                ${HABIT_DEFAULT_ICONS.map(icon => `
                  <button
                    type="button"
                    class="habit-icon-btn ${icon === initialIcon ? 'selected' : ''}"
                    data-icon="${Sanitizer.escape(icon)}"
                  >
                    ${Sanitizer.escape(icon)}
                  </button>
                `).join('')}
              </div>
              <input type="hidden" id="habit-icon-hidden" value="${Sanitizer.escape(initialIcon)}" />
            </div>

            <div class="form-group">
              <label class="form-label" for="habit-target-input">Meta Semanal (dias por semana)</label>
              <select id="habit-target-input" class="form-select">
                <option value="7" ${initialTarget === 7 ? 'selected' : ''}>Todos os dias (7 dias)</option>
                <option value="6" ${initialTarget === 6 ? 'selected' : ''}>6 dias por semana</option>
                <option value="5" ${initialTarget === 5 ? 'selected' : ''}>Dias úteis (5 dias)</option>
                <option value="4" ${initialTarget === 4 ? 'selected' : ''}>4 dias por semana</option>
                <option value="3" ${initialTarget === 3 ? 'selected' : ''}>3 dias por semana</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            ${habit ? `
              <button type="button" class="btn-danger" id="btn-delete-habit">Excluir Hábito</button>
            ` : '<div></div>'}
            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn-secondary" id="btn-cancel-habit">Cancelar</button>
              <button type="submit" class="btn-primary">Salvar Hábito</button>
            </div>
          </div>
        </form>
      </div>
    `;

    this.attachModalEvents(habit);
    this.modalContainer.classList.add('open');
    setTimeout(() => {
      this.modalContainer.querySelector('#habit-name-input')?.focus();
    }, 50);
  },

  closeModal() {
    if (this.modalContainer) {
      this.modalContainer.classList.remove('open');
      this.editingHabitId = null;
    }
  },

  attachModalEvents(habit) {
    this.modalContainer.querySelector('#habit-modal-close')?.addEventListener('click', () => this.closeModal());
    this.modalContainer.querySelector('#btn-cancel-habit')?.addEventListener('click', () => this.closeModal());

    const iconInput = this.modalContainer.querySelector('#habit-icon-hidden');
    this.modalContainer.querySelectorAll('.habit-icon-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.modalContainer.querySelectorAll('.habit-icon-btn').forEach(b => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        if (iconInput) iconInput.value = e.currentTarget.dataset.icon;
      });
    });

    if (habit) {
      this.modalContainer.querySelector('#btn-delete-habit')?.addEventListener('click', () => {
        if (confirm(`Deseja realmente excluir o hábito "${habit.name}"?`)) {
          store.deleteHabit(habit.id);
          this.closeModal();
        }
      });
    }

    const form = this.modalContainer.querySelector('#habit-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.modalContainer.querySelector('#habit-name-input').value.trim();
      const icon = iconInput.value || '🎯';
      const targetDays = parseInt(this.modalContainer.querySelector('#habit-target-input').value, 10) || 7;

      if (!name) return;

      if (this.editingHabitId) {
        store.updateHabit(this.editingHabitId, { name, icon, targetDays });
      } else {
        store.addHabit({ name, icon, targetDays });
      }
      this.closeModal();
    });
  },

  attachEvents() {
    this.container.querySelectorAll('[data-habit-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.habitMode;
        store.setHabitViewMode(mode);
      });
    });

    this.container.querySelector('#btn-habit-prev-month')?.addEventListener('click', () => store.prevHabitMonth());
    this.container.querySelector('#btn-habit-next-month')?.addEventListener('click', () => store.nextHabitMonth());

    this.container.querySelector('#btn-add-habit')?.addEventListener('click', () => this.openModal());
    this.container.querySelector('#btn-empty-add-habit')?.addEventListener('click', () => this.openModal());

    this.container.querySelectorAll('[data-edit-habit]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.editHabit;
        this.openModal(id);
      });
    });

    this.container.querySelectorAll('[data-toggle-habit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.toggleHabit;
        const date = e.currentTarget.dataset.date;
        store.toggleHabitDate(id, date);
      });
    });
  }
};
