/**
 * @file supabaseClient.js
 * Immutable infrastructure bootstrap and client initializer.
 * Infrastructure configuration is loaded from environment / deploy configuration.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Immutable Project Infrastructure Configuration
export const SUPABASE_PROJECT_URL = 'https://txumkevqlgjdyqqlmxlh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dW1rZXZxbGdqZHlxcWxteGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTQ3NDMsImV4cCI6MjEwMzE5MDc0M30.-ZMobb3ZH6tDG429UCmZ9CJt283a82msXMcmIL9Hb50';

class SupabaseConfig {
  constructor() {
    this.client = null;
    this.initClient();
  }

  getUrl() {
    return SUPABASE_PROJECT_URL;
  }

  getAnonKey() {
    return SUPABASE_ANON_KEY;
  }

  isConfigured() {
    return !!(SUPABASE_PROJECT_URL && SUPABASE_ANON_KEY && SUPABASE_PROJECT_URL.startsWith('http'));
  }

  initClient() {
    if (this.isConfigured()) {
      try {
        this.client = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
        this.client = null;
      }
    }
    return this.client;
  }

  getClient() {
    if (!this.client) {
      return this.initClient();
    }
    return this.client;
  }
}

export const supabaseConfig = new SupabaseConfig();
