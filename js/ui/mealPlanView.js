/**
 * @file mealPlanView.js
 * Weekly Meal Planner View Controller.
 * 7-day grid with checkboxes for each meal (Breakfast, Lunch, Snack, Dinner) and quick week replication.
 */

import { DateUtils } from '../domain/models.js';
import { MEAL_TYPES, MealUtils } from '../domain/mealPlanModel.js';
import { store } from '../state/store.js';

export const MealPlanView = {
  container: null,
  modalContainer: null,
  currentEditDateKey: null,
  currentEditMealType: null,

  init() {
    this.container = document.getElementById('meal-view-container');
    this.modalContainer = document.getElementById('meal-modal-container');
    if (!this.container) return;

    store.subscribe((state) => {
      if (state.viewMode === 'meals') {
        this.render(state);
      }
    });

    if (store.getState().viewMode === 'meals') {
      this.render(store.getState());
    }

    this.initModal();
  },

  render(state) {
    if (!this.container) return;

    const { weekDays, meals, todayDate, currentMonday } = state;

    this.container.innerHTML = `
      <div class="meals-view-container">
        <!-- Meals Header -->
        <div class="meals-header">
          <div class="meals-header-left">
            <h2 class="meals-title">🥗 Plano Alimentar Semanal</h2>
            <div class="meals-subtitle">Semana de ${DateUtils.formatWeekRange(currentMonday)}</div>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">
            Clique em qualquer refeição para editar ou marque o check conforme consumir.
          </div>
        </div>

        <!-- 7 Columns Weekly Meals Board -->
        <div class="meals-grid">
          ${weekDays.map((day, idx) => {
            const dateKey = DateUtils.formatDateKey(day);
            const isToday = DateUtils.isSameDay(day, todayDate);
            const shortName = DateUtils.dayNamesShort[idx];
            const dayNumber = day.getDate();
            const dayMeals = MealUtils.getDayMeals(meals, dateKey);

            return `
              <div class="meal-day-column ${isToday ? 'today' : ''}" data-date="${dateKey}">
                <div class="meal-day-header">
                  <div class="meal-day-meta">
                    <span class="meal-day-name">${shortName}</span>
                    <span class="meal-day-num">${dayNumber}</span>
                    ${isToday ? '<span class="today-indicator-pill">Hoje</span>' : ''}
                  </div>
                </div>

                <div class="meal-day-body">
                  ${Object.values(MEAL_TYPES).map(type => {
                    const item = dayMeals[type.id] || { text: '', completed: false };
                    const hasText = !!item.text.trim();

                    return `
                      <div class="meal-card ${item.completed ? 'completed' : ''}" data-edit-meal="${type.id}" data-date="${dateKey}">
                        <div class="meal-card-top">
                          <button
                            type="button"
                            class="meal-check-btn ${item.completed ? 'checked' : ''}"
                            data-toggle-meal="${type.id}"
                            data-date="${dateKey}"
                            title="${item.completed ? 'Desmarcar' : 'Marcar como consumido'}"
                          >
                            ${item.completed ? '✓' : ''}
                          </button>

                          <span class="meal-type-badge">
                            <span>${type.icon}</span>
                            <span>${type.label}</span>
                          </span>
                        </div>

                        <div class="meal-text ${hasText ? '' : 'placeholder'}">
                          ${hasText ? this.escapeHtml(item.text) : '+ Adicionar refeição'}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.attachEvents();
  },

  attachEvents() {
    // Checkbox toggle
    this.container.querySelectorAll('[data-toggle-meal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mealType = e.currentTarget.dataset.toggleMeal;
        const dateKey = e.currentTarget.dataset.date;
        store.toggleMealComplete(dateKey, mealType);
      });
    });

    // Card click opens edit modal
    this.container.querySelectorAll('[data-edit-meal]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.meal-check-btn')) return;
        const mealType = card.dataset.editMeal;
        const dateKey = card.dataset.date;
        this.openMealModal(dateKey, mealType);
      });
    });
  },

  /* ------------------------------------------------------------------------
     Meal Modal
     ------------------------------------------------------------------------ */
  initModal() {
    if (!this.modalContainer) return;
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) this.closeModal();
    });
  },

  openMealModal(dateKey, mealType) {
    this.currentEditDateKey = dateKey;
    this.currentEditMealType = mealType;

    const state = store.getState();
    const typeInfo = MEAL_TYPES[mealType] || MEAL_TYPES.lunch;
    const dayMeals = MealUtils.getDayMeals(state.meals, dateKey);
    const currentText = dayMeals[mealType]?.text || '';

    this.modalContainer.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width: 440px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.3rem;">${typeInfo.icon}</span>
            <div>
              <h2 class="modal-title">${typeInfo.label}</h2>
              <span class="modal-subtitle">${DateUtils.formatDateKey(dateKey)}</span>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="meal-modal-close">&times;</button>
        </div>

        <form id="meal-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="meal-menu-input">Cardápio / Alimentos planejados</label>
              <textarea
                id="meal-menu-input"
                class="form-input"
                rows="3"
                placeholder="Ex: Frango grelhado com arroz integral e salada de folhas..."
                style="resize: vertical;"
              >${this.escapeHtml(currentText)}</textarea>
            </div>

            <div style="border-top: 1px dashed var(--border-default); padding-top: 10px; margin-top: 4px;">
              <button type="button" class="btn-secondary" id="btn-replicate-week" style="width: 100%; justify-content: center; font-size: 0.82rem;">
                🔁 Replicar este cardápio para toda a semana
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btn-meal-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Salvar Cardápio</button>
          </div>
        </form>
      </div>
    `;

    this.modalContainer.classList.add('open');

    this.modalContainer.querySelector('#meal-modal-close').addEventListener('click', () => this.closeModal());
    this.modalContainer.querySelector('#btn-meal-cancel').addEventListener('click', () => this.closeModal());

    const textarea = this.modalContainer.querySelector('#meal-menu-input');

    // Replicate to entire week button
    this.modalContainer.querySelector('#btn-replicate-week').addEventListener('click', () => {
      const text = textarea.value;
      if (!text.trim()) {
        alert('Digite os alimentos da refeição antes de replicar.');
        return;
      }
      if (confirm(`Deseja definir "${text}" no ${typeInfo.label} de todos os 7 dias desta semana?`)) {
        store.replicateMealToWeek(mealType, text, store.getState().weekDays);
        this.closeModal();
      }
    });

    const form = this.modalContainer.querySelector('#meal-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = textarea.value;
      store.updateMeal(this.currentEditDateKey, this.currentEditMealType, text);
      this.closeModal();
    });

    setTimeout(() => {
      if (textarea) textarea.focus();
    }, 50);
  },

  closeModal() {
    if (this.modalContainer) {
      this.modalContainer.classList.remove('open');
    }
    this.currentEditDateKey = null;
    this.currentEditMealType = null;
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
