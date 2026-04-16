// supabase/functions/keepalive-check/index.ts
// Roda diariamente via pg_cron no Supabase
// Verifica última atividade e envia e-mail se >= 5 dias sem movimento

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DIAS_ALERTA = 5

Deno.serve(async (req: Request) => {
  // Aceita GET (cron) e POST (teste manual)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── 1. Buscar configuração de e-mail ──────────────────────────────────
  const { data: config } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'email_alerta_keepalive')
    .single()

  const emailDestino = config?.valor
  if (!emailDestino) {
    return new Response(
      JSON.stringify({ ok: false, motivo: 'E-mail de alerta não configurado' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── 2. Verificar última atividade no banco ────────────────────────────
  // Considera a data mais recente entre criações e edições de registros
  const { data: ultimoRegistro } = await supabase
    .from('registros')
    .select('criado_em, atualizado_em')
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .single()

  const agora = new Date()
  let ultimaAtividade: Date

  if (ultimoRegistro) {
    const criado    = new Date(ultimoRegistro.criado_em)
    const atualizado = new Date(ultimoRegistro.atualizado_em)
    ultimaAtividade  = criado > atualizado ? criado : atualizado
  } else {
    // Banco vazio — usa data atual para não disparar alerta em banco recém-criado
    ultimaAtividade = agora
  }

  const diasSemMovimento = Math.floor(
    (agora.getTime() - ultimaAtividade.getTime()) / (1000 * 60 * 60 * 24)
  )

  // ── 3. Registrar verificação no histórico ─────────────────────────────
  await supabase.from('keepalive_log').insert({
    verificado_em:      agora.toISOString(),
    ultima_atividade:   ultimaAtividade.toISOString(),
    dias_sem_movimento: diasSemMovimento,
    alerta_enviado:     diasSemMovimento >= DIAS_ALERTA,
    email_destino:      emailDestino,
  })

  // ── 4. Enviar alerta se necessário ────────────────────────────────────
  if (diasSemMovimento >= DIAS_ALERTA) {
    const diasRestantes = 7 - diasSemMovimento
    const dataUltima    = ultimaAtividade.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    const htmlEmail = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:28px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                  <span style="font-size:20px;">📋</span>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0;color:#c7d2fe;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Base de Conhecimento</p>
                  <p style="margin:4px 0 0;color:#ffffff;font-size:18px;font-weight:700;">Alerta de inatividade</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alerta principal -->
        <tr>
          <td style="padding:28px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:16px 20px;">
              <tr>
                <td style="font-size:24px;width:36px;vertical-align:top;">⚠️</td>
                <td style="padding-left:12px;">
                  <p style="margin:0;color:#92400e;font-size:14px;font-weight:700;">
                    ${diasSemMovimento} ${diasSemMovimento === 1 ? 'dia' : 'dias'} sem atividade
                  </p>
                  <p style="margin:6px 0 0;color:#78350f;font-size:13px;line-height:1.5;">
                    O banco de dados do Supabase é <strong>pausado automaticamente após 7 dias</strong>
                    sem atividade em planos gratuitos.
                    ${diasRestantes > 0
                      ? `Restam <strong>${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}</strong> antes da pausa.`
                      : 'O banco pode ser pausado a qualquer momento.'
                    }
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Detalhes -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;font-weight:600;">Detalhes da verificação</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tr style="background:#f9fafb;">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Campo</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Valor</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Última atividade</td>
                <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #f3f4f6;">${dataUltima}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Dias sem movimento</td>
                <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #f3f4f6;">${diasSemMovimento} de 7</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Verificado em</td>
                <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:500;">${agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Ação -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0 0 12px;color:#374151;font-size:14px;">
              Para evitar a pausa, acesse a Base de Conhecimento e crie ou edite qualquer registro:
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#4f46e5;border-radius:8px;">
                  <a href="${Deno.env.get('SITE_URL') ?? '#'}"
                    style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Acessar a Base de Conhecimento →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Dica -->
        <tr>
          <td style="padding:20px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;">
              <tr>
                <td>
                  <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.6;">
                    <strong>💡 Dica:</strong> Se o banco for pausado, acesse o painel do Supabase em
                    <a href="https://supabase.com/dashboard" style="color:#2563eb;">supabase.com/dashboard</a>
                    e clique em <strong>Restore project</strong>. A restauração leva alguns minutos.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px 32px;border-top:1px solid #f3f4f6;margin-top:24px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
              Este e-mail foi enviado automaticamente pelo sistema de monitoramento da Base de Conhecimento.<br>
              Para alterar ou remover este alerta, acesse <strong>Configurações → Keep-alive</strong> no sistema.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    // Envia via Resend (serviço gratuito de e-mail transacional)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ ok: false, motivo: 'RESEND_API_KEY não configurada' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Base de Conhecimento <alertas@resend.dev>',
        to:      [emailDestino],
        subject: `⚠️ Banco de dados com ${diasSemMovimento} dias sem atividade — ação necessária`,
        html:    htmlEmail,
      }),
    })

    if (!emailResp.ok) {
      const erro = await emailResp.text()
      return new Response(
        JSON.stringify({ ok: false, motivo: `Falha ao enviar e-mail: ${erro}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        ok: true,
        alerta: true,
        diasSemMovimento,
        emailEnviado: emailDestino,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Sem alerta necessário
  return new Response(
    JSON.stringify({
      ok: true,
      alerta: false,
      diasSemMovimento,
      mensagem: `Banco ativo. Última atividade há ${diasSemMovimento} dia(s).`,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
