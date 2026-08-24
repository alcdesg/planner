/**
 * @file app.js
 * Main entry point for Organizador Semanal.
 */

import { store } from './state/store.js';
import { HeaderView } from './ui/header.js';
import { WeekView } from './ui/weekView.js';
import { TodayView } from './ui/todayView.js';
import { ActivityModal } from './ui/activityModal.js';
import { UserModal } from './ui/userModal.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize modal dialogs
  ActivityModal.init();
  UserModal.init();

  // 2. Initialize Views
  HeaderView.init();
  WeekView.init();
  TodayView.init();

  const weekContainer = document.getElementById('week-view-container');
  const todayContainer = document.getElementById('today-view-container');

  // 3. React to viewMode changes
  const syncViewMode = (state) => {
    if (state.viewMode === 'week') {
      weekContainer.style.display = 'block';
      todayContainer.style.display = 'none';
    } else {
      weekContainer.style.display = 'none';
      todayContainer.style.display = 'block';
    }
  };

  store.subscribe(syncViewMode);
  syncViewMode(store.getState());

  // 4. Global keyboard shortcuts for power users (when not inside an input/modal)
  document.addEventListener('keydown', (e) => {
    const isEditing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (isEditing || ActivityModal.isOpen() || UserModal.isOpen()) return;

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      ActivityModal.openNew();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      store.goToToday();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      store.prevWeek();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      store.nextWeek();
    }
  });
});
