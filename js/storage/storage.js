/**
 * @file storage.js
 * Persistence layer for Organizador Semanal with strict isolation per user.
 */

import { generateId, DateUtils, RECURRENCE_TYPES } from '../domain/models.js';

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

    // Default users on first launch
    const defaultUsers = [
      { id: 'usr_alcides', name: 'Alcides', avatarInitial: 'A' },
      { id: 'usr_paula', name: 'Paula', avatarInitial: 'P' }
    ];
    this.saveUsers(defaultUsers);
    return defaultUsers;
  },

  /**
   * Save list of users
   */
  saveUsers(users) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}:users`, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  },

  /**
   * Get ID of currently active user
   */
  getActiveUserId() {
    return localStorage.getItem(`${STORAGE_PREFIX}:active_user_id`) || 'usr_alcides';
  },

  /**
   * Set active user ID
   */
  setActiveUserId(userId) {
    localStorage.setItem(`${STORAGE_PREFIX}:active_user_id`, userId);
  },

  /**
   * Load activities for a specific user
   */
  getActivities(userId) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:activities`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error(`Failed to load activities for user ${userId}`, e);
    }

    // Initialize with friendly sample activities for new users
    return this.getInitialSampleActivities(userId);
  },

  /**
   * Save activities for a specific user
   */
  saveActivities(userId, activities) {
    try {
      const key = `${STORAGE_PREFIX}:user:${userId}:activities`;
      localStorage.setItem(key, JSON.stringify(activities));
    } catch (e) {
      console.error(`Failed to save activities for user ${userId}`, e);
    }
  },

  /**
   * Get user settings (e.g. theme: 'light', 'dark', 'system')
   */
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

  /**
   * Save user settings
   */
  saveUserSettings(userId, settings) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}:user:${userId}:settings`, JSON.stringify(settings));
    } catch (e) {
      console.error(`Failed to save settings for user ${userId}`, e);
    }
  },

  /**
   * Initial activities for a new user's first experience
   */
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
          date: getOffsetDate(0), // Seg
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
          date: getOffsetDate(1), // Ter
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
          date: getOffsetDate(0), // Seg
          time: '18:30',
          category: 'saude',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.WEEKDAYS,
          completedDates: [],
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          userId,
          title: 'Reunião de planejamento e metas',
          date: getOffsetDate(2), // Qua
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
          date: getOffsetDate(3), // Qui
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
          date: getOffsetDate(4), // Sex
          time: '',
          category: 'pessoal',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          userId,
          title: 'Almoço de domingo em família',
          date: getOffsetDate(6), // Dom
          time: '12:30',
          category: 'compromisso',
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
        },
        {
          id: generateId(),
          userId,
          title: 'Organizar armários',
          date: getOffsetDate(2),
          time: '',
          category: 'casa',
          status: 'pending',
          recurrence: RECURRENCE_TYPES.NONE,
          createdAt: new Date().toISOString()
        }
      ];
    }

    this.saveActivities(userId, sampleActivities);
    return sampleActivities;
  },

  /**
   * Export all data as JSON
   */
  exportData() {
    const users = this.getUsers();
    const exportObject = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      users,
      userData: {}
    };

    users.forEach(user => {
      exportObject.userData[user.id] = {
        activities: this.getActivities(user.id),
        settings: this.getUserSettings(user.id)
      };
    });

    return JSON.stringify(exportObject, null, 2);
  },

  /**
   * Import data from JSON
   */
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
