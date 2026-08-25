/**
 * @file header.js
 * App header controller (navigation, user switcher, theme, modular view switcher).
 */

import { DateUtils } from '../domain/models.js';
import { store } from '../state/store.js';
import { ActivityModal } from './activityModal.js';
import { UserModal } from './userModal.js';

export const HeaderView = {
  container: null,

  init() {
    this.container = document.getElementById('app-header');
    if (!this.container) return;

    // Close user dropdown if clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = this.container.querySelector('#user-dropdown-menu');
      const userBtn = this.container.querySelector('#user-selector-btn');
      if (dropdown && dropdown.classList.contains('open') && !userBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    store.subscribe((state) => this.render(state));
    this.render(store.getState());
  },

  render(state) {
    const { activeUser, currentMonday, viewMode, theme, users } = state;
    const weekRangeText = DateUtils.formatWeekRange(currentMonday);

    const themeIcons = {
      light: '☀️',
      dark: '🌙',
      system: '💻'
    };

    this.container.innerHTML = `
      <div class="header-left">
        <div class="app-branding">
          <svg class="app-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span class="app-title">Organizador Semanal</span>
        </div>

        <div class="week-nav">
          <button type="button" class="nav-btn today-btn" id="btn-nav-today">Hoje</button>
          <button type="button" class="nav-arrow-btn" id="btn-nav-prev" title="Semana anterior" aria-label="Semana anterior">‹</button>
          <span class="current-range-display" id="week-range-text">${weekRangeText}</span>
          <button type="button" class="nav-arrow-btn" id="btn-nav-next" title="Próxima semana" aria-label="Próxima semana">›</button>
        </div>
      </div>

      <div class="header-right">
        <!-- Modular View Switcher -->
        <div class="view-switcher">
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

        <!-- User Profile Dropdown -->
        <div class="user-selector-wrap">
          <button type="button" class="user-selector-btn" id="user-selector-btn">
            <span class="user-avatar-badge">${activeUser ? activeUser.avatarInitial : 'U'}</span>
            <span>${activeUser ? activeUser.name : 'Usuário'}</span>
            <span style="font-size: 0.7rem; margin-left: 2px;">▾</span>
          </button>

          <div class="user-dropdown-menu" id="user-dropdown-menu">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 4px 8px;">
              Alternar Perfil
            </div>
            ${users.map(u => `
              <button type="button" class="user-menu-item ${u.id === activeUser.id ? 'active' : ''}" data-switch-user="${u.id}">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="user-avatar-badge" style="width: 18px; height: 18px; font-size: 0.65rem;">${u.avatarInitial}</span>
                  <span>${u.name}</span>
                </div>
                ${u.id === activeUser.id ? '✓' : ''}
              </button>
            `).join('')}

            <div class="user-menu-divider"></div>
            <button type="button" class="user-menu-item" id="btn-open-user-manager">
              <span>⚙️ Configurações & Backup</span>
            </button>
          </div>
        </div>

        <!-- Theme Toggle -->
        <button type="button" class="theme-toggle-btn" id="btn-theme-toggle" title="Tema: ${theme}">
          ${themeIcons[theme] || '💻'}
        </button>

        <!-- New Activity Primary Action -->
        <button type="button" class="btn-primary" id="btn-quick-add">
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

    // User Dropdown
    const userBtn = this.container.querySelector('#user-selector-btn');
    const dropdown = this.container.querySelector('#user-dropdown-menu');
    userBtn.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    this.container.querySelectorAll('[data-switch-user]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.switchUser;
        store.switchUser(id);
        dropdown.classList.remove('open');
      });
    });

    this.container.querySelector('#btn-open-user-manager').addEventListener('click', () => {
      dropdown.classList.remove('open');
      UserModal.open();
    });

    // Theme Toggle
    const themeBtn = this.container.querySelector('#btn-theme-toggle');
    themeBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'system' : 'light';
      store.setTheme(nextTheme);
    });

    // Quick Add Button
    const quickAddBtn = this.container.querySelector('#btn-quick-add');
    quickAddBtn.addEventListener('click', () => {
      ActivityModal.openNew(DateUtils.formatDateKey(new Date()));
    });
  }
};
