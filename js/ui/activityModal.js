/**
 * @file activityModal.js
 * Quick contextual activity creation and editing modal.
 * Supports Outlook-style custom weekday recurrence, optional end date limits,
 * and granular editing/deleting (Single occurrence vs Entire series).
 */

import { CATEGORIES, RECURRENCE_TYPES, RECURRENCE_LABELS, WEEKDAY_OPTIONS, DateUtils } from '../domain/models.js';
import { store } from '../state/store.js';

export const ActivityModal = {
  container: null,
  currentEditingId: null,
  currentOccurrenceDate: null,

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
    }, false);

    this.show();
  },

  /**
   * Open modal for editing an existing activity
   * @param {string} activityId
   * @param {string} occurrenceDate - YYYY-MM-DD
   */
  openEdit(activityId, occurrenceDate = null) {
    const state = store.getState();
    const activity = state.activities.find(a => a.id === activityId);
    if (!activity) return;

    this.currentEditingId = activityId;
    this.currentOccurrenceDate = occurrenceDate || activity.date;

    // If this occurrence has specific overrides, merge them for the form display
    const overrideData = (activity.overrides && activity.overrides[this.currentOccurrenceDate])
      ? activity.overrides[this.currentOccurrenceDate]
      : {};

    const formData = {
      ...activity,
      ...overrideData
    };

    this.renderForm(formData, true);
    this.show();
  },

  show() {
    if (this.container) {
      this.container.classList.add('open');
      // Focus title input immediately
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
  },

  renderForm(data, isEdit) {
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

    this.container.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <div style="display: flex; flex-direction: column;">
            <h2 class="modal-title" id="modal-title">${isEdit ? 'Editar Atividade' : 'Nova Atividade'}</h2>
            ${isEdit && isRecurring && this.currentOccurrenceDate ? `
              <span class="modal-subtitle">Ocorrência em: ${DateUtils.formatDateKey(this.currentOccurrenceDate)}</span>
            ` : ''}
          </div>
          <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Fechar">&times;</button>
        </div>

        <div id="modal-form-view">
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
                  <label for="activity-date-input" class="form-label">Data de início *</label>
                  <input
                    type="date"
                    id="activity-date-input"
                    class="form-input"
                    value="${data.date}"
                    required
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
                  <select id="activity-recurrence-select" class="form-select">
                    ${recurrenceOptions}
                  </select>
                </div>
              </div>

              <!-- Custom Days Selector (Outlook Style) -->
              <div class="form-group" id="custom-days-container" style="display: ${isCustomDays ? 'flex' : 'none'};">
                <label class="form-label">Repetir nos dias da semana:</label>
                <div class="recurrence-days-picker" id="recurrence-days-picker">
                  ${weekdayChipsHtml}
                </div>
              </div>

              <!-- Recurrence End Date (Optional) -->
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
            </div>

            <div class="modal-footer">
              ${isEdit ? `
                <button type="button" class="btn-danger" id="btn-delete-activity">Excluir</button>
              ` : '<div></div>'}

              <div style="display: flex; gap: var(--space-xs);">
                <button type="button" class="btn-secondary" id="btn-cancel-modal">Cancelar</button>
                <button type="submit" class="btn-primary">${isEdit ? 'Salvar' : 'Adicionar'}</button>
              </div>
            </div>
          </form>
        </div>

        <!-- Scope Decision Step (For recurring items) -->
        <div id="modal-scope-decision-view" style="display: none;">
          <div class="modal-body" style="text-align: center; padding: var(--space-lg) var(--space-md);">
            <div style="font-size: 1.8rem; margin-bottom: var(--space-xs);" id="scope-action-icon">🔁</div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: var(--space-2xs);" id="scope-action-title">Compromisso Recorrente</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-md);" id="scope-action-desc">
              Deseja aplicar esta alteração apenas nesta data ou em toda a série?
            </p>

            <div class="scope-options-group">
              <button type="button" class="scope-option-btn" id="btn-scope-this">
                <div style="font-weight: 700; color: var(--text-primary);">Apenas nesta ocorrência</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${this.currentOccurrenceDate ? DateUtils.formatDateKey(this.currentOccurrenceDate) : 'Este dia'}</div>
              </button>

              <button type="button" class="scope-option-btn" id="btn-scope-all">
                <div style="font-weight: 700; color: var(--text-primary);">Em toda a série de repetições</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">Aplica a todos os dias da repetição</div>
              </button>
            </div>
          </div>

          <div class="modal-footer" style="justify-content: flex-end;">
            <button type="button" class="btn-secondary" id="btn-back-from-scope">Voltar</button>
          </div>
        </div>
      </div>
    `;

    this.attachFormEvents(data, isEdit);
  },

  attachFormEvents(data, isEdit) {
    // Close & Cancel
    this.container.querySelector('#modal-close-btn').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-cancel-modal').addEventListener('click', () => this.close());

    // Toggle custom days and end date visibility
    const recurrenceSelect = this.container.querySelector('#activity-recurrence-select');
    const customDaysContainer = this.container.querySelector('#custom-days-container');
    const recurrenceEndContainer = this.container.querySelector('#recurrence-end-container');

    recurrenceSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const isCustom = val === RECURRENCE_TYPES.CUSTOM_DAYS;
      const hasRecurrence = val !== RECURRENCE_TYPES.NONE;

      customDaysContainer.style.display = isCustom ? 'flex' : 'none';
      recurrenceEndContainer.style.display = hasRecurrence ? 'flex' : 'none';
    });

    // Toggle Day Chips
    this.container.querySelectorAll('.day-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        chip.classList.toggle('selected');
        chip.setAttribute('aria-pressed', chip.classList.contains('selected'));
      });
    });

    const formView = this.container.querySelector('#modal-form-view');
    const scopeView = this.container.querySelector('#modal-scope-decision-view');
    const backBtn = this.container.querySelector('#btn-back-from-scope');

    backBtn.addEventListener('click', () => {
      scopeView.style.display = 'none';
      formView.style.display = 'block';
    });

    // Delete handling
    if (isEdit) {
      const deleteBtn = this.container.querySelector('#btn-delete-activity');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          const isRecurring = data.recurrence && data.recurrence !== RECURRENCE_TYPES.NONE;

          if (isRecurring && this.currentOccurrenceDate) {
            // Prompt scope for deletion
            this.showScopeDecision({
              title: 'Excluir compromisso recorrente',
              desc: 'Deseja excluir apenas esta data ou todas as repetições?',
              icon: '🗑️',
              onThis: () => {
                store.deleteActivity(this.currentEditingId, 'this', this.currentOccurrenceDate);
                this.close();
              },
              onAll: () => {
                store.deleteActivity(this.currentEditingId, 'all');
                this.close();
              }
            });
          } else {
            if (confirm('Deseja realmente excluir esta atividade?')) {
              store.deleteActivity(this.currentEditingId, 'all');
              this.close();
            }
          }
        });
      }
    }

    // Submit handling
    const form = this.container.querySelector('#activity-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = this.container.querySelector('#activity-title-input').value;
      const date = this.container.querySelector('#activity-date-input').value;
      const time = this.container.querySelector('#activity-time-input').value;
      const category = this.container.querySelector('#activity-category-select').value;
      const recurrence = this.container.querySelector('#activity-recurrence-select').value;
      const recurrenceEndDate = this.container.querySelector('#activity-end-date-input').value;

      if (!title.trim()) return;

      // Collect selected day chips
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

      const isRecurring = data.recurrence && data.recurrence !== RECURRENCE_TYPES.NONE;

      if (isEdit && isRecurring && this.currentOccurrenceDate) {
        // Prompt scope for update
        this.showScopeDecision({
          title: 'Salvar compromisso recorrente',
          desc: 'Deseja aplicar estas alterações apenas nesta data ou em toda a série?',
          icon: '✏️',
          onThis: () => {
            store.updateActivity(this.currentEditingId, payload, 'this', this.currentOccurrenceDate);
            this.close();
          },
          onAll: () => {
            store.updateActivity(this.currentEditingId, payload, 'all');
            this.close();
          }
        });
      } else if (isEdit) {
        store.updateActivity(this.currentEditingId, payload, 'all');
        this.close();
      } else {
        store.addActivity(payload);
        this.close();
      }
    });
  },

  showScopeDecision({ title, desc, icon, onThis, onAll }) {
    const formView = this.container.querySelector('#modal-form-view');
    const scopeView = this.container.querySelector('#modal-scope-decision-view');

    formView.style.display = 'none';
    scopeView.style.display = 'block';

    this.container.querySelector('#scope-action-title').textContent = title;
    this.container.querySelector('#scope-action-desc').textContent = desc;
    this.container.querySelector('#scope-action-icon').textContent = icon;

    const btnThis = this.container.querySelector('#btn-scope-this');
    const btnAll = this.container.querySelector('#btn-scope-all');

    // Replace click listeners cleanly
    const newBtnThis = btnThis.cloneNode(true);
    const newBtnAll = btnAll.cloneNode(true);
    btnThis.parentNode.replaceChild(newBtnThis, btnThis);
    btnAll.parentNode.replaceChild(newBtnAll, btnAll);

    newBtnThis.addEventListener('click', onThis);
    newBtnAll.addEventListener('click', onAll);
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
