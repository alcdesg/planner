/**
 * @file header.js
 * App header controller with iOS Aqua aesthetics, Live Database Sync button, and Supabase Auth.
 */

import { DateUtils } from '../domain/models.js';
import { store } from '../state/store.js';
import { ActivityModal } from './activityModal.js';
import { AuthModal } from './authModal.js';
import { UserModal } from './userModal.js';

export const HeaderView = {
  container: null,

  init() {
    this.container = document.getElementById('app-header');
    if (!this.container) return;

    store.subscribe((state) => this.render(state));
    this.render(store.getState());
  },

  render(state) {
    const { currentUser, syncStatus, isSupabaseConnected, currentMonday, viewMode, theme } = state;
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
      ? 'Erro ao sincronizar'
      : 'Sincronizado';

    const syncDotColor = isSyncing
      ? 'var(--color-primary)'
      : isError
      ? '#ef4444'
      : '#10b981';

    const userDisplayName = currentUser
      ? (currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Usuário')
      : 'Entrar';

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
          <span class="app-title">Organizador</span>
        </div>

        <div class="week-nav aqua-pill">
          <button type="button" class="nav-btn today-btn" id="btn-nav-today">Hoje</button>
          <button type="button" class="nav-arrow-btn" id="btn-nav-prev" title="Semana anterior" aria-label="Semana anterior">‹</button>
          <span class="current-range-display" id="week-range-text">${weekRangeText}</span>
          <button type="button" class="nav-arrow-btn" id="btn-nav-next" title="Próxima semana" aria-label="Próxima semana">›</button>
        </div>
      </div>

      <div class="header-right">
        <!-- Modular View Switcher (iOS Segmented Control) -->
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

        <!-- Live Database Sync Button -->
        <button type="button" class="sync-status-btn aqua-pill ${isSyncing ? 'is-syncing' : ''}" id="btn-sync-now" title="Clique para sincronizar com o Supabase sob demanda">
          <span class="sync-dot" style="background-color: ${syncDotColor};"></span>
          <span class="sync-text">${isSyncing ? '🔄' : ''} ${syncLabel}</span>
        </button>

        <!-- User Profile & Auth Modal Trigger -->
        <button type="button" class="user-selector-btn aqua-pill" id="btn-auth-profile" title="${currentUser ? 'Sua Conta: ' + currentUser.email : 'Entrar / Conectar Supabase'}">
          <span class="user-avatar-badge">${userInitial}</span>
          <span class="user-name-text">${this.escapeHtml(userDisplayName)}</span>
        </button>

        <!-- Theme Toggle -->
        <button type="button" class="theme-toggle-btn aqua-pill" id="btn-theme-toggle" title="Tema: ${theme}">
          ${themeIcons[theme] || '💻'}
        </button>

        <!-- New Activity Primary Action -->
        <button type="button" class="btn-primary aqua-glow" id="btn-quick-add">
          <span>+</span>
          <span>Nova Atividade</span>
        </button>
      </div>
    `;

    this.attachEvents(state);
  },

  attachEvents(state) {
    // Navigation
    this.container.querySelector('#btn-nav-prev').addEventListener('click', () => store.prevWeek());
    this.container.querySelector('#btn-nav-next').addEventListener('click', () => store.nextWeek());
    this.container.querySelector('#btn-nav-today').addEventListener('click', () => store.goToToday());

    // View Switcher
    this.container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.view;
        store.setViewMode(mode);
      });
    });

    // Sync Button (Forces immediate fresh database fetch)
    this.container.querySelector('#btn-sync-now').addEventListener('click', () => {
      store.syncNow();
    });

    // Auth & Profile Button
    this.container.querySelector('#btn-auth-profile').addEventListener('click', () => {
      AuthModal.open();
    });

    // Theme Toggle
    this.container.querySelector('#btn-theme-toggle').addEventListener('click', () => {
      const nextTheme = state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'system' : 'light';
      store.setTheme(nextTheme);
    });

    // Quick Add Button
    this.container.querySelector('#btn-quick-add').addEventListener('click', () => {
      ActivityModal.openNew(DateUtils.formatDateKey(new Date()));
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
