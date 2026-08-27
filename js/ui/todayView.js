/**
 * @file todayView.js
 * Today Focused View controller.
 * Concentrated clean daily view with attribute-safe DOM sanitization.
 */

import { CATEGORIES, DateUtils, RECURRENCE_TYPES } from '../domain/models.js';
import { RecurrenceEngine } from '../domain/recurrence.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';
import { ActivityModal } from './activityModal.js';

export const TodayView = {
  container: null,

  init() {
    this.container = document.getElementById('today-view-container');
    if (!this.container) return;

    store.subscribe((state) => {
      if (state.viewMode === 'today') {
        this.render(state);
      }
    });

    if (store.getState().viewMode === 'today') {
      this.render(store.getState());
    }
  },

  render(state) {
    if (!this.container) return;

    const { todayDate, activities } = state;
    const dateKey = DateUtils.formatDateKey(todayDate);

    const resolvedMap = RecurrenceEngine.resolveWeekActivities(activities, [todayDate]);
    const todayActivities = resolvedMap.get(dateKey) || [];

    const completedCount = todayActivities.filter(a => a.isCompleted).length;
    const totalCount = todayActivities.length;

    const dayNameFull = todayDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDayName = dayNameFull.charAt(0).toUpperCase() + dayNameFull.slice(1);
    const formattedDate = todayDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    this.container.innerHTML = `
      <div class="today-view-container">
        <div class="today-view-header">
          <div>
            <h2 class="today-view-title">${Sanitizer.escape(capitalizedDayName)}</h2>
            <div class="today-view-subtitle">${Sanitizer.escape(formattedDate)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-sm);">
            ${totalCount > 0 ? `
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-surface-secondary); padding: 4px 10px; border-radius: var(--radius-full); border: 1px solid var(--border-default);">
                ${completedCount} / ${totalCount} concluídas
              </span>
            ` : ''}
            <button type="button" class="btn-primary" id="btn-today-add">
              <span>+</span>
              <span>Adicionar Hoje</span>
            </button>
          </div>
        </div>

        <div class="today-block-card">
          <div class="day-card-stack">
            ${todayActivities.length > 0 ? todayActivities.map(act => this.renderCard(act, dateKey)).join('') : `
              <div class="day-empty-placeholder" id="today-empty-add-trigger">
                <span>Nenhuma atividade para hoje</span>
                <span style="font-size: 0.8rem; color: var(--color-primary); font-weight: 600;">+ Toque para adicionar</span>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    this.attachEvents(dateKey);
  },

  renderCard(activity, dateKey) {
    const category = store.getCategoryById(activity.category);
    const isCompleted = !!activity.isCompleted;
    const isRecurring = activity.recurrence && activity.recurrence !== RECURRENCE_TYPES.NONE;

    const safeTitle = Sanitizer.escape(activity.title);
    const safeId = Sanitizer.escape(activity.id);
    const safeDateKey = Sanitizer.escape(dateKey);

    return `
      <div class="activity-card ${isCompleted ? 'completed' : ''}" data-id="${safeId}" data-occurrence-date="${safeDateKey}" tabindex="0" role="button" aria-label="${safeTitle}">
        <div class="activity-card-header">
          <button type="button" class="activity-check-btn" data-check-id="${safeId}" data-occurrence-date="${safeDateKey}" title="${isCompleted ? 'Desmarcar' : 'Concluir'}">
            ${isCompleted ? '✓' : ''}
          </button>
          <span class="activity-title">${safeTitle}</span>
        </div>

        <div class="activity-meta">
          <span class="category-badge category-${Sanitizer.escape(category.id)}">
            <span>${Sanitizer.escape(category.icon)}</span>
            <span>${Sanitizer.escape(category.label)}</span>
          </span>

          ${activity.time ? `
            <span class="time-badge">
              <span>🕒</span>
              <span>${Sanitizer.escape(activity.time)}</span>
            </span>
          ` : ''}

          ${isRecurring ? `
            <span class="recurrence-badge" title="Recorrente ${activity.isOverridden ? '(modificado)' : ''}">
              🔁${activity.isOverridden ? '*' : ''}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  },

  attachEvents(dateKey) {
    this.container.querySelector('#btn-today-add')?.addEventListener('click', () => {
      ActivityModal.openNew(dateKey);
    });

    this.container.querySelector('#today-empty-add-trigger')?.addEventListener('click', () => {
      ActivityModal.openNew(dateKey);
    });

    this.container.querySelectorAll('.activity-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.activity-check-btn')) return;
        const id = card.dataset.id;
        const occurrenceDate = card.dataset.occurrenceDate;
        ActivityModal.openEdit(id, occurrenceDate);
      });
    });

    this.container.querySelectorAll('.activity-check-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.checkId;
        const occurrenceDate = btn.dataset.occurrenceDate;
        store.toggleActivityCompletion(id, occurrenceDate);
      });
    });
  }
};
