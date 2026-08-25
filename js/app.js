/**
 * @file app.js
 * Main entry point for Organizador Semanal.
 * Orchestrates Weekly Board, Habit Tracker, Meal Planner, Supabase Auth, and Admin Governance.
 */

import { store } from './state/store.js';
import { HeaderView } from './ui/header.js';
import { WeekView } from './ui/weekView.js';
import { TodayView } from './ui/todayView.js';
import { HabitTrackerView } from './ui/habitTrackerView.js';
import { MealPlanView } from './ui/mealPlanView.js';
import { ActivityModal } from './ui/activityModal.js';
import { AuthModal } from './ui/authModal.js';
import { AdminGovernanceModal } from './ui/adminGovernanceModal.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize modal dialogs
  ActivityModal.init();
  AuthModal.init();
  AdminGovernanceModal.init();

  // 2. Initialize Views
  HeaderView.init();
  WeekView.init();
  TodayView.init();
  HabitTrackerView.init();
  MealPlanView.init();

  const weekContainer = document.getElementById('week-view-container');
  const todayContainer = document.getElementById('today-view-container');
  const habitContainer = document.getElementById('habit-view-container');
  const mealContainer = document.getElementById('meal-view-container');

  // 3. React to viewMode changes
  const syncViewMode = (state) => {
    if (weekContainer) weekContainer.style.display = state.viewMode === 'week' ? 'block' : 'none';
    if (todayContainer) todayContainer.style.display = state.viewMode === 'today' ? 'block' : 'none';
    if (habitContainer) habitContainer.style.display = state.viewMode === 'habits' ? 'block' : 'none';
    if (mealContainer) mealContainer.style.display = state.viewMode === 'meals' ? 'block' : 'none';
  };

  store.subscribe(syncViewMode);
  syncViewMode(store.getState());

  // 4. Global keyboard shortcuts for power users
  document.addEventListener('keydown', (e) => {
    const isEditing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (isEditing || ActivityModal.isOpen() || AuthModal.isOpen() || AdminGovernanceModal.isOpen()) return;

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
    } else if (e.key === '1') {
      store.setViewMode('week');
    } else if (e.key === '2') {
      store.setViewMode('habits');
    } else if (e.key === '3') {
      store.setViewMode('meals');
    }
  });
});
