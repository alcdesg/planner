/**
 * @file header.js
 * App header controller with iOS Aqua aesthetics, Live Database Sync button, Supabase Auth,
 * and RBAC protection with canonical DOM sanitization.
 */

import { DateUtils } from '../domain/models.js';
import { store } from '../state/store.js';
import { Sanitizer } from '../utils/sanitizer.js';
import { ActivityModal } from './activityModal.js';
import { AuthModal } from './authModal.js';
import { AdminGovernanceModal } from './adminGovernanceModal.js';

export const HeaderView = {
  container: null,

  init() {
    this.container = document.getElementById('app-header');
    if (!this.container) return;

    store.subscribe((state) => this.render(state));
    this.render(store.getState());
  },

  render(state) {
    const { currentUser, userProfile, isAdmin, syncStatus, syncErrorMessage, isSupabaseConnected, currentMonday, viewMode, theme } = state;
    const weekRangeText = DateUtils.formatWeekRange(currentMonday);

    const themeIcons = {
      light: '☀️',
      dark: '🌙',
      system: '💻'
    };

    const isSyncing = syncStatus === 'syncing';
    const isError = syncStatus === 'error';

    const syncLabel = isSyncing
      ? 'Sincronizando...'
      : isError
      ? (syncErrorMessage ? `Erro: ${syncErrorMessage}` : 'Erro ao sincronizar')
      : 'Sincronizado';

    const syncDotColor = isSyncing
      ? 'var(--color-primary)'
      : isError
      ? '#ef4444'
      : '#10b981';

    const rawDisplayName = userProfile?.name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Entrar';
    const userDisplayName = Sanitizer.escape(rawDisplayName);

    const userInitial = currentUser
      ? userDisplayName.charAt(0).toUpperCase()
      : '👤';

    this.container.innerHTML = `
      <div class="header-left">
        <div class="app-branding">
          <div class="app-logo-badge">
            <svg class="app-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div style="display: flex; align-items: baseline; gap: 6px;">
            <span class="app-title">Organizador</span>
            ${isAdmin ? `
              <span class="admin-role-badge" title="Usuário Administrador Master">👑 Admin</span>
            ` : ''}
          </div>
        </div>

        <div class="week-nav aqua-pill">
          <button type="button" class="nav-btn today-btn" id="btn-nav-today">Hoje</button>
          <button type="button" class="nav-arrow-btn" id="btn-nav-prev" title="Semana anterior" aria-label="Semana anterior">‹</button>
          <span class="current-range-display" id="week-range-text">${Sanitizer.escape(weekRangeText)}</span>
          <button type="button" class="nav-arrow-btn" id="btn-nav-next" title="Próxima semana" aria-label="Próxima semana">›</button>
        </div>
      </div>

      <div class="header-right">
        <div class="view-switcher aqua-pill">
          <button type="button" class="view-btn ${viewMode === 'week' ? 'active' : ''}" data-view="week" title="Quadro Semanal">
            <span>📅</span>
            <span>Quadro</span>
          </button>
          <button type="button" class="view-btn ${viewMode === 'habits' ? 'active' : ''}" data-view="habits" title="Rastreador de Hábitos">
            <span>🎯</span>
            <span>Hábitos</span>
          </button>
          <button type="button" class="view-btn ${viewMode === 'meals' ? 'active' : ''}" data-view="meals" title="Plano Alimentar Semanal">
            <span>🥗</span>
            <span>Alimentação</span>
          </button>
        </div>

        <button type="button" class="sync-status-btn aqua-pill ${isSyncing ? 'is-syncing' : ''}" id="btn-sync-now" title="Clique para sincronizar com o Supabase sob demanda">
          <span class="sync-dot" style="background-color: ${syncDotColor};"></span>
          <span class="sync-text">${isSyncing ? '🔄' : ''} ${Sanitizer.escape(syncLabel)}</span>
        </button>

        ${isAdmin ? `
          <button type="button" class="governance-btn aqua-pill" id="btn-open-governance" title="Painel de Governança & Usuários (Admin Master)">
            <span>👑</span>
            <span>Governança</span>
          </button>
        ` : ''}

        <button type="button" class="user-selector-btn aqua-pill" id="btn-auth-profile" title="${currentUser ? 'Sua Conta: ' + Sanitizer.escape(currentUser.email) : 'Entrar'}">
          <span class="user-avatar-badge">${userInitial}</span>
          <span class="user-name-text">${userDisplayName}</span>
        </button>

        <button type="button" class="theme-toggle-btn aqua-pill" id="btn-theme-toggle" title="Tema: ${Sanitizer.escape(theme)}">
          ${themeIcons[theme] || '💻'}
        </button>

        <button type="button" class="btn-primary aqua-glow" id="btn-quick-add">
          <span>+</span>
          <span>Nova Atividade</span>
        </button>
      </div>
    `;

    this.attachEvents(state);
  },

  attachEvents(state) {
    this.container.querySelector('#btn-nav-prev')?.addEventListener('click', () => store.prevWeek());
    this.container.querySelector('#btn-nav-next')?.addEventListener('click', () => store.nextWeek());
    this.container.querySelector('#btn-nav-today')?.addEventListener('click', () => store.goToToday());

    this.container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.view;
        store.setViewMode(mode);
      });
    });

    this.container.querySelector('#btn-sync-now')?.addEventListener('click', () => {
      store.syncNow();
    });

    const govBtn = this.container.querySelector('#btn-open-governance');
    if (govBtn) {
      govBtn.addEventListener('click', () => {
        AdminGovernanceModal.open();
      });
    }

    this.container.querySelector('#btn-auth-profile')?.addEventListener('click', () => {
      AuthModal.open();
    });

    this.container.querySelector('#btn-theme-toggle')?.addEventListener('click', () => {
      const nextTheme = state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'system' : 'light';
      store.setTheme(nextTheme);
    });

    this.container.querySelector('#btn-quick-add')?.addEventListener('click', () => {
      ActivityModal.openNew(DateUtils.formatDateKey(new Date()));
    });
  }
};
