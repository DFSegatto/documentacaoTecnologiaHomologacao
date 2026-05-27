// supabase/functions/keepalive-check/index.ts
// Roda diariamente via pg_cron no Supabase
// Ao atingir >= 5 dias sem movimento, edita o último registro automaticamente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DIAS_ALERTA = 5

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req: Request) => {
  // Responde ao preflight do browser
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── 1. Buscar configurações ───────────────────────────────────────────
  const { data: configs } = await supabase
    .from('configuracoes')
    .select('chave, valor')
    .in('chave', ['keepalive_usuario_padrao', 'keepalive_auto_editar'])

  const cfg: Record<string, string> = {}
  for (const row of configs ?? []) cfg[row.chave] = row.valor

  const usuarioPadraoId = cfg['keepalive_usuario_padrao'] || null
  const autoEditar      = cfg['keepalive_auto_editar'] !== 'false' // default: true

  // ── 2. Verificar última atividade no banco ────────────────────────────
  const { data: ultimoRegistro } = await supabase
    .from('registros')
    .select('id, titulo, conteudo, criado_em, atualizado_em')
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .single()

  const agora = new Date()
  let ultimaAtividade: Date

  if (ultimoRegistro) {
    const criado     = new Date(ultimoRegistro.criado_em)
    const atualizado = new Date(ultimoRegistro.atualizado_em)
    ultimaAtividade  = criado > atualizado ? criado : atualizado
  } else {
    ultimaAtividade = agora
  }

  const diasSemMovimento = Math.floor(
    (agora.getTime() - ultimaAtividade.getTime()) / (1000 * 60 * 60 * 24)
  )

  // ── 3. Edição automática ao atingir 5 dias ────────────────────────────
  let editouRegistro    = false
  let registroEditadoId: string | null = null

  if (diasSemMovimento >= DIAS_ALERTA && autoEditar && ultimoRegistro) {
    // Salva versão no histórico antes de editar
    await supabase.from('registro_historico').insert({
      registro_id: ultimoRegistro.id,
      titulo:      ultimoRegistro.titulo,
      conteudo:    ultimoRegistro.conteudo,
      editado_por: usuarioPadraoId,
      editado_em:  agora.toISOString(),
    })

    // Re-salva o registro — o trigger atualiza o atualizado_em automaticamente
    const { error: errUpdate } = await supabase
      .from('registros')
      .update({
        conteudo:    ultimoRegistro.conteudo,
        editado_por: usuarioPadraoId,
      })
      .eq('id', ultimoRegistro.id)

    if (!errUpdate) {
      editouRegistro    = true
      registroEditadoId = ultimoRegistro.id
    }
  }

  // ── 4. Registrar verificação no log ──────────────────────────────────
  await supabase.from('keepalive_log').insert({
    verificado_em:      agora.toISOString(),
    ultima_atividade:   ultimaAtividade.toISOString(),
    dias_sem_movimento: diasSemMovimento,
    alerta_enviado:     false,
    editou_registro:    editouRegistro,
  })

  return new Response(
    JSON.stringify({
      ok: true,
      diasSemMovimento,
      editouRegistro,
      registroEditadoId,
      mensagem: editouRegistro
        ? `Edição automática realizada no registro ${registroEditadoId}.`
        : `Banco ativo. Última atividade há ${diasSemMovimento} dia(s).`,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
  )
})
