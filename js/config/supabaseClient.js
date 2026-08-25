/**
 * @file supabaseClient.js
 * Supabase client initializer and credentials manager.
 * Imports @supabase/supabase-js via native ESM CDN.
 */

// Native ESM import for Supabase JS client v2
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const CONFIG_KEY_URL = 'organizador:supabase:url';
const CONFIG_KEY_ANON = 'organizador:supabase:anon_key';

class SupabaseConfig {
  constructor() {
    this.client = null;
    this.initClient();
  }

  getUrl() {
    return localStorage.getItem(CONFIG_KEY_URL) || window.SUPABASE_URL || '';
  }

  getAnonKey() {
    return localStorage.getItem(CONFIG_KEY_ANON) || window.SUPABASE_ANON_KEY || '';
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
