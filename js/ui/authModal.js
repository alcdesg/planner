/**
 * @file authModal.js
 * Clean, secure iOS Aqua Authentication Gate and Supabase Setup Modal.
 * Zero hardcoded credentials or mock shortcuts.
 */

import { supabaseConfig } from '../config/supabaseClient.js';
import { SupabaseService } from '../storage/supabaseService.js';
import { store } from '../state/store.js';

export const AuthModal = {
  container: null,
  activeTab: 'login', // 'login' | 'signup' | 'config'

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
      if (supabaseConfig.isConfigured() && !state.isAuthenticated && !this.isOpen()) {
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
    }
  },

  close() {
    if (this.container) {
      this.container.classList.remove('open');
    }
  },

  render() {
    const state = store.getState();
    const isConfigured = supabaseConfig.isConfigured();
    const currentUser = state.currentUser;
    const userProfile = state.userProfile;
    const isAdmin = state.isAdmin;

    if (currentUser) {
      // Authenticated Profile View
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
              ${(userProfile?.name || currentUser.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 2px;">
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
                ${this.escapeHtml(userProfile?.name || currentUser.email)}
              </h3>
              ${isAdmin ? '<span class="admin-role-badge">👑 Admin Master</span>' : '<span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); background: var(--bg-glass-pill); padding: 1px 7px; border-radius: var(--radius-full);">👤 Membro</span>'}
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 18px;">
              ${this.escapeHtml(currentUser.email)}
            </p>

            <div style="background: var(--bg-glass-pill); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle); text-align: left; font-size: 0.8rem; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: var(--text-muted);">Banco de Dados:</span>
                <span style="color: #10b981; font-weight: 700;">🟢 Supabase PostgreSQL</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Segurança:</span>
                <span style="color: var(--text-primary); font-weight: 600;">Row Level Security (RLS) Ativo</span>
              </div>
            </div>

            <button type="button" class="btn-danger" id="btn-logout" style="width: 100%; justify-content: center; padding: 10px;">
              Sair da Conta (Logout)
            </button>
          </div>
        </div>
      `;

      this.container.querySelector('#auth-close-btn').addEventListener('click', () => this.close());
      this.container.querySelector('#btn-logout').addEventListener('click', async () => {
        await SupabaseService.signOut();
        this.open('login');
      });
      return;
    }

    // Login Gate View (Non-authenticated)
    this.container.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 440px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.3rem;">🔐</span>
            <h2 class="modal-title">Acesso ao Organizador</h2>
          </div>
          ${isConfigured ? '' : '<button type="button" class="modal-close-btn" id="auth-close-btn">&times;</button>'}
        </div>

        <div style="padding: 12px 18px 0 18px;">
          <div class="view-switcher" style="width: 100%;">
            <button type="button" class="view-btn ${this.activeTab === 'login' ? 'active' : ''}" style="flex: 1;" id="tab-login">Entrar</button>
            <button type="button" class="view-btn ${this.activeTab === 'signup' ? 'active' : ''}" style="flex: 1;" id="tab-signup">Criar Conta</button>
            <button type="button" class="view-btn ${this.activeTab === 'config' ? 'active' : ''}" style="flex: 1;" id="tab-config">⚙️ Conexão</button>
          </div>
        </div>

        <div class="modal-body">
          <div id="auth-error-msg" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 8px;"></div>

          ${this.activeTab === 'config' ? this.renderConfigForm() : this.renderAuthForm(isConfigured)}
        </div>
      </div>
    `;

    this.attachEvents();
  },

  renderAuthForm(isConfigured) {
    if (!isConfigured) {
      return `
        <div style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 2rem; margin-bottom: 8px;">⚡</div>
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
            Insira sua Anon Key do Supabase
          </h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px;">
            A URL do seu projeto já está pré-configurada (<code style="font-size: 0.75rem;">txumkevqlgjdyqqlmxlh.supabase.co</code>). Insira a Anon Key pública para conectar.
          </p>
          <button type="button" class="btn-primary" id="btn-go-config" style="width: 100%; justify-content: center;">
            ⚙️ Inserir Anon Key
          </button>
        </div>
      `;
    }

    const isSignUp = this.activeTab === 'signup';

    return `
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
              autocomplete="name"
            />
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label" for="auth-email-input">E-mail corporativo ou pessoal *</label>
          <input
            type="email"
            id="auth-email-input"
            class="form-input"
            placeholder="seuemail@planner.com.br"
            required
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
    `;
  },

  renderConfigForm() {
    return `
      <form id="supabase-config-form" style="display: flex; flex-direction: column; gap: 10px;">
        <div class="form-group">
          <label class="form-label" for="config-url-input">Project URL do Supabase *</label>
          <input
            type="url"
            id="config-url-input"
            class="form-input"
            placeholder="https://txumkevqlgjdyqqlmxlh.supabase.co"
            value="${this.escapeHtml(supabaseConfig.getUrl())}"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="config-key-input">Anon Public Key *</label>
          <textarea
            id="config-key-input"
            class="form-input"
            rows="3"
            placeholder="Cole a anon key pública do seu Supabase Dashboard..."
            required
            style="resize: vertical; font-family: monospace; font-size: 0.78rem;"
          >${this.escapeHtml(supabaseConfig.getAnonKey())}</textarea>
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 10px; width: 100%; justify-content: center;">
          Salvar e Conectar ao Supabase
        </button>
      </form>
    `;
  },

  attachEvents() {
    this.container.querySelector('#auth-close-btn')?.addEventListener('click', () => this.close());

    this.container.querySelector('#tab-login')?.addEventListener('click', () => {
      this.activeTab = 'login';
      this.render();
    });
    this.container.querySelector('#tab-signup')?.addEventListener('click', () => {
      this.activeTab = 'signup';
      this.render();
    });
    this.container.querySelector('#tab-config')?.addEventListener('click', () => {
      this.activeTab = 'config';
      this.render();
    });

    this.container.querySelector('#btn-go-config')?.addEventListener('click', () => {
      this.activeTab = 'config';
      this.render();
    });

    // Supabase Config Submit
    const configForm = this.container.querySelector('#supabase-config-form');
    if (configForm) {
      configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = this.container.querySelector('#config-url-input').value;
        const key = this.container.querySelector('#config-key-input').value;

        supabaseConfig.saveCredentials(url, key);
        await store.initAuth();
        this.activeTab = 'login';
        this.render();
      });
    }

    // Login / Sign Up Submit
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
            alert('Conta criada com sucesso! Você já pode entrar.');
            this.activeTab = 'login';
            this.render();
          } else {
            await SupabaseService.signIn(email, password);
            await store.syncNow();
            this.close();
          }
        } catch (err) {
          console.error('Auth error:', err);
          errorDiv.textContent = err.message || 'Erro ao autenticar. Verifique seu e-mail e senha.';
          errorDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      });
    }
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
