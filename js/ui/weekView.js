/**
 * @file weekView.js
 * Weekly Board View controller.
 * Implements clean Weekly Board layout (vertical card stack with metadata badges, no rigid time grid).
 */

import { CATEGORIES, DateUtils, RECURRENCE_TYPES } from '../domain/models.js';
import { RecurrenceEngine } from '../domain/recurrence.js';
import { store } from '../state/store.js';
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

    // Mobile tabs HTML with activity counts
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
              <span>${shortName} ${dayNumber} ${isToday ? '•' : ''}</span>
              ${dayCount > 0 ? `<span class="tab-badge">${dayCount}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;

    // 7 Day Columns HTML (Unified vertical card stack as Weekly Board)
    const columnsHtml = weekDays.map((day, idx) => {
      const dateKey = DateUtils.formatDateKey(day);
      const isToday = DateUtils.isSameDay(day, todayDate);
      const shortName = DateUtils.dayNamesShort[idx];
      const dayNumber = day.getDate();
      const dayActivities = resolvedMap.get(dateKey) || [];

      const isMobileActive = idx === activeMobileDayIndex;

      return `
        <div class="day-column ${isToday ? 'today' : ''} ${isMobileActive ? 'mobile-active' : ''}" data-date="${dateKey}" data-index="${idx}">
          <div class="day-header">
            <div class="day-meta">
              <span class="day-name">${shortName}</span>
              <span class="day-number">${dayNumber}</span>
              ${isToday ? '<span class="today-indicator-pill">Hoje</span>' : ''}
            </div>
            <button type="button" class="day-add-icon-btn" data-add-date="${dateKey}" title="Adicionar atividade em ${shortName}" aria-label="Adicionar">+</button>
          </div>

          <div class="day-body">
            <div class="day-card-stack">
              ${dayActivities.length > 0 ? dayActivities.map(act => this.renderActivityCard(act, dateKey)).join('') : `
                <div class="day-empty-placeholder" data-add-date="${dateKey}">
                  <span>Sem atividades</span>
                </div>
              `}
            </div>

            <!-- Evident contextual Add button at footer of column -->
            <button type="button" class="day-add-footer-btn" data-add-date="${dateKey}">
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
    const category = CATEGORIES[activity.category] || CATEGORIES.outros;
    const isCompleted = !!activity.isCompleted;
    const isRecurring = activity.recurrence && activity.recurrence !== RECURRENCE_TYPES.NONE;

    return `
      <div class="activity-card ${isCompleted ? 'completed' : ''}" data-id="${activity.id}" data-occurrence-date="${dateKey}" tabindex="0" role="button" aria-label="${activity.title}">
        <div class="activity-card-header">
          <button type="button" class="activity-check-btn" data-check-id="${activity.id}" data-occurrence-date="${dateKey}" title="${isCompleted ? 'Desmarcar' : 'Concluir'}">
            ${isCompleted ? '✓' : ''}
          </button>
          <span class="activity-title">${this.escapeHtml(activity.title)}</span>
        </div>

        <div class="activity-meta">
          <span class="category-badge category-${category.id}">
            <span>${category.icon}</span>
            <span>${category.label}</span>
          </span>

          ${activity.time ? `
            <span class="time-badge">
              <span>🕒</span>
              <span>${activity.time}</span>
            </span>
          ` : ''}

          ${isRecurring ? `
            <span class="recurrence-badge" title="Recorrente">🔁</span>
          ` : ''}
        </div>
      </div>
    `;
  },

  attachEvents() {
    // Add buttons on day headers, placeholders, and footer buttons
    this.container.querySelectorAll('[data-add-date]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const date = e.currentTarget.dataset.addDate;
        ActivityModal.openNew(date);
      });
    });

    // Mobile tabs click
    this.container.querySelectorAll('.mobile-day-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.dayIndex, 10);
        store.setMobileDayIndex(idx);
      });
    });

    // Checkbox 1-click completion toggle
    this.container.querySelectorAll('.activity-check-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const id = e.currentTarget.dataset.checkId;
        const occurrenceDate = e.currentTarget.dataset.occurrenceDate;
        store.toggleActivityCompletion(id, occurrenceDate);
      });
    });

    // Card click opens edit modal
    this.container.querySelectorAll('.activity-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.activity-check-btn')) return;
        const id = card.dataset.id;
        ActivityModal.openEdit(id);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = card.dataset.id;
          ActivityModal.openEdit(id);
        }
      });
    });
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
