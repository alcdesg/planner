/**
 * @file activityModal.js
 * Quick contextual activity creation and editing modal.
 * Implements Outlook-style initial prompt for recurring items and attribute-safe DOM sanitization.
 */

import { CATEGORIES, RECURRENCE_TYPES, RECURRENCE_LABELS, WEEKDAY_OPTIONS, DateUtils } from '../domain/models.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';

export const ActivityModal = {
  container: null,
  currentEditingId: null,
  currentOccurrenceDate: null,
  currentEditScope: 'all', // 'this' | 'all'

  init() {
    this.container = document.getElementById('activity-modal-container');
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  },

  isOpen() {
    return this.container && this.container.classList.contains('open');
  },

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

  openEdit(activityId, occurrenceDate = null) {
    const state = store.getState();
    const activity = state.activities.find(a => a.id === activityId);
    if (!activity) return;

    this.currentEditingId = activityId;
    this.currentOccurrenceDate = occurrenceDate || activity.date;

    const isRecurring = activity.recurrence && activity.recurrence !== RECURRENCE_TYPES.NONE;

    if (isRecurring && this.currentOccurrenceDate) {
      this.renderOutlookPrompt(activity, this.currentOccurrenceDate);
      this.show();
    } else {
      this.currentEditScope = 'all';
      this.renderForm(activity, true, 'all');
      this.show();
    }
  },

  renderOutlookPrompt(activity, occurrenceDate) {
    const formattedDate = DateUtils.formatDateKey(occurrenceDate);

    this.container.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 420px;">
        <div class="modal-header">
          <h2 class="modal-title">Evento Recorrente</h2>
          <button type="button" class="modal-close-btn" id="outlook-prompt-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
            ${Sanitizer.escape(activity.title)}
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 18px;">
            Este compromisso faz parte de uma série recorrente. O que você deseja editar?
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button type="button" class="btn-primary" id="btn-scope-this" style="padding: 12px; justify-content: flex-start; text-align: left;">
              <span style="font-size: 1.2rem; margin-right: 8px;">📍</span>
              <div>
                <div style="font-weight: 700;">Apenas este evento (${Sanitizer.escape(formattedDate)})</div>
                <div style="font-size: 0.75rem; opacity: 0.85;">Altera somente a ocorrência deste dia</div>
              </div>
            </button>

            <button type="button" class="btn-secondary" id="btn-scope-all" style="padding: 12px; justify-content: flex-start; text-align: left;">
              <span style="font-size: 1.2rem; margin-right: 8px;">🔁</span>
              <div>
                <div style="font-weight: 700; color: var(--text-primary);">A série toda</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Altera o padrão para todos os dias da recorrência</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#outlook-prompt-close')?.addEventListener('click', () => this.close());

    this.container.querySelector('#btn-scope-this')?.addEventListener('click', () => {
      this.currentEditScope = 'this';
      const override = (activity.overrides && activity.overrides[occurrenceDate]) || {};
      const mergedActivity = {
        ...activity,
        title: override.title !== undefined ? override.title : activity.title,
        time: override.time !== undefined ? override.time : activity.time,
        category: override.category !== undefined ? override.category : activity.category,
        date: occurrenceDate
      };
      this.renderForm(mergedActivity, true, 'this');
    });

    this.container.querySelector('#btn-scope-all')?.addEventListener('click', () => {
      this.currentEditScope = 'all';
      this.renderForm(activity, true, 'all');
    });
  },

  renderForm(activity, isEditing, scope) {
    const isThisScope = scope === 'this';
    const isRecurring = activity.recurrence && activity.recurrence !== RECURRENCE_TYPES.NONE;

    const modalTitle = !isEditing
      ? 'Nova Atividade'
      : isThisScope
      ? `Editar Ocorrência (${Sanitizer.escape(this.currentOccurrenceDate)})`
      : 'Editar Série Completa';

    const selectedDays = activity.recurrenceDays || [];

    this.container.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">${Sanitizer.escape(modalTitle)}</h2>
            ${isThisScope ? '<span class="modal-subtitle">Alteração pontual de um único dia</span>' : ''}
          </div>
          <button type="button" class="modal-close-btn" id="activity-modal-close">&times;</button>
        </div>

        <form id="activity-form" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="activity-title-input">Título da Atividade *</label>
              <input
                type="text"
                id="activity-title-input"
                class="form-input"
                placeholder="Ex: Reunião de Diretoria, Treino, Pagar contas..."
                value="${Sanitizer.escape(activity.title || '')}"
                required
                maxlength="255"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="activity-date-input">Data *</label>
                <input
                  type="date"
                  id="activity-date-input"
                  class="form-input"
                  value="${Sanitizer.escape(activity.date)}"
                  ${isThisScope ? 'disabled' : ''}
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="activity-time-input">Horário (opcional)</label>
                <input
                  type="time"
                  id="activity-time-input"
                  class="form-input"
                  value="${Sanitizer.escape(activity.time || '')}"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="activity-category-select">Categoria</label>
              <select id="activity-category-select" class="form-select">
                ${Object.values(CATEGORIES).map(cat => `
                  <option value="${Sanitizer.escape(cat.id)}" ${activity.category === cat.id ? 'selected' : ''}>
                    ${Sanitizer.escape(cat.icon)} ${Sanitizer.escape(cat.label)}
                  </option>
                `).join('')}
              </select>
            </div>

            ${!isThisScope ? `
              <div class="form-group" style="margin-top: 4px;">
                <label class="form-label" for="activity-recurrence-select">Recorrência</label>
                <select id="activity-recurrence-select" class="form-select">
                  ${Object.entries(RECURRENCE_LABELS).map(([key, label]) => `
                    <option value="${Sanitizer.escape(key)}" ${activity.recurrence === key ? 'selected' : ''}>
                      ${Sanitizer.escape(label)}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group" id="custom-days-group" style="display: ${activity.recurrence === RECURRENCE_TYPES.CUSTOM_DAYS ? 'flex' : 'none'};">
                <label class="form-label">Repetir nos dias:</label>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${WEEKDAY_OPTIONS.map(opt => `
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-glass-subtle); background: var(--bg-glass-pill); cursor: pointer;">
                      <input type="checkbox" name="recurrenceDays" value="${opt.value}" ${selectedDays.includes(opt.value) ? 'checked' : ''} />
                      ${Sanitizer.escape(opt.label)}
                    </label>
                  `).join('')}
                </div>
              </div>

              <div class="form-group" id="recurrence-end-group" style="display: ${isRecurring ? 'flex' : 'none'};">
                <label class="form-label" for="activity-end-date-input">Repetir até (opcional)</label>
                <input
                  type="date"
                  id="activity-end-date-input"
                  class="form-input"
                  value="${Sanitizer.escape(activity.recurrenceEndDate || '')}"
                />
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            ${isEditing ? `
              <button type="button" class="btn-danger" id="btn-delete-activity">
                ${isThisScope ? 'Excluir Este Evento' : 'Excluir Série'}
              </button>
            ` : '<div></div>'}

            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn-secondary" id="btn-cancel-activity">Cancelar</button>
              <button type="submit" class="btn-primary">Salvar</button>
            </div>
          </div>
        </form>
      </div>
    `;

    this.attachFormEvents(activity, isEditing, scope);
  },

  attachFormEvents(activity, isEditing, scope) {
    this.container.querySelector('#activity-modal-close')?.addEventListener('click', () => this.close());
    this.container.querySelector('#btn-cancel-activity')?.addEventListener('click', () => this.close());

    const recurrenceSelect = this.container.querySelector('#activity-recurrence-select');
    const customDaysGroup = this.container.querySelector('#custom-days-group');
    const recurrenceEndGroup = this.container.querySelector('#recurrence-end-group');

    recurrenceSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (customDaysGroup) {
        customDaysGroup.style.display = val === RECURRENCE_TYPES.CUSTOM_DAYS ? 'flex' : 'none';
      }
      if (recurrenceEndGroup) {
        recurrenceEndGroup.style.display = val !== RECURRENCE_TYPES.NONE ? 'flex' : 'none';
      }
    });

    const deleteBtn = this.container.querySelector('#btn-delete-activity');
    deleteBtn?.addEventListener('click', () => {
      const confirmText = scope === 'this'
        ? `Excluir somente este evento em ${this.currentOccurrenceDate}?`
        : 'Excluir toda a série recorrente desta atividade?';

      if (confirm(confirmText)) {
        store.deleteActivity(activity.id, scope, this.currentOccurrenceDate);
        this.close();
      }
    });

    const form = this.container.querySelector('#activity-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = this.container.querySelector('#activity-title-input').value.trim();
      const date = this.container.querySelector('#activity-date-input')?.value || activity.date;
      const time = this.container.querySelector('#activity-time-input').value;
      const category = this.container.querySelector('#activity-category-select').value;

      if (!title || !date) return;

      if (scope === 'this') {
        store.updateActivity(activity.id, { title, time, category }, 'this', this.currentOccurrenceDate);
      } else {
        const recurrence = recurrenceSelect ? recurrenceSelect.value : RECURRENCE_TYPES.NONE;
        const recurrenceEndDate = this.container.querySelector('#activity-end-date-input')?.value || '';

        const recurrenceDays = [];
        if (recurrence === RECURRENCE_TYPES.CUSTOM_DAYS) {
          this.container.querySelectorAll('input[name="recurrenceDays"]:checked').forEach(cb => {
            recurrenceDays.push(parseInt(cb.value, 10));
          });
        }

        if (isEditing) {
          store.updateActivity(activity.id, {
            title, date, time, category, recurrence, recurrenceDays, recurrenceEndDate
          }, 'all');
        } else {
          store.addActivity({
            title, date, time, category, recurrence, recurrenceDays, recurrenceEndDate
          });
        }
      }

      this.close();
    });
  },

  show() {
    this.container.classList.add('open');
    setTimeout(() => {
      this.container.querySelector('#activity-title-input')?.focus();
    }, 50);
  },

  close() {
    if (this.container) {
      this.container.classList.remove('open');
      this.currentEditingId = null;
      this.currentOccurrenceDate = null;
      this.currentEditScope = 'all';
    }
  }
};
