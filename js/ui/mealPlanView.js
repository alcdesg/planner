/**
 * @file mealPlanView.js
 * Weekly Meal Planner View Controller.
 * 7-day grid with checkboxes for each meal, quick week replication, and canonical DOM sanitization.
 */

import { DateUtils } from '../domain/models.js';
import { MEAL_TYPES, MealUtils } from '../domain/mealPlanModel.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';

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
        <div class="meals-header">
          <div class="meals-header-left">
            <h2 class="meals-title">🥗 Plano Alimentar Semanal</h2>
            <div class="meals-subtitle">Semana de ${Sanitizer.escape(DateUtils.formatWeekRange(currentMonday))}</div>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">
            Clique em qualquer refeição para editar ou marque o check conforme consumir.
          </div>
        </div>

        <div class="meals-grid">
          ${weekDays.map((day, idx) => {
            const dateKey = DateUtils.formatDateKey(day);
            const isToday = DateUtils.isSameDay(day, todayDate);
            const shortName = DateUtils.dayNamesShort[idx];
            const dayNumber = day.getDate();
            const dayMeals = MealUtils.getDayMeals(meals, dateKey);
            const safeDateKey = Sanitizer.escape(dateKey);
            const safeShortName = Sanitizer.escape(shortName);

            return `
              <div class="meal-day-column ${isToday ? 'today' : ''}" data-date="${safeDateKey}">
                <div class="meal-day-header">
                  <div class="meal-day-meta">
                    <span class="meal-day-name">${safeShortName}</span>
                    <span class="meal-day-num">${dayNumber}</span>
                    ${isToday ? '<span class="today-indicator-pill">Hoje</span>' : ''}
                  </div>
                </div>

                <div class="meal-day-body">
                  ${Object.values(MEAL_TYPES).map(type => {
                    const item = dayMeals[type.id] || { text: '', completed: false };
                    const hasText = !!item.text.trim();
                    const safeTypeId = Sanitizer.escape(type.id);
                    const safeText = Sanitizer.escape(item.text);

                    return `
                      <div class="meal-card ${item.completed ? 'completed' : ''}" data-edit-meal="${safeTypeId}" data-date="${safeDateKey}">
                        <div class="meal-card-top">
                          <button
                            type="button"
                            class="meal-check-btn ${item.completed ? 'checked' : ''}"
                            data-toggle-meal="${safeTypeId}"
                            data-date="${safeDateKey}"
                            title="${item.completed ? 'Desmarcar' : 'Marcar como consumido'}"
                          >
                            ${item.completed ? '✓' : ''}
                          </button>

                          <span class="meal-type-badge">
                            <span>${Sanitizer.escape(type.icon)}</span>
                            <span>${Sanitizer.escape(type.label)}</span>
                          </span>
                        </div>

                        <div class="meal-text ${hasText ? '' : 'placeholder'}">
                          ${hasText ? safeText : '+ Adicionar refeição'}
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
    this.container.querySelectorAll('[data-toggle-meal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mealType = e.currentTarget.dataset.toggleMeal;
        const dateKey = e.currentTarget.dataset.date;
        store.toggleMealComplete(dateKey, mealType);
      });
    });

    this.container.querySelectorAll('[data-edit-meal]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.meal-check-btn')) return;
        const mealType = card.dataset.editMeal;
        const dateKey = card.dataset.date;
        this.openMealModal(dateKey, mealType);
      });
    });
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

  openMealModal(dateKey, mealType) {
    this.currentEditDateKey = dateKey;
    this.currentEditMealType = mealType;

    const state = store.getState();
    const dayMeals = MealUtils.getDayMeals(state.meals, dateKey);
    const meal = dayMeals[mealType] || { text: '', completed: false };
    const typeDef = MEAL_TYPES[mealType] || { label: 'Refeição', icon: '🍽️' };

    const parsedDate = DateUtils.parseDateKey(dateKey);
    const formattedDate = parsedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    this.modalContainer.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 460px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">${Sanitizer.escape(typeDef.icon)}</span>
            <div>
              <h2 class="modal-title">${Sanitizer.escape(typeDef.label)}</h2>
              <span class="modal-subtitle">${Sanitizer.escape(formattedDate)}</span>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="meal-modal-close">&times;</button>
        </div>

        <form id="meal-edit-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="meal-text-input">O que você planeja comer nesta refeição?</label>
              <textarea
                id="meal-text-input"
                class="form-input"
                rows="4"
                placeholder="Ex: Ovos mexidos com torradas integrais e café com leite desnatado..."
                maxlength="255"
                style="resize: vertical; font-size: 0.9rem;"
              >${Sanitizer.escape(meal.text || '')}</textarea>
            </div>

            <div style="background: var(--bg-glass-pill); border-radius: var(--radius-md); padding: 10px; border: 1px solid var(--border-glass-subtle); margin-top: 4px;">
              <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">
                ⚡ Ações Rápidas de Planejamento:
              </div>
              <button type="button" class="btn-secondary" id="btn-replicate-meal" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 6px 12px;">
                🔁 Replicar este cardápio para toda a semana
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-danger" id="btn-clear-meal">Limpar Refeição</button>
            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn-secondary" id="btn-cancel-meal">Cancelar</button>
              <button type="submit" class="btn-primary">Salvar</button>
            </div>
          </div>
        </form>
      </div>
    `;

    this.attachModalEvents();
    this.modalContainer.classList.add('open');
    setTimeout(() => {
      this.modalContainer.querySelector('#meal-text-input')?.focus();
    }, 50);
  },

  closeModal() {
    if (this.modalContainer) {
      this.modalContainer.classList.remove('open');
      this.currentEditDateKey = null;
      this.currentEditMealType = null;
    }
  },

  attachModalEvents() {
    this.modalContainer.querySelector('#meal-modal-close')?.addEventListener('click', () => this.closeModal());
    this.modalContainer.querySelector('#btn-cancel-meal')?.addEventListener('click', () => this.closeModal());

    this.modalContainer.querySelector('#btn-clear-meal')?.addEventListener('click', () => {
      if (this.currentEditDateKey && this.currentEditMealType) {
        store.updateMeal(this.currentEditDateKey, this.currentEditMealType, '');
        this.closeModal();
      }
    });

    this.modalContainer.querySelector('#btn-replicate-meal')?.addEventListener('click', () => {
      const text = this.modalContainer.querySelector('#meal-text-input').value;
      if (!text.trim()) {
        alert('Digite uma descrição para a refeição antes de replicar.');
        return;
      }
      const state = store.getState();
      if (confirm(`Deseja aplicar esta refeição para todos os dias desta semana (${DateUtils.formatWeekRange(state.currentMonday)})?`)) {
        store.replicateMealToWeek(this.currentEditMealType, text, state.weekDays);
        this.closeModal();
      }
    });

    const form = this.modalContainer.querySelector('#meal-edit-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.modalContainer.querySelector('#meal-text-input').value;
      if (this.currentEditDateKey && this.currentEditMealType) {
        store.updateMeal(this.currentEditDateKey, this.currentEditMealType, text);
        this.closeModal();
      }
    });
  }
};
