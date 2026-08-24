/**
 * @file userModal.js
 * User profile management modal (Create user, switch profile, clear activities, backup data).
 */

import { store } from '../state/store.js';
import { StorageService } from '../storage/storage.js';

export const UserModal = {
  container: null,

  init() {
    this.container = document.getElementById('user-modal-container');
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

  open() {
    this.render();
    if (this.container) {
      this.container.classList.add('open');
      setTimeout(() => {
        const input = this.container.querySelector('#new-user-name-input');
        if (input) input.focus();
      }, 50);
    }
  },

  close() {
    if (this.container) {
      this.container.classList.remove('open');
    }
  },

  render() {
    const state = store.getState();

    this.container.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">Configurações & Dados</h2>
          <button type="button" class="modal-close-btn" id="user-modal-close">&times;</button>
        </div>

        <div class="modal-body">
          <form id="create-user-form" style="display: flex; flex-direction: column; gap: var(--space-xs);">
            <label class="form-label" for="new-user-name-input">Adicionar Novo Perfil Local</label>
            <div style="display: flex; gap: var(--space-xs);">
              <input
                type="text"
                id="new-user-name-input"
                class="form-input"
                placeholder="Ex: Carlos, Mariana..."
                required
                style="flex: 1;"
              />
              <button type="submit" class="btn-primary" style="white-space: nowrap;">Adicionar</button>
            </div>
          </form>

          <div style="margin-top: var(--space-sm);">
            <label class="form-label" style="margin-bottom: var(--space-xs); display: block;">Perfis Disponíveis</label>
            <div style="display: flex; flex-direction: column; gap: var(--space-xs); max-height: 150px; overflow-y: auto;">
              ${state.users.map(u => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-xs) var(--space-sm); background-color: var(--bg-surface-secondary); border-radius: var(--radius-sm); border: 1px solid var(--border-default);">
                  <div style="display: flex; align-items: center; gap: var(--space-xs);">
                    <div class="user-avatar-badge">${u.avatarInitial}</div>
                    <span style="font-weight: ${u.id === state.activeUserId ? '700' : '500'}; color: var(--text-primary); font-size: 0.9rem;">
                      ${u.name} ${u.id === state.activeUserId ? '<span style="font-size: 0.75rem; color: var(--color-primary); margin-left: 4px;">(Ativo)</span>' : ''}
                    </span>
                  </div>
                  ${u.id !== state.activeUserId ? `
                    <button type="button" class="btn-secondary switch-user-action-btn" data-user-id="${u.id}" style="padding: 2px 8px; font-size: 0.75rem;">
                      Alternar
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Quick Data Reset -->
          <div style="border-top: 1px solid var(--border-default); padding-top: var(--space-sm); margin-top: var(--space-xs);">
            <label class="form-label" style="margin-bottom: var(--space-xs); display: block;">Limpeza de Atividades</label>
            <button type="button" class="btn-danger" id="btn-clear-user-activities" style="width: 100%; justify-content: center; border: 1px dashed rgba(239, 68, 68, 0.4);">
              🗑️ Limpar todas as atividades de "${state.activeUser ? state.activeUser.name : 'Perfil'}"
            </button>
          </div>

          <!-- Backup & Transfer -->
          <div style="border-top: 1px solid var(--border-default); padding-top: var(--space-sm); margin-top: var(--space-xs);">
            <label class="form-label" style="margin-bottom: var(--space-xs); display: block;">Backup & Transferência</label>
            <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
              <button type="button" class="btn-secondary" id="btn-export-backup" style="font-size: 0.8rem; flex: 1;">
                📥 Exportar JSON
              </button>
              <label class="btn-secondary" style="font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; flex: 1;">
                📤 Restaurar JSON
                <input type="file" id="input-import-backup" accept=".json" style="display: none;" />
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div></div>
          <button type="button" class="btn-secondary" id="btn-close-user-modal">Concluir</button>
        </div>
      </div>
    `;

    // Listeners
    this.container.querySelector('#user-modal-close').addEventListener('click', () => this.close());
    this.container.querySelector('#btn-close-user-modal').addEventListener('click', () => this.close());

    // Switch user buttons
    this.container.querySelectorAll('.switch-user-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.userId;
        store.switchUser(id);
        this.close();
      });
    });

    // Clear activities button
    const clearBtn = this.container.querySelector('#btn-clear-user-activities');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const userName = state.activeUser ? state.activeUser.name : 'este perfil';
        if (confirm(`Deseja realmente apagar todas as atividades de ${userName}? Essa ação deixará o quadro em branco.`)) {
          store.clearAllActivities();
          alert('Todas as atividades foram removidas.');
          this.close();
        }
      });
    }

    // Create user form
    const createForm = this.container.querySelector('#create-user-form');
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.container.querySelector('#new-user-name-input');
      if (input && input.value.trim()) {
        store.addUser(input.value.trim());
        this.close();
      }
    });

    // Backup export
    const exportBtn = this.container.querySelector('#btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = StorageService.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `organizador_semanal_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Backup import
    const importInput = this.container.querySelector('#input-import-backup');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const success = StorageService.importData(event.target.result);
          if (success) {
            alert('Backup restaurado com sucesso! A página será atualizada.');
            window.location.reload();
          } else {
            alert('Falha ao restaurar backup. Verifique o formato do arquivo.');
          }
        };
        reader.readAsText(file);
      });
    }
  }
};
