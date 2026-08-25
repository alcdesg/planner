/**
 * @file supabaseService.js
 * Direct PostgreSQL backend data operations using Supabase with Row Level Security, RBAC and Strict Health Checks.
 * Zero client-side role determination - All authorization is enforced by the database.
 */

import { supabaseConfig } from '../config/supabaseClient.js';
import { Sanitizer } from '../utils/sanitizer.js';

export const SupabaseService = {
  /* ------------------------------------------------------------------------
     Connection Health Check
     ------------------------------------------------------------------------ */
  async testConnection() {
    const client = supabaseConfig.getClient();
    if (!client) {
      return { ok: false, message: 'Supabase não inicializado ou credenciais ausentes.' };
    }

    const startTime = performance.now();
    try {
      const { error } = await client.from('user_profiles').select('id', { count: 'exact', head: true });
      const latency = Math.round(performance.now() - startTime);

      if (error && error.code !== 'PGRST116') {
        if (error.message && error.message.includes('FetchError')) {
          return { ok: false, message: `Falha na conexão: ${error.message}` };
        }
      }

      return {
        ok: true,
        latency,
        url: supabaseConfig.getUrl(),
        message: `Conexão ativa (${latency}ms)`
      };
    } catch (err) {
      return {
        ok: false,
        message: err.message || 'Não foi possível alcançar o servidor do Supabase.'
      };
    }
  },

  /* ------------------------------------------------------------------------
     Auth & Profile Operations
     ------------------------------------------------------------------------ */
  async getCurrentSession() {
    const client = supabaseConfig.getClient();
    if (!client) return null;
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;
      return session;
    } catch (e) {
      console.warn('Supabase getSession error:', e);
      return null;
    }
  },

  async getCurrentUser() {
    const client = supabaseConfig.getClient();
    if (!client) return null;
    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (error) throw error;
      return user;
    } catch (e) {
      console.warn('Supabase getUser error:', e);
      return null;
    }
  },

  async fetchUserProfile(userId) {
    const client = supabaseConfig.getClient();
    if (!client || !userId) return null;
    try {
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) return data;

      // Safe auto-creation of base profile on first login (role defaults strictly to 'member')
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const baseProfile = {
          id: userId,
          email: currentUser.email,
          name: Sanitizer.clampText(currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Usuário', 150),
          role: 'member', // Strictly member; elevation requires admin authorization in database
          theme: 'system'
        };

        const { data: inserted, error: insertErr } = await client
          .from('user_profiles')
          .upsert(baseProfile, { onConflict: 'id' })
          .select()
          .single();

        if (!insertErr && inserted) return inserted;
        return baseProfile;
      }

      return null;
    } catch (e) {
      console.warn('Failed to fetch user profile:', e);
      return null;
    }
  },

  async signIn(email, password) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase não está configurado.');

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error) throw error;

    if (data.user) {
      await this.fetchUserProfile(data.user.id);
    }

    return data;
  },

  async signOut() {
    const client = supabaseConfig.getClient();
    if (client) {
      await client.auth.signOut();
    }
  },

  onAuthStateChange(callback) {
    const client = supabaseConfig.getClient();
    if (!client) return { unsubscribe: () => {} };
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  },

  /* ------------------------------------------------------------------------
     Admin Governance (Enforced by Database RLS & is_admin())
     ------------------------------------------------------------------------ */
  async fetchAllProfiles() {
    const client = supabaseConfig.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('user_profiles')
      .select('id, email, name, role, is_active, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching all profiles:', error);
      throw error;
    }
    return data || [];
  },

  async createManagedUser({ email, password, name, role }) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase não está configurado.');

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: {
          name: Sanitizer.clampText(name, 150),
          role: role === 'admin' ? 'admin' : 'member'
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      await client.from('user_profiles').upsert({
        id: data.user.id,
        email: email.trim(),
        name: Sanitizer.clampText(name, 150),
        role: role === 'admin' ? 'admin' : 'member',
        theme: 'system'
      });
    }

    return data;
  },

  /* ------------------------------------------------------------------------
     Activities DB Operations (Strictly Bound to auth.uid())
     ------------------------------------------------------------------------ */
  async fetchActivities() {
    const client = supabaseConfig.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('activities')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching activities from Supabase:', error);
      throw error;
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: Sanitizer.clampText(row.title, 255),
      date: row.date,
      time: row.time || '',
      category: row.category || 'outros',
      status: row.status || 'pending',
      recurrence: row.recurrence || 'none',
      recurrenceDays: Array.isArray(row.recurrence_days) ? row.recurrence_days : [],
      recurrenceEndDate: row.recurrence_end_date || '',
      completedDates: Array.isArray(row.completed_dates) ? row.completed_dates : [],
      overrides: typeof row.overrides === 'object' && row.overrides !== null ? row.overrides : {},
      deletedDates: Array.isArray(row.deleted_dates) ? row.deleted_dates : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  async insertActivity(activity) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase client offline.');

    const row = {
      id: activity.id,
      title: Sanitizer.clampText(activity.title, 255),
      date: activity.date,
      time: activity.time || null,
      category: activity.category || 'outros',
      status: activity.status || 'pending',
      recurrence: activity.recurrence || 'none',
      recurrence_days: activity.recurrenceDays || [],
      recurrence_end_date: activity.recurrenceEndDate || null,
      completed_dates: activity.completedDates || [],
      overrides: activity.overrides || {},
      deleted_dates: activity.deletedDates || []
    };

    const { data, error } = await client
      .from('activities')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error inserting activity in Supabase:', error);
      throw error;
    }
    return data;
  },

  async updateActivity(id, activity) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase client offline.');

    const updatePayload = {};
    if (activity.title !== undefined) updatePayload.title = Sanitizer.clampText(activity.title, 255);
    if (activity.date !== undefined) updatePayload.date = activity.date;
    if (activity.time !== undefined) updatePayload.time = activity.time || null;
    if (activity.category !== undefined) updatePayload.category = activity.category;
    if (activity.status !== undefined) updatePayload.status = activity.status;
    if (activity.recurrence !== undefined) updatePayload.recurrence = activity.recurrence;
    if (activity.recurrenceDays !== undefined) updatePayload.recurrence_days = activity.recurrenceDays;
    if (activity.recurrenceEndDate !== undefined) updatePayload.recurrence_end_date = activity.recurrenceEndDate || null;
    if (activity.completedDates !== undefined) updatePayload.completed_dates = activity.completedDates;
    if (activity.overrides !== undefined) updatePayload.overrides = activity.overrides;
    if (activity.deletedDates !== undefined) updatePayload.deleted_dates = activity.deletedDates;
    updatePayload.updated_at = new Date().toISOString();

    const { error } = await client
      .from('activities')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error updating activity in Supabase:', error);
      throw error;
    }
  },

  async deleteActivity(id) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase client offline.');

    const { error } = await client
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting activity from Supabase:', error);
      throw error;
    }
  },

  /* ------------------------------------------------------------------------
     Habits DB Operations
     ------------------------------------------------------------------------ */
  async fetchHabits() {
    const client = supabaseConfig.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching habits from Supabase:', error);
      throw error;
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      name: Sanitizer.clampText(row.name, 150),
      icon: row.icon || '🎯',
      targetDays: row.target_days || 7,
      completedDates: Array.isArray(row.completed_dates) ? row.completed_dates : [],
      createdAt: row.created_at
    }));
  },

  async insertHabit(habit) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase client offline.');

    const row = {
      id: habit.id,
      name: Sanitizer.clampText(habit.name, 150),
      icon: Sanitizer.clampText(habit.icon || '🎯', 10),
      target_days: habit.targetDays || 7,
      completed_dates: habit.completedDates || []
    };

    const { data, error } = await client
      .from('habits')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error inserting habit in Supabase:', error);
      throw error;
    }
    return data;
  },

  async updateHabit(id, habit) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase client offline.');

    const updatePayload = {};
    if (habit.name !== undefined) updatePayload.name = Sanitizer.clampText(habit.name, 150);
    if (habit.icon !== undefined) updatePayload.icon = Sanitizer.clampText(habit.icon, 10);
    if (habit.targetDays !== undefined) updatePayload.target_days = habit.targetDays;
    if (habit.completedDates !== undefined) updatePayload.completed_dates = habit.completedDates;

    const { error } = await client
      .from('habits')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error updating habit in Supabase:', error);
      throw error;
    }
  },

  async deleteHabit(id) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase client offline.');

    const { error } = await client
      .from('habits')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting habit from Supabase:', error);
      throw error;
    }
  },

  /* ------------------------------------------------------------------------
     Meal Plans DB Operations (Unique per user_id, date_key)
     ------------------------------------------------------------------------ */
  async fetchMeals() {
    const client = supabaseConfig.getClient();
    if (!client) return {};

    const { data, error } = await client
      .from('meal_plans')
      .select('*');

    if (error) {
      console.error('Error fetching meals from Supabase:', error);
      throw error;
    }

    const mealsMap = {};
    (data || []).forEach(row => {
      mealsMap[row.date_key] = {
        breakfast: row.breakfast || { text: '', completed: false },
        lunch:     row.lunch     || { text: '', completed: false },
        snack:     row.snack     || { text: '', completed: false },
        dinner:    row.dinner    || { text: '', completed: false }
      };
    });
    return mealsMap;
  },

  async upsertMealDay(dateKey, dayData) {
    const client = supabaseConfig.getClient();
    if (!client) throw new Error('Supabase client offline.');

    const row = {
      date_key: dateKey,
      breakfast: dayData.breakfast || { text: '', completed: false },
      lunch:     dayData.lunch     || { text: '', completed: false },
      snack:     dayData.snack     || { text: '', completed: false },
      dinner:    dayData.dinner    || { text: '', completed: false },
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from('meal_plans')
      .upsert(row, { onConflict: 'user_id,date_key' });

    if (error) {
      console.error('Error saving meal to Supabase:', error);
      throw error;
    }
  }
};
