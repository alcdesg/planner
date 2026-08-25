/**
 * @file authModal.js
 * iOS Aqua Translucent Authentication and Supabase Setup Modal.
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

    if (currentUser) {
      // User is already logged in -> show Profile & Logout
      this.container.innerHTML = `
        <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 440px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">👤</span>
              <h2 class="modal-title">Sua Conta</h2>
            </div>
            <button type="button" class="modal-close-btn" id="auth-close-btn">&times;</button>
          </div>

          <div class="modal-body" style="text-align: center; padding: 24px 18px;">
            <div class="user-avatar-badge" style="width: 54px; height: 54px; font-size: 1.4rem; margin: 0 auto 12px auto; box-shadow: var(--shadow-md);">
              ${(currentUser.user_metadata?.name || currentUser.email || 'U').charAt(0).toUpperCase()}
            </div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">
              ${this.escapeHtml(currentUser.user_metadata?.name || 'Usuário')}
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
              ${this.escapeHtml(currentUser.email)}
            </p>

            <div style="background: var(--bg-surface-secondary); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default); text-align: left; font-size: 0.82rem; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: var(--text-muted);">Banco de Dados:</span>
                <span style="color: #10b981; font-weight: 700;">🟢 Conectado ao Supabase</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Segurança:</span>
                <span style="color: var(--text-primary); font-weight: 600;">Row Level Security (RLS)</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button type="button" class="btn-secondary" id="btn-reconfig-supabase">
                ⚙️ Alterar Credenciais do Supabase
              </button>
              <button type="button" class="btn-danger" id="btn-logout" style="width: 100%; justify-content: center; padding: 10px;">
                Sair da Conta (Logout)
              </button>
            </div>
          </div>
        </div>
      `;

      this.container.querySelector('#auth-close-btn').addEventListener('click', () => this.close());
      this.container.querySelector('#btn-reconfig-supabase').addEventListener('click', () => this.open('config'));
      this.container.querySelector('#btn-logout').addEventListener('click', async () => {
        await SupabaseService.signOut();
        await store.syncNow();
        this.close();
      });
      return;
    }

    // Not logged in or in config mode
    this.container.innerHTML = `
      <div class="modal-dialog aqua-glass" role="dialog" aria-modal="true" style="max-width: 460px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">🔐</span>
            <h2 class="modal-title">Acesso ao Organizador</h2>
          </div>
          <button type="button" class="modal-close-btn" id="auth-close-btn">&times;</button>
        </div>

        <div style="padding: 10px 18px 0 18px;">
          <div class="view-switcher" style="width: 100%;">
            <button type="button" class="view-btn ${this.activeTab === 'login' ? 'active' : ''}" style="flex: 1;" id="tab-login">Entrar</button>
            <button type="button" class="view-btn ${this.activeTab === 'signup' ? 'active' : ''}" style="flex: 1;" id="tab-signup">Criar Conta</button>
            <button type="button" class="view-btn ${this.activeTab === 'config' ? 'active' : ''}" style="flex: 1;" id="tab-config">⚙️ Supabase</button>
          </div>
        </div>

        <div class="modal-body">
          <div id="auth-error-msg" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 6px;"></div>

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
            Conecte seu Projeto Supabase
          </h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px;">
            Para autenticação real e banco PostgreSQL em nuvem, insira sua URL e Anon Key do Supabase.
          </p>
          <button type="button" class="btn-primary" id="btn-go-config" style="width: 100%; justify-content: center;">
            ⚙️ Inserir Credenciais do Supabase
          </button>
        </div>
      `;
    }

    const isSignUp = this.activeTab === 'signup';

    return `
      <form id="auth-credentials-form" style="display: flex; flex-direction: column; gap: 10px;">
        ${isSignUp ? `
          <div class="form-group">
            <label class="form-label" for="auth-name-input">Seu Nome *</label>
            <input type="text" id="auth-name-input" class="form-input" placeholder="Ex: Alcides" required />
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label" for="auth-email-input">E-mail *</label>
          <input type="email" id="auth-email-input" class="form-input" placeholder="seuemail@exemplo.com" required autocomplete="email" />
        </div>

        <div class="form-group">
          <label class="form-label" for="auth-password-input">Senha *</label>
          <input type="password" id="auth-password-input" class="form-input" placeholder="••••••••" required minlength="6" autocomplete="${isSignUp ? 'new-password' : 'current-password'}" />
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 10px; width: 100%; justify-content: center;">
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
            placeholder="https://xyzcompany.supabase.co"
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
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            required
            style="resize: vertical; font-family: monospace; font-size: 0.78rem;"
          >${this.escapeHtml(supabaseConfig.getAnonKey())}</textarea>
        </div>

        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
          💡 Encontre estes dados em: <em>Supabase Dashboard > Project Settings > API</em>.
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 10px; width: 100%; justify-content: center;">
          Salvar e Conectar ao Supabase
        </button>
      </form>
    `;
  },

  attachEvents() {
    this.container.querySelector('#auth-close-btn')?.addEventListener('click', () => this.close());

    // Tab switching
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

    // Handle Supabase Config Submit
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

    // Handle Login / SignUp Submit
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
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '🔄 Processando...';

        try {
          if (this.activeTab === 'signup') {
            await SupabaseService.signUp(email, password, name);
            alert('Conta criada com sucesso! Você já pode acessar.');
          } else {
            await SupabaseService.signIn(email, password);
          }
          await store.syncNow();
          this.close();
        } catch (err) {
          console.error('Auth error:', err);
          errorDiv.textContent = err.message || 'Erro ao autenticar. Verifique suas credenciais.';
          errorDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
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
