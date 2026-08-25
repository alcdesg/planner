/**
 * @file supabaseClient.js
 * Supabase client initializer with project credentials preset.
 * Connects out-of-the-box with Row Level Security.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const DEFAULT_PROJECT_URL = 'https://txumkevqlgjdyqqlmxlh.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dW1rZXZxbGdqZHlxcWxteGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTQ3NDMsImV4cCI6MjEwMzE5MDc0M30.-ZMobb3ZH6tDG429UCmZ9CJt283a82msXMcmIL9Hb50';

const CONFIG_KEY_URL = 'organizador:supabase:url';
const CONFIG_KEY_ANON = 'organizador:supabase:anon_key';

class SupabaseConfig {
  constructor() {
    this.client = null;
    this.initClient();
  }

  getUrl() {
    return localStorage.getItem(CONFIG_KEY_URL) || DEFAULT_PROJECT_URL;
  }

  getAnonKey() {
    return localStorage.getItem(CONFIG_KEY_ANON) || DEFAULT_ANON_KEY;
  }

  isConfigured() {
    const url = this.getUrl();
    const key = this.getAnonKey();
    return !!(url && key && url.startsWith('http') && key.length > 20);
  }

  initClient() {
    if (this.isConfigured()) {
      try {
        this.client = createClient(this.getUrl(), this.getAnonKey(), {
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
    if (!this.client && this.isConfigured()) {
      return this.initClient();
    }
    return this.client;
  }

  saveCredentials(url, anonKey) {
    if (url && anonKey) {
      localStorage.setItem(CONFIG_KEY_URL, url.trim());
      localStorage.setItem(CONFIG_KEY_ANON, anonKey.trim());
      this.initClient();
      return true;
    }
    return false;
  }

  clearCredentials() {
    localStorage.removeItem(CONFIG_KEY_URL);
    localStorage.removeItem(CONFIG_KEY_ANON);
    this.client = null;
  }
}

export const supabaseConfig = new SupabaseConfig();
