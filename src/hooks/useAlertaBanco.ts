import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const LIMITE_DIAS = 5

export function useAlertaBanco(isAdmin: boolean) {
  const [diasSemAtividade, setDiasSemAtividade] = useState<number | null>(null)
  const [alerta, setAlerta] = useState(false)

  useEffect(() => {
    if (!isAdmin) return

    async function verificar() {
      const { data } = await supabase
        .from('registros')
        .select('atualizado_em')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .single()

      if (data?.atualizado_em) {
        const dias = Math.floor(
          (Date.now() - new Date(data.atualizado_em).getTime()) / (1000 * 60 * 60 * 24)
        )
        setDiasSemAtividade(dias)
        setAlerta(dias >= LIMITE_DIAS)
      } else {
        setDiasSemAtividade(0)
        setAlerta(false)
      }
    }

    verificar()
  }, [isAdmin])

  return { diasSemAtividade, alerta }
}
