/**
 * @file storage.js
 * Persistence layer for Organizador Semanal with strict isolation per user.
 * Supports Activities, Habits, Meal Plans, and Settings.
 */

import { generateId, DateUtils, RECURRENCE_TYPES } from '../domain/models.js';
import { HabitUtils } from '../domain/habitsModel.js';

const STORAGE_PREFIX = 'organizador:v1';

export const StorageService = {
  /**
   * Get all registered users
   */
  getUsers() {
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}:users`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load users from localStorage', e);
    }

    const defaultUsers = [
      { id: 'usr_alcides', name: 'Alcides', avatarInitial: 'A' },
      { id: 'usr_paula', name: 'Paula', avatarInitial: 'P' }
    ];
    this.saveUsers(defaultUsers);
    return defaultUsers;
  },

  saveUsers(users) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}:users`, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  },

  getActiveUserId() {
    return localStorage.getItem(`${STORAGE_PREFIX}:active_user_id`) || 'usr_alcides';
  },

  setActiveUserId(userId) {
    localStorage.setItem(`${STORAGE_PREFIX}:active_user_id`, userId);
  },

  /* ------------------------------------------------------------------------
     Activities Storage
     ------------------------------------------------------------------------ */
  getActivities(userId) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:activities`;
      const data = localStorage.getItem(key);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error(`Failed to load activities for user ${userId}`, e);
    }

    if (userId === 'usr_alcides' || userId === 'usr_paula') {
      return this.getInitialSampleActivities(userId);
    }

    this.saveActivities(userId, []);
    return [];
  },

  saveActivities(userId, activities) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:activities`;
      localStorage.setItem(key, JSON.stringify(activities));
    } catch (e) {
      console.error(`Failed to save activities for user ${userId}`, e);
    }
  },

  /* ------------------------------------------------------------------------
     Habits Storage
     ------------------------------------------------------------------------ */
  getHabits(userId) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:habits`;
      const data = localStorage.getItem(key);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error(`Failed to load habits for user ${userId}`, e);
    }

    if (userId === 'usr_alcides') {
      const today = new Date();
      const monday = DateUtils.getMondayOfWeek(today);
      const getKey = (offset) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + offset);
        return DateUtils.formatDateKey(d);
      };

      const sampleHabits = [
        {
          id: 'hbt_water',
          userId,
          name: 'Beber 2L de água',
          icon: '💧',
          targetDays: 7,
          completedDates: [getKey(0), getKey(1), getKey(2)],
          createdAt: new Date().toISOString()
        },
        {
          id: 'hbt_reading',
          userId,
          name: 'Leitura 20 min',
          icon: '📚',
          targetDays: 5,
          completedDates: [getKey(0), getKey(1)],
          createdAt: new Date().toISOString()
        },
        {
          id: 'hbt_exercise',
          userId,
          name: 'Exercício / Caminhada',
          icon: '🏃',
          targetDays: 5,
          completedDates: [getKey(0), getKey(2)],
          createdAt: new Date().toISOString()
        },
        {
          id: 'hbt_meditation',
          userId,
          name: 'Meditação / Respiração',
          icon: '🧘',
          targetDays: 7,
          completedDates: [getKey(1), getKey(2)],
          createdAt: new Date().toISOString()
        }
      ];
      this.saveHabits(userId, sampleHabits);
      return sampleHabits;
    }

    this.saveHabits(userId, []);
    return [];
  },

  saveHabits(userId, habits) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:habits`;
      localStorage.setItem(key, JSON.stringify(habits));
    } catch (e) {
      console.error(`Failed to save habits for user ${userId}`, e);
    }
  },

  /* ------------------------------------------------------------------------
     Meal Plans Storage
     ------------------------------------------------------------------------ */
  getMeals(userId) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:meals`;
      const data = localStorage.getItem(key);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error(`Failed to load meals for user ${userId}`, e);
    }

    if (userId === 'usr_alcides') {
      const today = new Date();
      const monday = DateUtils.getMondayOfWeek(today);
      const getKey = (offset) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + offset);
        return DateUtils.formatDateKey(d);
      };

      const sampleMeals = {
        [getKey(0)]: {
          breakfast: { text: 'Ovos mexidos + Café preto', completed: true },
          lunch:     { text: 'Frango grelhado + Arroz e salada', completed: true },
          snack:     { text: 'Iogurte natural + Castanhas', completed: false },
          dinner:    { text: 'Sopa leve de legumes', completed: false }
        },
        [getKey(1)]: {
          breakfast: { text: 'Vitamina de banana e aveia', completed: true },
          lunch:     { text: 'Peixe assado + Batata doce', completed: false },
          snack:     { text: 'Maçã + Pasta de amendoim', completed: false },
          dinner:    { text: 'Omelete de queijo e tomate', completed: false }
        },
        [getKey(2)]: {
          breakfast: { text: 'Pão integral + Queijo branco', completed: false },
          lunch:     { text: 'Carne moída + Legumes no vapor', completed: false },
          snack:     { text: 'Frutas vermelhas', completed: false },
          dinner:    { text: 'Salada completa com atum', completed: false }
        }
      };
      this.saveMeals(userId, sampleMeals);
      return sampleMeals;
    }

    this.saveMeals(userId, {});
    return {};
  },

  saveMeals(userId, meals) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:meals`;
      localStorage.setItem(key, JSON.stringify(meals));
    } catch (e) {
      console.error(`Failed to save meals for user ${userId}`, e);
    }
  },

  /* ------------------------------------------------------------------------
     Settings Storage
     ------------------------------------------------------------------------ */
  getUserSettings(userId) {
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}:user:${userId}:settings`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error(`Failed to load settings for user ${userId}`, e);
    }
    return { theme: 'system' };
  },

  saveUserSettings(userId, settings) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}:user:${userId}:settings`, JSON.stringify(settings));
    } catch (e) {
      console.error(`Failed to save settings for user ${userId}`, e);
    }
  },

  /* ------------------------------------------------------------------------
     Sample Activities
     ------------------------------------------------------------------------ */
  getInitialSampleActivities(userId) {
    const today = new Date();
    const monday = DateUtils.getMondayOfWeek(today);
    const getOffsetDate = (days) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + days);
      return DateUtils.formatDateKey(d);
    };

    let sampleActivities = [];

    if (userId === 'usr_alcides') {
      sampleActivities = [
        {
          id: generateId(),
          userId,
          title: 'Alinhar prioridades da semana',
          date: getOffsetDate(0),
          time: '09:00',
          category: 'trabalho',
          status: 'completed',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          userId,
          title: 'Comprar frutas e café',
          date: getOffsetDate(1),
          time: '',
          category: 'casa',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          userId,
          title: 'Academia / Treino funcional',
          date: getOffsetDate(0),
          time: '18:30',
          category: 'saude',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.CUSTOM_DAYS,
          recurrenceDays: [1, 3, 5],
          completedDates: [],
          overrides: {},
          deletedDates: [],
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          userId,
          title: 'Reunião de planejamento e metas',
          date: getOffsetDate(2),
          time: '14:00',
          category: 'trabalho',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          userId,
          title: 'Dentista - Consulta semestral',
          date: getOffsetDate(3),
          time: '15:00',
          category: 'saude',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          userId,
          title: 'Leitura / Estudo pessoal',
          date: getOffsetDate(4),
          time: '',
          category: 'pessoal',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        }
      ];
    } else {
      sampleActivities = [
        {
          id: generateId(),
          userId,
          title: 'Revisão de relatórios',
          date: getOffsetDate(0),
          time: '10:00',
          category: 'trabalho',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        }
      ];
    }

    this.saveActivities(userId, sampleActivities);
    return sampleActivities;
  },

  /* ------------------------------------------------------------------------
     Backup Export & Import
     ------------------------------------------------------------------------ */
  exportData() {
    const users = this.getUsers();
    const exportObject = {
      version: '1.2',
      exportedAt: new Date().toISOString(),
      users,
      userData: {}
    };

    users.forEach(user => {
      exportObject.userData[user.id] = {
        activities: this.getActivities(user.id),
        habits: this.getHabits(user.id),
        meals: this.getMeals(user.id),
        settings: this.getUserSettings(user.id)
      };
    });

    return JSON.stringify(exportObject, null, 2);
  },

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.users && Array.isArray(parsed.users)) {
        this.saveUsers(parsed.users);
        if (parsed.userData) {
          Object.keys(parsed.userData).forEach(userId => {
            const data = parsed.userData[userId];
            if (data.activities) {
              this.saveActivities(userId, data.activities);
            }
            if (data.habits) {
              this.saveHabits(userId, data.habits);
            }
            if (data.meals) {
              this.saveMeals(userId, data.meals);
            }
            if (data.settings) {
              this.saveUserSettings(userId, data.settings);
            }
          });
        }
        return true;
      }
    } catch (e) {
      console.error('Error importing backup data', e);
    }
    return false;
  }
};
