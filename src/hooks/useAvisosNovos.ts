import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'notas-versao-lidas'

function getIdsLidos(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function salvarIdsLidos(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function useAvisosNovos() {
  const [naoLidos, setNaoLidos] = useState(0)

  useEffect(() => {
    async function verificar() {
      const { data } = await supabase
        .from('avisos')
        .select('id')
        .eq('ativo', true)

      if (!data) return
      const lidos = getIdsLidos()
      const pendentes = data.filter(a => !lidos.has(a.id)).length
      setNaoLidos(pendentes)
    }
    verificar()
  }, [])

  /** Chame ao entrar na página de notas de versão para zerar a bolinha */
  function marcarTodosLidos(ids: string[]) {
    const lidos = getIdsLidos()
    ids.forEach(id => lidos.add(id))
    salvarIdsLidos(lidos)
    setNaoLidos(0)
  }

  return { naoLidos, marcarTodosLidos }
}
