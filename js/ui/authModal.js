/**
 * @file authModal.js
 * Production-grade iOS Aqua Authentication Portal (UI/UX).
 * Split 2-pane layout in Desktop (Product Identity & Abstract Planner Preview + Auth Card).
 * Direct automatic gate on startup for unauthenticated users.
 * Supports "Manter conectado (Entrar automaticamente)" and Password Recovery.
 */

import { SupabaseService } from '../storage/supabaseService.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';

export const AuthModal = {
  container: null,
  activeTab: 'login', // 'login' | 'signup' | 'forgot'
  passwordVisible: false,

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

    // React to auth state changes:
    // If not authenticated, open login gate immediately.
    // If authenticated (auto-login), close gate immediately.
    store.subscribe((state) => {
      if (!state.isAuthenticated) {
        if (!this.isOpen()) {
          this.open('login');
        }
      } else {
        if (this.isOpen() && this.activeTab !== 'profile') {
          this.close();
        }
      }
    });

    // Check on startup: if not authenticated, display login gate immediately
    if (!store.isAuthenticated()) {
      this.open('login');
    }
  },

  isOpen() {
    return this.container && this.container.classList.contains('open');
  },

  open(tab = 'login') {
    this.activeTab = tab;
    this.passwordVisible = false;
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

    if (currentUser && this.activeTab === 'profile') {
      this.renderAuthenticatedProfile(currentUser, userProfile, isAdmin);
      return;
    }

    this.renderAuthenticationPortal();
  },

  renderAuthenticatedProfile(currentUser, userProfile, isAdmin) {
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
  },

  renderAuthenticationPortal() {
    const isSignUp = this.activeTab === 'signup';
    const isForgot = this.activeTab === 'forgot';

    this.container.innerHTML = `
      <div class="auth-portal-dialog aqua-glass" role="dialog" aria-modal="true">
        <!-- 1. Left Branding & Purpose Pane (Desktop) -->
        <div class="auth-branding-pane">
          <div class="auth-brand-top">
            <div class="app-logo-badge" style="width: 38px; height: 38px; box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4);">
              <svg class="app-logo-icon" style="width: 22px; height: 22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <h1 class="auth-brand-title">Organizador</h1>
              <span class="auth-brand-badge">Planner Semanal</span>
            </div>
          </div>

          <div class="auth-brand-middle">
            <h2 class="auth-hero-phrase">
              Sua rotina, seus hábitos e sua semana em perfeita harmonia.
            </h2>

            <!-- Abstract Visual Representation of the Weekly Board -->
            <div class="planner-abstract-preview" aria-hidden="true">
              <div class="abstract-col">
                <div class="abstract-day-header">Seg</div>
                <div class="abstract-card primary"></div>
                <div class="abstract-card green"></div>
              </div>
              <div class="abstract-col">
                <div class="abstract-day-header">Ter</div>
                <div class="abstract-card amber"></div>
                <div class="abstract-card"></div>
              </div>
              <div class="abstract-col today">
                <div class="abstract-day-header active">Qua</div>
                <div class="abstract-card primary"></div>
                <div class="abstract-card green"></div>
                <div class="abstract-card"></div>
              </div>
              <div class="abstract-col">
                <div class="abstract-day-header">Qui</div>
                <div class="abstract-card"></div>
                <div class="abstract-card green"></div>
              </div>
              <div class="abstract-col">
                <div class="abstract-day-header">Sex</div>
                <div class="abstract-card primary"></div>
              </div>
              <div class="abstract-col weekend">
                <div class="abstract-day-header">Sáb</div>
                <div class="abstract-card amber"></div>
              </div>
              <div class="abstract-col weekend">
                <div class="abstract-day-header">Dom</div>
                <div class="abstract-card green"></div>
              </div>
            </div>
          </div>

          <div class="auth-brand-footer">
            <div class="auth-pillar-item">
              <span class="pillar-icon">🎯</span>
              <span>Hábitos Diários</span>
            </div>
            <div class="auth-pillar-item">
              <span class="pillar-icon">🥗</span>
              <span>Plano Alimentar</span>
            </div>
            <div class="auth-pillar-item">
              <span class="pillar-icon">🔒</span>
              <span>100% Seguro</span>
            </div>
          </div>
        </div>

        <!-- 2. Right Authentication Form Pane -->
        <div class="auth-form-pane">
          <div class="auth-form-header">
            <!-- Mobile Brand Header (Visible only on mobile) -->
            <div class="auth-mobile-brand">
              <div class="app-logo-badge" style="width: 32px; height: 32px;">
                <svg class="app-logo-icon" style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <span class="app-title" style="font-size: 1.15rem;">Organizador</span>
            </div>

            <h2 class="auth-pane-title">
              ${isForgot ? 'Recuperar Senha' : isSignUp ? 'Criar sua conta' : 'Bem-vindo de volta'}
            </h2>
            <p class="auth-pane-subtitle">
              ${isForgot
                ? 'Digite seu e-mail para receber o link de redefinição.'
                : isSignUp
                ? 'Comece a organizar sua semana com foco e leveza.'
                : 'Acesse seu painel pessoal e planeje seus dias.'}
            </p>
          </div>

          ${!isForgot ? `
            <div class="view-switcher" style="width: 100%; margin-bottom: 18px;">
              <button type="button" class="view-btn ${!isSignUp ? 'active' : ''}" style="flex: 1;" id="tab-login">Entrar</button>
              <button type="button" class="view-btn ${isSignUp ? 'active' : ''}" style="flex: 1;" id="tab-signup">Criar Conta</button>
            </div>
          ` : ''}

          <div id="auth-error-msg" style="display: none; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.84rem; margin-bottom: 14px;"></div>
          <div id="auth-success-msg" style="display: none; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.84rem; margin-bottom: 14px;"></div>

          <form id="auth-form" style="display: flex; flex-direction: column; gap: 14px;">
            ${isSignUp ? `
              <div class="form-group">
                <label class="form-label" for="auth-name-input">Nome Completo</label>
                <input
                  type="text"
                  id="auth-name-input"
                  class="form-input"
                  placeholder="Como deseja ser chamado?"
                  required
                  maxlength="150"
                  autocomplete="name"
                />
              </div>
            ` : ''}

            <div class="form-group">
              <label class="form-label" for="auth-email-input">E-mail</label>
              <input
                type="email"
                id="auth-email-input"
                class="form-input"
                placeholder="seuemail@planner.com.br"
                required
                maxlength="255"
                autocomplete="email"
                inputmode="email"
              />
            </div>

            ${!isForgot ? `
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <label class="form-label" for="auth-password-input">Senha</label>
                  ${!isSignUp ? `
                    <button type="button" class="forgot-password-link" id="btn-open-forgot">Esqueceu a senha?</button>
                  ` : ''}
                </div>
                <div class="password-input-wrapper">
                  <input
                    type="${this.passwordVisible ? 'text' : 'password'}"
                    id="auth-password-input"
                    class="form-input"
                    placeholder="••••••••"
                    required
                    minlength="6"
                    autocomplete="${isSignUp ? 'new-password' : 'current-password'}"
                  />
                  <button type="button" class="password-toggle-btn" id="btn-toggle-password" title="${this.passwordVisible ? 'Ocultar senha' : 'Ver senha'}" aria-label="Alternar visibilidade da senha">
                    ${this.passwordVisible ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              ${!isSignUp ? `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: -4px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; user-select: none;">
                    <input type="checkbox" id="auth-remember-me" checked style="accent-color: var(--color-primary); width: 16px; height: 16px; border-radius: 4px; cursor: pointer;" />
                    <span>Lembrar de mim (Entrar automaticamente)</span>
                  </label>
                </div>
              ` : ''}
            ` : ''}

            <button type="submit" class="btn-primary auth-submit-btn" id="auth-submit-btn">
              ${isForgot ? 'Enviar Link de Recuperação' : isSignUp ? 'Criar Minha Conta' : 'Entrar no Sistema'}
            </button>

            ${isForgot ? `
              <button type="button" class="btn-secondary" id="btn-back-login" style="justify-content: center; margin-top: 4px; padding: 10px;">
                ← Voltar para o Login
              </button>
            ` : ''}
          </form>
        </div>
      </div>
    `;

    this.attachPortalEvents();
  },

  attachPortalEvents() {
    this.container.querySelector('#tab-login')?.addEventListener('click', () => {
      this.activeTab = 'login';
      this.render();
    });

    this.container.querySelector('#tab-signup')?.addEventListener('click', () => {
      this.activeTab = 'signup';
      this.render();
    });

    this.container.querySelector('#btn-open-forgot')?.addEventListener('click', () => {
      this.activeTab = 'forgot';
      this.render();
    });

    this.container.querySelector('#btn-back-login')?.addEventListener('click', () => {
      this.activeTab = 'login';
      this.render();
    });

    // Password Show/Hide Toggle
    const toggleBtn = this.container.querySelector('#btn-toggle-password');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.passwordVisible = !this.passwordVisible;
        const input = this.container.querySelector('#auth-password-input');
        if (input) {
          input.type = this.passwordVisible ? 'text' : 'password';
          toggleBtn.innerHTML = this.passwordVisible ? '🙈' : '👁️';
          toggleBtn.title = this.passwordVisible ? 'Ocultar senha' : 'Ver senha';
        }
      });
    }

    // Form Submission Handler
    const form = this.container.querySelector('#auth-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorDiv = this.container.querySelector('#auth-error-msg');
        const successDiv = this.container.querySelector('#auth-success-msg');
        errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';

        const email = this.container.querySelector('#auth-email-input').value;
        const passwordInput = this.container.querySelector('#auth-password-input');
        const password = passwordInput ? passwordInput.value : '';
        const nameInput = this.container.querySelector('#auth-name-input');
        const name = nameInput ? nameInput.value : '';

        const submitBtn = this.container.querySelector('#auth-submit-btn');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '🔄 Processando...';

        try {
          if (this.activeTab === 'forgot') {
            await SupabaseService.resetPassword(email);
            successDiv.textContent = '✔ Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.';
            successDiv.style.display = 'block';
          } else if (this.activeTab === 'signup') {
            await SupabaseService.createManagedUser({ email, password, name, role: 'member' });
            successDiv.textContent = '✔ Conta criada com sucesso! Você já pode entrar com suas credenciais.';
            successDiv.style.display = 'block';
            setTimeout(() => {
              this.activeTab = 'login';
              this.render();
            }, 1800);
          } else {
            await SupabaseService.signIn(email, password);
            await store.syncNow();
            this.close();
          }
        } catch (err) {
          console.error('Auth error:', err);
          let friendlyMsg = err.message || 'Erro ao autenticar.';
          if (err.message && err.message.includes('Invalid login credentials')) {
            friendlyMsg = 'E-mail ou senha incorretos. Verifique os dados digitados.';
          } else if (err.message && err.message.includes('Failed to fetch')) {
            friendlyMsg = 'Falha de conexão. Verifique sua conexão com a internet.';
          } else if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
            friendlyMsg = 'E-mail ainda não confirmado. Por favor, confirme seu cadastro para acessar.';
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
