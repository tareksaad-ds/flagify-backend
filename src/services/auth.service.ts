import { SupabaseClient } from '@supabase/supabase-js'

export function createAuthService(supabase: SupabaseClient) {
  return {
    async register(email: string, password: string) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error

      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: data.user!.id, email: data.user!.email })
      if (insertError) throw insertError

      return data
    },

    async login(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },

    async logout(accessToken: string) {
      const { error } = await supabase.auth.admin.signOut(accessToken)
      if (error) throw error
    },

    async getUser(accessToken: string) {
      const { data, error } = await supabase.auth.getUser(accessToken)
      if (error) throw error
      return data.user
    },
  }
}
