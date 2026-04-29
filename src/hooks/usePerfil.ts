import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type PerfilDB, type PerfilUsuario } from '../lib/supabase'

export function usePerfil(user: User | null) {
  const [perfil, setPerfil] = useState<PerfilUsuario>('usuario')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    async function carregar() {
      const { data } = await supabase
        .from('perfis_usuario')
        .select('perfil')
        .eq('user_id', user!.id)
        .single()

      if (data) {
        setPerfil((data as PerfilDB).perfil)
      } else {
        // Cria perfil padrão se não existir
        await supabase.from('perfis_usuario').insert({
          user_id: user!.id,
          email: user!.email ?? '',
          perfil: 'usuario',
        })
        setPerfil('usuario')
      }
      setLoading(false)
    }
    carregar()
  }, [user])

  const isAdmin   = perfil === 'admin'
  const isSuporte = perfil === 'suporte' || perfil === 'admin'

  return { perfil, isAdmin, isSuporte, loading }
}
