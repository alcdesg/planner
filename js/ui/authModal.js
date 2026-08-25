/**
 * @file authModal.js
 * Clean, production-grade iOS Aqua Authentication Gate.
 * Infrastructure configuration is strictly managed by runtime environment.
 * UI is exclusively dedicated to User Authentication (Login & Sign Up).
 */

import { SupabaseService } from '../storage/supabaseService.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';

export const AuthModal = {
  container: null,
  activeTab: 'login', // 'login' | 'signup'

  init() {
    this.container = document.getElementById('auth-modal-container');
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      // Allow closing ONLY if user is already authenticated
      if (e.target === this.container && store.isAuthenticated()) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen() && store.isAuthenticated()) {
        this.close();
      }
    });

    store.subscribe((state) => {
      if (!state.isAuthenticated && !this.isOpen()) {
        this.open('login');
      }
    });
  },

  isOpen() {
    return this.container && this.container.classList.contains('open');
  },

  open(tab = 'login') {
    this.activeTab = tab;
    this.render();
    if (this.container) {
      this.container.classList.add('open');
      setTimeout(() => {
        const input = this.container.querySelector('#auth-email-input') || this.container.querySelector('#auth-name-input');
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
    const currentUser = state.currentUser;
    const userProfile = state.userProfile;
    const isAdmin = state.isAdmin;

    if (currentUser) {
      // Authenticated Profile View (Account Settings & Logout)
      const userInitial = (userProfile?.name || currentUser.email || 'U').charAt(0).toUpperCase();

      this.container.innerHTML = `
        <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 420px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">👤</span>
              <h2 class="modal-title">Sua Conta</h2>
            </div>
            <button type="button" class="modal-close-btn" id="auth-close-btn">&times;</button>
          </div>

          <div class="modal-body" style="text-align: center; padding: 24px 18px;">
            <div class="user-avatar-badge" style="width: 56px; height: 56px; font-size: 1.5rem; margin: 0 auto 12px auto; box-shadow: var(--shadow-md);">
              ${Sanitizer.escape(userInitial)}
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 2px;">
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
                ${Sanitizer.escape(userProfile?.name || currentUser.email)}
              </h3>
              ${isAdmin ? '<span class="admin-role-badge">👑 Admin Master</span>' : '<span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); background: var(--bg-glass-pill); padding: 1px 7px; border-radius: var(--radius-full);">👤 Membro</span>'}
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 18px;">
              ${Sanitizer.escape(currentUser.email)}
            </p>

            <div style="background: var(--bg-glass-pill); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle); text-align: left; font-size: 0.8rem; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: var(--text-muted);">Status da Conta:</span>
                <span style="color: #10b981; font-weight: 700;">🟢 Ativo</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Nível de Permissão:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${isAdmin ? 'Administrador' : 'Membro'}</span>
              </div>
            </div>

            <button type="button" class="btn-danger" id="btn-logout" style="width: 100%; justify-content: center; padding: 10px;">
              Sair da Conta (Logout)
            </button>
          </div>
        </div>
      `;

      this.container.querySelector('#auth-close-btn')?.addEventListener('click', () => this.close());
      this.container.querySelector('#btn-logout')?.addEventListener('click', async () => {
        await SupabaseService.signOut();
        this.open('login');
      });
      return;
    }

    // Login Gate View (Strictly Authentication - Zero Infrastructure Configuration)
    const isSignUp = this.activeTab === 'signup';

    this.container.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 440px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="app-logo-badge" style="width: 28px; height: 28px;">
              <svg class="app-logo-icon" style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <h2 class="modal-title">Organizador Semanal</h2>
              <span class="modal-subtitle">${isSignUp ? 'Criar novo acesso' : 'Acesse seu painel'}</span>
            </div>
          </div>
        </div>

        <div style="padding: 12px 18px 0 18px;">
          <div class="view-switcher" style="width: 100%;">
            <button type="button" class="view-btn ${!isSignUp ? 'active' : ''}" style="flex: 1;" id="tab-login">Entrar</button>
            <button type="button" class="view-btn ${isSignUp ? 'active' : ''}" style="flex: 1;" id="tab-signup">Criar Conta</button>
          </div>
        </div>

        <div class="modal-body">
          <div id="auth-error-msg" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 8px;"></div>

          <form id="auth-credentials-form" style="display: flex; flex-direction: column; gap: 10px;">
            ${isSignUp ? `
              <div class="form-group">
                <label class="form-label" for="auth-name-input">Nome Completo *</label>
                <input
                  type="text"
                  id="auth-name-input"
                  class="form-input"
                  placeholder="Seu nome"
                  required
                  maxlength="150"
                  autocomplete="name"
                />
              </div>
            ` : ''}

            <div class="form-group">
              <label class="form-label" for="auth-email-input">E-mail *</label>
              <input
                type="email"
                id="auth-email-input"
                class="form-input"
                placeholder="seuemail@planner.com.br"
                required
                maxlength="255"
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password-input">Senha *</label>
              <input
                type="password"
                id="auth-password-input"
                class="form-input"
                placeholder="••••••••"
                required
                minlength="6"
                autocomplete="${isSignUp ? 'new-password' : 'current-password'}"
              />
            </div>

            <button type="submit" class="btn-primary" style="margin-top: 8px; padding: 10px; width: 100%; justify-content: center;">
              ${isSignUp ? 'Criar Minha Conta' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    `;

    this.attachEvents();
  },

  attachEvents() {
    this.container.querySelector('#tab-login')?.addEventListener('click', () => {
      this.activeTab = 'login';
      this.render();
    });

    this.container.querySelector('#tab-signup')?.addEventListener('click', () => {
      this.activeTab = 'signup';
      this.render();
    });

    const authForm = this.container.querySelector('#auth-credentials-form');
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = this.container.querySelector('#auth-error-msg');
        errorDiv.style.display = 'none';

        const email = this.container.querySelector('#auth-email-input').value;
        const password = this.container.querySelector('#auth-password-input').value;
        const nameInput = this.container.querySelector('#auth-name-input');
        const name = nameInput ? nameInput.value : '';

        const submitBtn = authForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '🔄 Processando...';

        try {
          if (this.activeTab === 'signup') {
            await SupabaseService.createManagedUser({ email, password, name, role: 'member' });
            alert('Conta criada com sucesso! Você já pode entrar com suas credenciais.');
            this.activeTab = 'login';
            this.render();
          } else {
            await SupabaseService.signIn(email, password);
            await store.syncNow();
            this.close();
          }
        } catch (err) {
          console.error('Auth error:', err);
          let friendlyMsg = err.message || 'Erro ao autenticar.';
          if (err.message && err.message.includes('Failed to fetch')) {
            friendlyMsg = 'Falha de conexão com a nuvem. Verifique sua conexão com a internet.';
          } else if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
            friendlyMsg = 'E-mail não confirmado. Entre em contato com o administrador ou valide seu e-mail.';
          }
          errorDiv.textContent = friendlyMsg;
          errorDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      });
    }
  }
};
