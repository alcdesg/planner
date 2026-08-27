/**
 * @file weekView.js
 * Weekly Board View controller.
 * Implements clean Weekly Board layout, Drag & Drop, and attribute-safe DOM sanitization.
 */

import { CATEGORIES, DateUtils, RECURRENCE_TYPES } from '../domain/models.js';
import { RecurrenceEngine } from '../domain/recurrence.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';
import { ActivityModal } from './activityModal.js';

export const WeekView = {
  container: null,

  init() {
    this.container = document.getElementById('week-view-container');
    if (!this.container) return;

    store.subscribe((state) => {
      if (state.viewMode === 'week') {
        this.render(state);
      }
    });

    if (store.getState().viewMode === 'week') {
      this.render(store.getState());
    }
  },

  render(state) {
    if (!this.container) return;

    const { weekDays, activities, todayDate, activeMobileDayIndex } = state;
    const resolvedMap = RecurrenceEngine.resolveWeekActivities(activities, weekDays);

    const mobileTabsHtml = `
      <div class="mobile-day-tabs" id="mobile-day-tabs">
        ${weekDays.map((day, idx) => {
          const dateKey = DateUtils.formatDateKey(day);
          const isToday = DateUtils.isSameDay(day, todayDate);
          const shortName = DateUtils.dayNamesShort[idx];
          const dayNumber = day.getDate();
          const dayCount = (resolvedMap.get(dateKey) || []).length;

          return `
            <button type="button" class="mobile-day-tab ${idx === activeMobileDayIndex ? 'active' : ''}" data-day-index="${idx}">
              <span>${Sanitizer.escape(shortName)} ${dayNumber} ${isToday ? '•' : ''}</span>
              ${dayCount > 0 ? `<span class="tab-badge">${dayCount}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;

    const columnsHtml = weekDays.map((day, idx) => {
      const dateKey = DateUtils.formatDateKey(day);
      const isToday = DateUtils.isSameDay(day, todayDate);
      const shortName = DateUtils.dayNamesShort[idx];
      const dayNumber = day.getDate();
      const dayActivities = resolvedMap.get(dateKey) || [];
      const isMobileActive = idx === activeMobileDayIndex;

      return `
        <div class="day-column ${isToday ? 'today' : ''} ${isMobileActive ? 'mobile-active' : ''}" data-date="${Sanitizer.escape(dateKey)}" data-index="${idx}">
          <div class="day-header">
            <div class="day-meta">
              <span class="day-name">${Sanitizer.escape(shortName)}</span>
              <span class="day-number">${dayNumber}</span>
              ${isToday ? '<span class="today-indicator-pill">Hoje</span>' : ''}
            </div>
            <button type="button" class="day-add-icon-btn" data-add-date="${Sanitizer.escape(dateKey)}" title="Adicionar atividade em ${Sanitizer.escape(shortName)}" aria-label="Adicionar">+</button>
          </div>

          <div class="day-body">
            <div class="day-card-stack">
              ${dayActivities.length > 0 ? dayActivities.map(act => this.renderActivityCard(act, dateKey)).join('') : `
                <div class="day-empty-placeholder" data-add-date="${Sanitizer.escape(dateKey)}">
                  <span>Sem atividades</span>
                </div>
              `}
            </div>

            <button type="button" class="day-add-footer-btn" data-add-date="${Sanitizer.escape(dateKey)}">
              <span>+ Adicionar</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      ${mobileTabsHtml}
      <div class="week-grid">
        ${columnsHtml}
      </div>
    `;

    this.attachEvents();
  },

  renderActivityCard(activity, dateKey) {
    const category = store.getCategoryById(activity.category);
    const isCompleted = !!activity.isCompleted;
    const isRecurring = activity.recurrence && activity.recurrence !== RECURRENCE_TYPES.NONE;
    const isDraggable = !isRecurring;

    const safeTitle = Sanitizer.escape(activity.title);
    const safeId = Sanitizer.escape(activity.id);
    const safeDateKey = Sanitizer.escape(dateKey);

    return `
      <div
        class="activity-card ${isCompleted ? 'completed' : ''} ${isDraggable ? 'draggable-card' : ''}"
        data-id="${safeId}"
        data-occurrence-date="${safeDateKey}"
        tabindex="0"
        role="button"
        ${isDraggable ? 'draggable="true"' : ''}
        aria-label="${safeTitle}"
        title="${isDraggable ? 'Arraste para mover para outro dia' : ''}"
      >
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

  attachEvents() {
    this.container.querySelectorAll('[data-add-date]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const date = e.currentTarget.dataset.addDate;
        ActivityModal.openNew(date);
      });
    });

    this.container.querySelectorAll('.mobile-day-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.dayIndex, 10);
        store.setMobileDayIndex(idx);
      });
    });

    this.container.querySelectorAll('.activity-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.activity-check-btn')) return;
        const id = card.dataset.id;
        const occurrenceDate = card.dataset.occurrenceDate;
        ActivityModal.openEdit(id, occurrenceDate);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (e.target.closest('.activity-check-btn')) return;
          const id = card.dataset.id;
          const occurrenceDate = card.dataset.occurrenceDate;
          ActivityModal.openEdit(id, occurrenceDate);
        }
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

    this.initDragAndDrop();
  },

  initDragAndDrop() {
    const cards = this.container.querySelectorAll('.draggable-card');
    const dayColumns = this.container.querySelectorAll('.day-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const id = card.dataset.id;
        const occurrenceDate = card.dataset.occurrenceDate;
        e.dataTransfer.setData('text/plain', JSON.stringify({ id, originDate: occurrenceDate }));
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('is-dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        dayColumns.forEach(col => col.classList.remove('drag-over'));
      });
    });

    dayColumns.forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', (e) => {
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove('drag-over');
        }
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');

        try {
          const rawData = e.dataTransfer.getData('text/plain');
          if (!rawData) return;
          const { id, originDate } = JSON.parse(rawData);
          const targetDate = column.dataset.date;

          if (id && targetDate && originDate !== targetDate) {
            store.updateActivity(id, { date: targetDate });
          }
        } catch (err) {
          console.error('Drag and drop error:', err);
        }
      });
    });
  }
};
