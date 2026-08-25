/**
 * @file adminGovernanceModal.js
 * Admin-only Governance & User Access Management Modal.
 * Completely protected by database RLS and canonical DOM sanitization.
 */

import { store } from '../state/store.js';
import { SupabaseService } from '../storage/supabaseService.js';
import { Sanitizer } from '../utils/sanitizer.js';

export const AdminGovernanceModal = {
  container: null,
  usersList: [],

  init() {
    this.container = document.getElementById('governance-modal-container');
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

  async open() {
    if (!store.isAdmin()) {
      console.warn('Acesso negado: apenas administradores podem abrir o painel de governança.');
      return;
    }

    if (this.container) {
      this.container.classList.add('open');
      await this.loadAndRender();
    }
  },

  close() {
    if (this.container) {
      this.container.classList.remove('open');
    }
  },

  async loadAndRender() {
    try {
      this.container.innerHTML = `
        <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 620px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">👑</span>
              <div>
                <h2 class="modal-title">Governança & Gestão de Acessos</h2>
                <span class="modal-subtitle">Painel Master de Administração</span>
              </div>
            </div>
            <button type="button" class="modal-close-btn" id="gov-close-btn">&times;</button>
          </div>
          <div class="modal-body" style="padding: 30px; text-align: center;">
            <p style="color: var(--text-secondary);">Carregando usuários do banco de dados...</p>
          </div>
        </div>
      `;
      this.container.querySelector('#gov-close-btn').addEventListener('click', () => this.close());

      this.usersList = await SupabaseService.fetchAllProfiles();
      this.render();
    } catch (e) {
      console.error('Error loading governance users:', e);
      this.renderError(e.message);
    }
  },

  renderError(msg) {
    this.container.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 500px;">
        <div class="modal-header">
          <h2 class="modal-title">Governança</h2>
          <button type="button" class="modal-close-btn" id="gov-close-btn">&times;</button>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 12px; border-radius: var(--radius-sm); font-size: 0.85rem;">
            Erro ao carregar dados: ${Sanitizer.escape(msg)}
          </div>
        </div>
      </div>
    `;
    this.container.querySelector('#gov-close-btn').addEventListener('click', () => this.close());
  },

  render() {
    const adminCount = this.usersList.filter(u => u.role === 'admin').length;
    const memberCount = this.usersList.length - adminCount;

    this.container.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 620px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.3rem;">👑</span>
            <div>
              <h2 class="modal-title">Governança & Gestão de Acessos</h2>
              <span class="modal-subtitle">Painel Master de Administração</span>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="gov-close-btn">&times;</button>
        </div>

        <div class="modal-body" style="max-height: 80vh;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px;">
            <div style="background: var(--bg-glass-card); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle); text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary);">${this.usersList.length}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total Usuários</div>
            </div>
            <div style="background: var(--bg-glass-card); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle); text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 800; color: #f59e0b;">${adminCount}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Admins Master</div>
            </div>
            <div style="background: var(--bg-glass-card); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle); text-align: center;">
              <div style="font-size: 1.2rem; font-weight: 800; color: #10b981;">${memberCount}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Membros</div>
            </div>
          </div>

          <div style="margin-top: 8px;">
            <div style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 6px;">
              Usuários Cadastrados no Banco
            </div>

            <div style="background: var(--bg-glass-card); border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle); overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
                <thead>
                  <tr style="background: var(--bg-glass-pill); border-bottom: 1px solid var(--border-glass-subtle); text-align: left;">
                    <th style="padding: 8px 12px; font-weight: 700;">Nome & E-mail</th>
                    <th style="padding: 8px 12px; font-weight: 700; text-align: center;">Papel</th>
                    <th style="padding: 8px 12px; font-weight: 700; text-align: right;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.usersList.map(u => `
                    <tr style="border-bottom: 1px solid var(--border-glass-subtle);">
                      <td style="padding: 8px 12px;">
                        <div style="font-weight: 700; color: var(--text-primary);">${Sanitizer.escape(u.name || 'Sem nome')}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${Sanitizer.escape(u.email)}</div>
                      </td>
                      <td style="padding: 8px 12px; text-align: center;">
                        <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: var(--radius-full); ${u.role === 'admin' ? 'background: rgba(245, 158, 11, 0.2); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.4);' : 'background: rgba(59, 130, 246, 0.15); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.3);'}">
                          ${u.role === 'admin' ? '👑 Admin' : '👤 Membro'}
                        </span>
                      </td>
                      <td style="padding: 8px 12px; text-align: right;">
                        <span style="font-size: 0.75rem; color: #10b981; font-weight: 700;">🟢 Ativo</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div style="margin-top: 16px; border-top: 1px dashed var(--border-glass-subtle); padding-top: 14px;">
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
              ➕ Criar e Provisionar Novo Usuário
            </div>

            <form id="create-user-form" style="display: flex; flex-direction: column; gap: 8px;">
              <div id="create-user-feedback" style="display: none; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.8rem;"></div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="new-user-name">Nome Completo *</label>
                  <input type="text" id="new-user-name" class="form-input" placeholder="Ex: Roberto Silva" maxlength="150" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="new-user-role">Papel de Acesso</label>
                  <select id="new-user-role" class="form-select">
                    <option value="member">👤 Membro (Usuário Comum)</option>
                    <option value="admin">👑 Admin (Administrador Master)</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="new-user-email">E-mail de Acesso *</label>
                  <input type="email" id="new-user-email" class="form-input" placeholder="roberto@planner.com.br" maxlength="255" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="new-user-password">Senha Provisória *</label>
                  <input type="text" id="new-user-password" class="form-input" placeholder="Mínimo 6 caracteres" required minlength="6" />
                </div>
              </div>

              <button type="submit" class="btn-primary" style="margin-top: 4px; justify-content: center; padding: 8px;">
                Criar Acesso no Banco de Dados
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  },

  attachEvents() {
    this.container.querySelector('#gov-close-btn')?.addEventListener('click', () => this.close());

    const form = this.container.querySelector('#create-user-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const feedback = this.container.querySelector('#create-user-feedback');
        feedback.style.display = 'none';

        const name = this.container.querySelector('#new-user-name').value;
        const email = this.container.querySelector('#new-user-email').value;
        const password = this.container.querySelector('#new-user-password').value;
        const role = this.container.querySelector('#new-user-role').value;

        const btn = form.querySelector('button[type="submit"]');
        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '🔄 Provisionando...';

        try {
          await SupabaseService.createManagedUser({ name, email, password, role });
          feedback.style.background = 'rgba(16, 185, 129, 0.15)';
          feedback.style.border = '1px solid rgba(16, 185, 129, 0.3)';
          feedback.style.color = '#10b981';
          feedback.textContent = `✔ Usuário ${email} provisionado com sucesso com papel de ${role === 'admin' ? 'Admin' : 'Membro'}!`;
          feedback.style.display = 'block';

          form.reset();
          setTimeout(async () => {
            await this.loadAndRender();
          }, 1000);
        } catch (err) {
          console.error('Error creating user:', err);
          feedback.style.background = 'rgba(239, 68, 68, 0.15)';
          feedback.style.border = '1px solid rgba(239, 68, 68, 0.3)';
          feedback.style.color = '#ef4444';
          feedback.textContent = `Erro ao criar usuário: ${err.message || 'Falha na conexão.'}`;
          feedback.style.display = 'block';
        } finally {
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      });
    }
  }
};
