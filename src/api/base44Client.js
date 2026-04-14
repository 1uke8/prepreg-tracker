/**
 * Base44 compatibility layer
 *
 * This file replaces the @base44/sdk with a Supabase-backed implementation
 * that exposes the same interface the app components already use:
 *
 *   base44.entities.Material.list()
 *   base44.entities.Material.create({ ... })
 *   base44.entities.Material.update(id, { ... })
 *   base44.entities.Material.delete(id)
 *   base44.entities.Material.filter({ field__eq: value })
 *   base44.auth.me()
 *
 * The entity names map to Supabase table names (lowercased + plural):
 *   Material  -> materials
 *   Stock     -> stocks
 *   Kit       -> kits
 *   Transfer  -> transfers
 *   Location  -> locations
 *   Batch     -> batches
 *   Settings  -> settings
 *
 * TODO for Claude Code:
 *  1. Replace all base44.entities.X.list() calls with direct supabase queries
 *     once you're happy with how the migration is going — this compatibility
 *     layer is a stepping stone, not the final state.
 *  2. Replace base44.auth.me() with supabase.auth.getUser() and update the
 *     auth flow in src/lib/AuthContext.jsx.
 *  3. The AI notification feature (AINotificationButton) calls base44's LLM
 *     API. Replace this with a call to the Anthropic API directly using the
 *     VITE_ANTHROPIC_API_KEY env var, or a Supabase Edge Function.
 */

import { supabase } from './supabaseClient'

// Map entity names to Supabase table names
const TABLE_MAP = {
  Material: 'materials',
  Stock: 'stocks',
  Kit: 'kits',
  Transfer: 'transfers',
  Location: 'locations',
  Batch: 'batches',
  Settings: 'settings',
  User: 'users', // handled by userEntityClient below — not a real Supabase table
}

/**
 * Parse Base44-style filter objects like:
 *   { status__eq: 'active', archived__neq: true }
 * into Supabase query modifiers.
 */
function applyFilters(query, filters = {}) {
  for (const [key, value] of Object.entries(filters)) {
    const [field, op] = key.split('__')
    switch (op) {
      case 'eq':
      case undefined:
        query = query.eq(field, value)
        break
      case 'neq':
        query = query.neq(field, value)
        break
      case 'gt':
        query = query.gt(field, value)
        break
      case 'gte':
        query = query.gte(field, value)
        break
      case 'lt':
        query = query.lt(field, value)
        break
      case 'lte':
        query = query.lte(field, value)
        break
      case 'like':
        query = query.like(field, value)
        break
      case 'ilike':
        query = query.ilike(field, value)
        break
      case 'in':
        query = query.in(field, value)
        break
      case 'is':
        query = query.is(field, value)
        break
    }
  }
  return query
}

function createEntityClient(tableName) {
  return {
    async list(filters = {}) {
      try {
        let query = supabase.from(tableName).select('*').order('created_at', { ascending: false })
        query = applyFilters(query, filters)
        const { data, error } = await query
        if (error) throw error
        return data ?? []
      } catch (err) {
        console.warn(`[base44Client] ${tableName}.list() failed — returning []:`, err?.message ?? err)
        return []
      }
    },

    async filter(filters = {}) {
      return this.list(filters)
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },

    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([record])
        .select()
        .single()
      if (error) throw error
      return data
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
      return { success: true }
    },
  }
}

// Supabase auth.users is not exposed via the public schema.
// Return an empty list so ServerSettings renders without crashing.
const userEntityClient = {
  async list() { return [] },
  async filter() { return [] },
  async get() { return null },
  async create() { throw new Error('User management requires Supabase Auth API') },
  async update() { throw new Error('User management requires Supabase Auth API') },
  async delete() { throw new Error('User management requires Supabase Auth API') },
}

// Build the entities object
const entities = {
  ...Object.fromEntries(
    Object.entries(TABLE_MAP)
      .filter(([name]) => name !== 'User')
      .map(([name, table]) => [name, createEntityClient(table)])
  ),
  User: userEntityClient,
}

// Auth shim — mirrors base44.auth.me()
const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw error ?? new Error('Not authenticated')
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.email,
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}

// Stub for Base44's LLM / file-upload integration API.
// AINotificationButton and AIChatbot call these. Replace with real
// Anthropic API calls once VITE_ANTHROPIC_API_KEY is configured.
const integrations = {
  Core: {
    async InvokeLLM({ response_json_schema } = {}) {
      // If the caller wants structured JSON (e.g. AINotificationButton), return
      // a placeholder notification. Otherwise return a plain string.
      if (response_json_schema) {
        return {
          notifications: [{
            severity: 'info',
            title: 'AI Unavailable',
            message: 'Add VITE_ANTHROPIC_API_KEY to your .env file to enable AI-powered notifications.',
          }],
        }
      }
      return 'AI features are not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.'
    },

    async UploadFile() {
      throw new Error('File upload requires Supabase Storage configuration.')
    },
  },
}

// Stub for Base44 app-level logging — no-op in standalone deployment
const appLogs = {
  logUserInApp: async () => {},
}

export const base44 = { entities, auth, integrations, appLogs }
