/**
 * @file activityModal.js
 * Quick contextual activity creation and editing modal.
 * Implements Outlook-style initial prompt for recurring items and compact, unclipped form layout.
 */

import { CATEGORIES, RECURRENCE_TYPES, RECURRENCE_LABELS, WEEKDAY_OPTIONS, DateUtils } from '../domain/models.js';
import { store } from '../state/store.js';

export const ActivityModal = {
  container: null,
  currentEditingId: null,
  currentOccurrenceDate: null,
  currentEditScope: 'all', // 'this' | 'all'

  init() {
    this.container = document.getElementById('activity-modal-container');
    if (!this.container) return;

    // Close on backdrop click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  },

  isOpen() {
    return this.container && this.container.classList.contains('open');
  },

  /**
   * Open modal for creating a new activity with contextual prefilled date
   * @param {string} initialDate - YYYY-MM-DD
   */
  openNew(initialDate = null) {
    this.currentEditingId = null;
    this.currentOccurrenceDate = null;
    this.currentEditScope = 'all';

    const defaultDate = initialDate || DateUtils.formatDateKey(new Date());
    const initialDayIndex = DateUtils.parseDateKey(defaultDate).getDay();

    this.renderForm({
      title: '',
      date: defaultDate,
      time: '',
      category: 'trabalho',
      recurrence: RECURRENCE_TYPES.NONE,
      recurrenceDays: [initialDayIndex],
      recurrenceEndDate: ''
    }, false, 'all');

    this.show();
  },

  /**
   * Open modal for editing an existing activity.
   * If activity is recurring, prompts the user first (Outlook style).
   * @param {string} activityId
   * @param {string} occurrenceDate - YYYY-MM-DD
   */
  openEdit(activityId, occurrenceDate = null) {
    const state = store.getState();
    const activity = state.activities.find(a => a.id === activityId);
    if (!activity) return;

    this.currentEditingId = activityId;
    this.currentOccurrenceDate = occurrenceDate || activity.date;

    const isRecurring = activity.recurrence && activity.recurrence !== RECURRENCE_TYPES.NONE;

    if (isRecurring && this.currentOccurrenceDate) {
      // Show initial Outlook-style decision dialog first
      this.renderOutlookPrompt(activity, this.currentOccurrenceDate);
      this.show();
    } else {
      // Non-recurring: open edit form directly
      this.currentEditScope = 'all';
      this.renderForm(activity, true, 'all');
      this.show();
    }
  },

  /**
   * Outlook-style initial prompt: "Deseja editar apenas este evento ou a série toda?"
   */
  renderOutlookPrompt(activity, occurrenceDate) {
    const formattedDate = DateUtils.formatDateKey(occurrenceDate);

    this.container.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width: 420px;">
        <div class="modal-header">
          <h2 class="modal-title">Item Recorrente</h2>
          <button type="button" class="modal-close-btn" id="prompt-close-btn">&times;</button>
        </div>

        <div class="modal-body" style="padding: 20px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔁</div>
          <p style="font-size: 0.95rem; color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">
            "${this.escapeHtml(activity.title)}"
          </p>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 18px;">
            Este compromisso é recorrente. O que você deseja editar?
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="prompt-choice-btn" id="btn-choice-this">
              <span style="font-size: 1.1rem;">📅</span>
              <div style="text-align: left;">
                <div style="font-weight: 700; color: var(--text-primary);">Apenas este evento</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${formattedDate}</div>
              </div>
            </button>

            <button type="button" class="prompt-choice-btn" id="btn-choice-all">
              <span style="font-size: 1.1rem;">🔁</span>
              <div style="text-align: left;">
                <div style="font-weight: 700; color: var(--text-primary);">A série toda</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Todos os dias da repetição</div>
              </div>
            </button>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: flex-end;">
          <button type="button" class="btn-secondary" id="btn-prompt-cancel">Cancelar</button>
        </div>
      </div>
    `;

    this.container.querySelector('#prompt-close-btn').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-prompt-cancel').addEventListener('click', () => this.close());

    this.container.querySelector('#btn-choice-this').addEventListener('click', () => {
      this.currentEditScope = 'this';
      const overrideData = (activity.overrides && activity.overrides[occurrenceDate])
        ? activity.overrides[occurrenceDate]
        : {};
      const formData = {
        ...activity,
        ...overrideData,
        date: occurrenceDate
      };
      this.renderForm(formData, true, 'this');
    });

    this.container.querySelector('#btn-choice-all').addEventListener('click', () => {
      this.currentEditScope = 'all';
      this.renderForm(activity, true, 'all');
    });
  },

  show() {
    if (this.container) {
      this.container.classList.add('open');
      setTimeout(() => {
        const titleInput = this.container.querySelector('#activity-title-input');
        if (titleInput) {
          titleInput.focus();
          titleInput.select();
        }
      }, 50);
    }
  },

  close() {
    if (this.container) {
      this.container.classList.remove('open');
    }
    this.currentEditingId = null;
    this.currentOccurrenceDate = null;
    this.currentEditScope = 'all';
  },

  renderForm(data, isEdit, editScope = 'all') {
    this.currentEditScope = editScope;

    const categoryOptions = Object.values(CATEGORIES).map(cat => `
      <option value="${cat.id}" ${data.category === cat.id ? 'selected' : ''}>
        ${cat.icon} ${cat.label}
      </option>
    `).join('');

    const recurrenceOptions = Object.entries(RECURRENCE_LABELS).map(([val, label]) => `
      <option value="${val}" ${data.recurrence === val ? 'selected' : ''}>
        ${label}
      </option>
    `).join('');

    const initialDays = Array.isArray(data.recurrenceDays) ? data.recurrenceDays : [];

    const weekdayChipsHtml = WEEKDAY_OPTIONS.map(opt => {
      const isSelected = initialDays.includes(opt.dayIndex);
      return `
        <button
          type="button"
          class="day-chip ${isSelected ? 'selected' : ''}"
          data-day-index="${opt.dayIndex}"
          title="${opt.fullLabel}"
          aria-pressed="${isSelected}"
        >
          ${opt.shortLabel}
        </button>
      `;
    }).join('');

    const isCustomDays = data.recurrence === RECURRENCE_TYPES.CUSTOM_DAYS;
    const isRecurring = data.recurrence && data.recurrence !== RECURRENCE_TYPES.NONE;
    const isEditingThisOnly = isEdit && editScope === 'this';

    this.container.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <div style="display: flex; flex-direction: column;">
            <h2 class="modal-title" id="modal-title">${isEdit ? 'Editar Atividade' : 'Nova Atividade'}</h2>
            ${isEditingThisOnly ? `
              <span class="modal-subtitle">📅 Editando apenas o dia: ${DateUtils.formatDateKey(data.date)}</span>
            ` : (isEdit && isRecurring ? `
              <span class="modal-subtitle">🔁 Editando a série toda</span>
            ` : '')}
          </div>
          <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Fechar">&times;</button>
        </div>

        <form id="activity-form">
          <div class="modal-body">
            <div class="form-group">
              <label for="activity-title-input" class="form-label">Título da atividade *</label>
              <input
                type="text"
                id="activity-title-input"
                class="form-input"
                placeholder="Ex: Reunião de equipe, Academia, Mercado..."
                value="${this.escapeHtml(data.title || '')}"
                required
                autocomplete="off"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="activity-date-input" class="form-label">${isEditingThisOnly ? 'Data do evento' : 'Data de início *'}</label>
                <input
                  type="date"
                  id="activity-date-input"
                  class="form-input"
                  value="${data.date}"
                  ${isEditingThisOnly ? 'readonly' : 'required'}
                />
              </div>

              <div class="form-group">
                <label for="activity-time-input" class="form-label">Horário (opcional)</label>
                <input
                  type="time"
                  id="activity-time-input"
                  class="form-input"
                  value="${data.time || ''}"
                  placeholder="Sem horário"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="activity-category-select" class="form-label">Categoria</label>
                <select id="activity-category-select" class="form-select">
                  ${categoryOptions}
                </select>
              </div>

              <div class="form-group">
                <label for="activity-recurrence-select" class="form-label">Repetição</label>
                <select id="activity-recurrence-select" class="form-select" ${isEditingThisOnly ? 'disabled' : ''}>
                  ${recurrenceOptions}
                </select>
              </div>
            </div>

            <!-- Custom Days Selector (Outlook Style) -->
            ${!isEditingThisOnly ? `
              <div class="form-group" id="custom-days-container" style="display: ${isCustomDays ? 'flex' : 'none'};">
                <label class="form-label">Repetir nos dias da semana:</label>
                <div class="recurrence-days-picker" id="recurrence-days-picker">
                  ${weekdayChipsHtml}
                </div>
              </div>

              <div class="form-group" id="recurrence-end-container" style="display: ${isRecurring ? 'flex' : 'none'};">
                <label for="activity-end-date-input" class="form-label">Repetir até (opcional / período final)</label>
                <input
                  type="date"
                  id="activity-end-date-input"
                  class="form-input"
                  value="${data.recurrenceEndDate || ''}"
                  placeholder="Indefinidamente"
                />
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            ${isEdit ? `
              <button type="button" class="btn-danger" id="btn-delete-activity">
                ${isEditingThisOnly ? 'Excluir Este Evento' : 'Excluir Série'}
              </button>
            ` : '<div></div>'}

            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn-secondary" id="btn-cancel-modal">Cancelar</button>
              <button type="submit" class="btn-primary">${isEdit ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </div>
        </form>
      </div>
    `;

    this.attachFormEvents(data, isEdit, editScope);
  },

  attachFormEvents(data, isEdit, editScope) {
    this.container.querySelector('#modal-close-btn').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-cancel-modal').addEventListener('click', () => this.close());

    const recurrenceSelect = this.container.querySelector('#activity-recurrence-select');
    const customDaysContainer = this.container.querySelector('#custom-days-container');
    const recurrenceEndContainer = this.container.querySelector('#recurrence-end-container');

    if (recurrenceSelect && customDaysContainer && recurrenceEndContainer) {
      recurrenceSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const isCustom = val === RECURRENCE_TYPES.CUSTOM_DAYS;
        const hasRecurrence = val !== RECURRENCE_TYPES.NONE;

        customDaysContainer.style.display = isCustom ? 'flex' : 'none';
        recurrenceEndContainer.style.display = hasRecurrence ? 'flex' : 'none';
      });
    }

    this.container.querySelectorAll('.day-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        chip.classList.toggle('selected');
        chip.setAttribute('aria-pressed', chip.classList.contains('selected'));
      });
    });

    if (isEdit) {
      const deleteBtn = this.container.querySelector('#btn-delete-activity');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          const msg = editScope === 'this'
            ? 'Deseja excluir apenas este evento?'
            : 'Deseja excluir toda a série desta atividade?';

          if (confirm(msg)) {
            if (editScope === 'this') {
              store.deleteActivity(this.currentEditingId, 'this', this.currentOccurrenceDate);
            } else {
              store.deleteActivity(this.currentEditingId, 'all');
            }
            this.close();
          }
        });
      }
    }

    const form = this.container.querySelector('#activity-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = this.container.querySelector('#activity-title-input').value;
      const date = this.container.querySelector('#activity-date-input').value;
      const time = this.container.querySelector('#activity-time-input').value;
      const category = this.container.querySelector('#activity-category-select').value;

      if (!title.trim()) return;

      if (isEdit && editScope === 'this') {
        // Save override only for this occurrence
        store.updateActivity(this.currentEditingId, { title, time, category }, 'this', this.currentOccurrenceDate);
        this.close();
        return;
      }

      const recurrence = recurrenceSelect ? recurrenceSelect.value : (data.recurrence || RECURRENCE_TYPES.NONE);
      const recurrenceEndDateInput = this.container.querySelector('#activity-end-date-input');
      const recurrenceEndDate = recurrenceEndDateInput ? recurrenceEndDateInput.value : '';

      const selectedDays = [];
      this.container.querySelectorAll('.day-chip.selected').forEach(chip => {
        selectedDays.push(parseInt(chip.dataset.dayIndex, 10));
      });

      if (recurrence === RECURRENCE_TYPES.CUSTOM_DAYS && selectedDays.length === 0) {
        const startDayIndex = DateUtils.parseDateKey(date).getDay();
        selectedDays.push(startDayIndex);
      }

      const payload = {
        title,
        date,
        time,
        category,
        recurrence,
        recurrenceDays: selectedDays,
        recurrenceEndDate: recurrenceEndDate || ''
      };

      if (isEdit) {
        store.updateActivity(this.currentEditingId, payload, 'all');
      } else {
        store.addActivity(payload);
      }

      this.close();
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
