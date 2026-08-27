/**
 * @file activityModal.js
 * Quick contextual activity creation and editing modal.
 * Implements Outlook-style initial prompt for recurring items and attribute-safe DOM sanitization.
 */

import { CATEGORIES, RECURRENCE_TYPES, RECURRENCE_LABELS, WEEKDAY_OPTIONS, DateUtils, getAllCategories } from '../domain/models.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';

const POPULAR_EMOJIS = [
  '💼', '📚', '💻', '🎯', '🎨', '🏃', '🧘', '🚴',
  '✈️', '🐾', '🍕', '☕', '💡', '💰', '🛒', '🎵',
  '⭐', '🔥', '❤️', '⚡', '🏖️', '🎮', '🩺', '🚗'
];

export const ActivityModal = {
  container: null,
  currentEditingId: null,
  currentOccurrenceDate: null,
  currentEditScope: 'all', // 'this' | 'all'
  isCreatingCategory: false,
  selectedCategoryEmoji: '📌',

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
    this.isCreatingCategory = false;
    this.selectedCategoryEmoji = '📌';

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
    this.isCreatingCategory = false;
    this.selectedCategoryEmoji = '📌';

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
    const state = store.getState();
    const customCategories = state.customCategories || [];

    const modalTitle = !isEditing
      ? 'Nova Atividade'
      : isThisScope
      ? `Editar Ocorrência (${Sanitizer.escape(this.currentOccurrenceDate)})`
      : 'Editar Série Completa';

    const selectedDays = activity.recurrenceDays || [];
    const isCustomCatSelected = customCategories.some(c => c.id === activity.category);

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
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="form-label" for="activity-category-select" style="margin-bottom: 0;">Categoria</label>
                <button type="button" class="btn-ghost" id="btn-toggle-custom-category" style="font-size: 0.75rem; padding: 2px 6px; color: var(--color-primary);">
                  ➕ Nova Categoria
                </button>
              </div>

              <select id="activity-category-select" class="form-select">
                <optgroup label="Categorias Padrão">
                  ${Object.values(CATEGORIES).map(cat => `
                    <option value="${Sanitizer.escape(cat.id)}" ${activity.category === cat.id ? 'selected' : ''}>
                      ${Sanitizer.escape(cat.icon)} ${Sanitizer.escape(cat.label)}
                    </option>
                  `).join('')}
                </optgroup>

                ${customCategories.length > 0 ? `
                  <optgroup label="Minhas Categorias">
                    ${customCategories.map(cat => `
                      <option value="${Sanitizer.escape(cat.id)}" ${activity.category === cat.id ? 'selected' : ''}>
                        ${Sanitizer.escape(cat.icon || '📌')} ${Sanitizer.escape(cat.name)}
                      </option>
                    `).join('')}
                  </optgroup>
                ` : ''}

                <option value="__new_category__">➕ Criar nova categoria personalizada...</option>
              </select>

              <div id="custom-category-delete-wrap" style="display: ${isCustomCatSelected ? 'block' : 'none'}; margin-top: 4px; text-align: right;">
                <button type="button" id="btn-delete-current-custom-cat" class="btn-ghost" style="font-size: 0.72rem; color: var(--color-danger); padding: 2px 4px;">
                  🗑️ Excluir esta categoria personalizada
                </button>
              </div>

              <!-- Painel de Criação de Categoria Personalizada -->
              <div id="new-category-panel" class="custom-category-panel" style="display: none;">
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary);">
                  Criar Categoria Personalizada
                </div>

                <div class="form-group" style="margin-bottom: 6px;">
                  <input
                    type="text"
                    id="new-category-name-input"
                    class="form-input"
                    placeholder="Nome da categoria (ex: Faculdade, Finanças...)"
                    maxlength="50"
                  />
                </div>

                <div class="emoji-picker-container">
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Escolha ou digite um emoji:</div>
                  <div class="custom-emoji-preview-box">
                    <div class="custom-emoji-preview-badge" id="emoji-preview-display">📌</div>
                    <input
                      type="text"
                      id="custom-emoji-free-input"
                      class="form-input"
                      placeholder="Cole qualquer emoji..."
                      maxlength="10"
                      style="font-size: 0.9rem;"
                    />
                  </div>

                  <div class="emoji-picker-grid">
                    ${POPULAR_EMOJIS.map(emoji => `
                      <button type="button" class="emoji-btn" data-emoji="${emoji}">${emoji}</button>
                    `).join('')}
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                  <button type="button" class="btn-secondary" id="btn-cancel-new-cat" style="padding: 4px 10px; font-size: 0.78rem;">Cancelar</button>
                  <button type="button" class="btn-primary" id="btn-save-new-cat" style="padding: 4px 12px; font-size: 0.78rem;">Salvar Categoria</button>
                </div>
              </div>
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

    const categorySelect = this.container.querySelector('#activity-category-select');
    const newCategoryPanel = this.container.querySelector('#new-category-panel');
    const toggleNewCatBtn = this.container.querySelector('#btn-toggle-custom-category');
    const cancelNewCatBtn = this.container.querySelector('#btn-cancel-new-cat');
    const saveNewCatBtn = this.container.querySelector('#btn-save-new-cat');
    const deleteCatWrap = this.container.querySelector('#custom-category-delete-wrap');
    const deleteCurrentCatBtn = this.container.querySelector('#btn-delete-current-custom-cat');
    const emojiPreview = this.container.querySelector('#emoji-preview-display');
    const customEmojiInput = this.container.querySelector('#custom-emoji-free-input');
    const newCatNameInput = this.container.querySelector('#new-category-name-input');

    let currentSelectedEmoji = '📌';

    const updateDeleteBtnVisibility = () => {
      const selectedVal = categorySelect.value;
      const state = store.getState();
      const isCustom = (state.customCategories || []).some(c => c.id === selectedVal);
      if (deleteCatWrap) {
        deleteCatWrap.style.display = isCustom ? 'block' : 'none';
      }
    };

    categorySelect?.addEventListener('change', (e) => {
      if (e.target.value === '__new_category__') {
        newCategoryPanel.style.display = 'flex';
        newCatNameInput?.focus();
        categorySelect.value = activity.category || 'trabalho';
      } else {
        updateDeleteBtnVisibility();
      }
    });

    toggleNewCatBtn?.addEventListener('click', () => {
      newCategoryPanel.style.display = newCategoryPanel.style.display === 'none' ? 'flex' : 'none';
      if (newCategoryPanel.style.display === 'flex') {
        newCatNameInput?.focus();
      }
    });

    cancelNewCatBtn?.addEventListener('click', () => {
      newCategoryPanel.style.display = 'none';
      if (newCatNameInput) newCatNameInput.value = '';
    });

    // Emoji Grid Clicks
    this.container.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        currentSelectedEmoji = emoji;
        if (emojiPreview) emojiPreview.textContent = emoji;
        if (customEmojiInput) customEmojiInput.value = emoji;
        this.container.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Custom Emoji Free Input
    customEmojiInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        currentSelectedEmoji = val;
        if (emojiPreview) emojiPreview.textContent = val;
      }
    });

    // Save Custom Category Action
    saveNewCatBtn?.addEventListener('click', async () => {
      const name = newCatNameInput?.value?.trim();
      if (!name) {
        alert('Por favor, informe o nome da nova categoria.');
        newCatNameInput?.focus();
        return;
      }

      const newCat = await store.addCustomCategory({
        name,
        icon: currentSelectedEmoji || '📌'
      });

      if (newCat) {
        // Re-render form keeping typed values
        const currentTitle = this.container.querySelector('#activity-title-input')?.value || '';
        const currentDate = this.container.querySelector('#activity-date-input')?.value || activity.date;
        const currentTime = this.container.querySelector('#activity-time-input')?.value || '';
        this.renderForm({
          ...activity,
          title: currentTitle,
          date: currentDate,
          time: currentTime,
          category: newCat.id
        }, isEditing, scope);
      }
    });

    // Delete Custom Category Action
    deleteCurrentCatBtn?.addEventListener('click', async () => {
      const currentCatId = categorySelect.value;
      const state = store.getState();
      const cat = (state.customCategories || []).find(c => c.id === currentCatId);
      if (!cat) return;

      if (confirm(`Deseja excluir a categoria personalizada "${cat.name}"? As atividades existentes passarão a exibir "Outros".`)) {
        await store.deleteCustomCategory(currentCatId);
        // Re-render form with fallback category
        const currentTitle = this.container.querySelector('#activity-title-input')?.value || '';
        const currentDate = this.container.querySelector('#activity-date-input')?.value || activity.date;
        const currentTime = this.container.querySelector('#activity-time-input')?.value || '';
        this.renderForm({
          ...activity,
          title: currentTitle,
          date: currentDate,
          time: currentTime,
          category: 'outros'
        }, isEditing, scope);
      }
    });

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

