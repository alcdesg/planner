/**
 * @file activityModal.js
 * Quick contextual activity creation and editing modal.
 */

import { CATEGORIES, RECURRENCE_TYPES, RECURRENCE_LABELS, DateUtils } from '../domain/models.js';
import { store } from '../state/store.js';

export const ActivityModal = {
  container: null,
  currentEditingId: null,

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
    const defaultDate = initialDate || DateUtils.formatDateKey(new Date());

    this.renderForm({
      title: '',
      date: defaultDate,
      time: '',
      category: 'trabalho',
      recurrence: RECURRENCE_TYPES.NONE
    }, false);

    this.show();
  },

  /**
   * Open modal for editing an existing activity
   * @param {string} activityId
   */
  openEdit(activityId) {
    const state = store.getState();
    const activity = state.activities.find(a => a.id === activityId);
    if (!activity) return;

    this.currentEditingId = activityId;
    this.renderForm(activity, true);
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

    this.container.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${isEdit ? 'Editar Atividade' : 'Nova Atividade'}</h2>
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
                placeholder="Ex: Reunião de equipe, Comprar mercado..."
                value="${this.escapeHtml(data.title || '')}"
                required
                autocomplete="off"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="activity-date-input" class="form-label">Data *</label>
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
                <label for="activity-recurrence-select" class="form-label">Recorrência</label>
                <select id="activity-recurrence-select" class="form-select">
                  ${recurrenceOptions}
                </select>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            ${isEdit ? `
              <button type="button" class="btn-danger" id="btn-delete-activity">Excluir</button>
            ` : '<div></div>'}

            <div style="display: flex; gap: var(--space-sm);">
              <button type="button" class="btn-secondary" id="btn-cancel-modal">Cancelar</button>
              <button type="submit" class="btn-primary">${isEdit ? 'Salvar Alterações' : 'Adicionar'}</button>
            </div>
          </div>
        </form>
      </div>
    `;

    // Attach listeners
    this.container.querySelector('#modal-close-btn').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-cancel-modal').addEventListener('click', () => this.close());

    if (isEdit) {
      const deleteBtn = this.container.querySelector('#btn-delete-activity');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (confirm('Deseja realmente excluir esta atividade?')) {
            store.deleteActivity(this.currentEditingId);
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
      const recurrence = this.container.querySelector('#activity-recurrence-select').value;

      if (!title.trim()) return;

      const payload = { title, date, time, category, recurrence };

      if (isEdit) {
        store.updateActivity(this.currentEditingId, payload);
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
