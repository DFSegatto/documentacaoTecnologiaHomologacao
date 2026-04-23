import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useNavigationGuard } from '../context/NavigationGuardContext'
import { supabase, agruparSessoes, type CategoriaDB, type Sessao, type SessaoComFilhas, type ArquivoUpload } from '../lib/supabase'
import Editor from './Editor'
import UploadAnexos from './UploadAnexos'
import FormCredencial, { criptografarCredencial, type CredencialForm, CREDENCIAL_VAZIA } from './FormCredencial'

interface RegistroFormData {
  id?: string
  titulo: string
  sessao_id: string
  categoria_id: string
  conteudo: string
  privado?: boolean
  temCredencial?: boolean
  credenciaisExistentes?: CredencialForm[]
  anexosExistentes?: ArquivoUpload[]
}

interface FormRegistroProps {
  inicial?: RegistroFormData
  modo: 'criar' | 'editar'
}

function chaveRascunho(modo: 'criar' | 'editar', userId: string, id?: string) {
  return modo === 'editar'
    ? `rascunho_editar_${userId}_${id}`
    : `rascunho_novo_${userId}`
}

// Credenciais no rascunho — sem senha (dado sensível nunca vai para localStorage)
interface CredencialRascunho {
  tipo: string
  label: string
  host: string
  porta: string
  usuario: string
  dominio: string
  observacoes: string
}

interface DadosRascunho {
  titulo: string
  sessaoId: string
  categoriaId: string
  conteudo: string
  privado: boolean
  comCredencial: boolean
  credenciais: CredencialRascunho[]
  anexos: ArquivoUpload[]
  salvoEm: string
}

export default function FormRegistro({ inicial, modo }: FormRegistroProps) {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const { registrarGuard, removerGuard } = useNavigationGuard()

  const [userId, setUserId] = useState('')
  const CHAVE = userId ? chaveRascunho(modo, userId, inicial?.id) : ''

  // Busca o userId assim que o componente monta
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  const [titulo,        setTitulo]        = useState(inicial?.titulo       ?? '')
  const [sessaoId,      setSessaoId]      = useState(inicial?.sessao_id    ?? searchParams.get('sessao') ?? '')
  const [categoriaId,   setCategoriaId]   = useState(inicial?.categoria_id ?? '')
  const categoriaAutoSetRef = useRef(false) // true quando foi setado automaticamente ao carregar
  const [conteudo,      setConteudo]      = useState(inicial?.conteudo     ?? '')
  const [privado,       setPrivado]       = useState(inicial?.privado      ?? false)
  const [comCredencial, setComCredencial] = useState(inicial?.temCredencial ?? false)
  const [credenciais,   setCredenciais]   = useState<CredencialForm[]>(
    inicial?.credenciaisExistentes?.length
      ? inicial.credenciaisExistentes
      : [{ ...CREDENCIAL_VAZIA }]
  )
  const [anexos,        setAnexos]        = useState<ArquivoUpload[]>(inicial?.anexosExistentes ?? [])
  const [sessoes,       setSessoes]       = useState<Sessao[]>([])
  const [arvore,        setArvore]        = useState<SessaoComFilhas[]>([])
  const [categorias,    setCategorias]    = useState<CategoriaDB[]>([])
  const [salvando,      setSalvando]      = useState(false)
  const [erro,          setErro]          = useState('')

  // Rascunho
  const [rascunhoDisponivel, setRascunhoDisponivel] = useState(false)
  const [rascunhoData,       setRascunhoData]       = useState<DadosRascunho | null>(null)
  const [formSujo,           setFormSujo]           = useState(false)
  const [modalSaida,         setModalSaida]         = useState(false)
  const salvandoRef  = useRef(false)
  const pendingNavRef = useRef<(() => void) | null>(null)

  // Verifica rascunho ao montar (só executa quando userId estiver disponível)
  // Usa sessionStorage para distinguir dois cenários:
  //   - Mesma sessão de navegação (voltou de outra aba do browser) → restaura silenciosamente
  //   - Nova sessão (abriu a página do zero / fechou e reabriu) → mostra banner de confirmação
  useEffect(() => {
    if (!CHAVE) return
    try {
      const raw = localStorage.getItem(CHAVE)
      if (!raw) return
      const dados = JSON.parse(raw) as DadosRascunho

      const rascunhoTemConteudo =
        dados.titulo.trim() ||
        dados.conteudo.trim() ||
        dados.credenciais?.length > 0 ||
        dados.anexos?.length > 0

      if (!rascunhoTemConteudo) return

      // sessionStorage persiste apenas enquanto a aba está aberta.
      // Se a chave existe, o usuário estava nesta página nesta sessão → restaura direto.
      // Se não existe, é uma nova visita → mostra o banner pedindo confirmação.
      const SESSAO_KEY = `sessao_ativa_${CHAVE}`
      const mesmasSessao = sessionStorage.getItem(SESSAO_KEY) === '1'

      if (mesmasSessao) {
        // Voltou de outra aba do browser — restaura silenciosamente sem interromper
        setTitulo(dados.titulo)
        setSessaoId(dados.sessaoId)
        setCategoriaId(dados.categoriaId)
        setConteudo(dados.conteudo)
        setPrivado(dados.privado)
        setComCredencial(dados.comCredencial)
        if (dados.credenciais?.length) {
          setCredenciais(dados.credenciais.map(c => ({
            tipo:        c.tipo as CredencialForm['tipo'],
            label:       c.label,
            host:        c.host,
            porta:       c.porta,
            usuario:     c.usuario,
            senha:       '',
            dominio:     c.dominio,
            observacoes: c.observacoes,
          })))
        }
        if (dados.anexos?.length) setAnexos(dados.anexos)
      } else {
        // Nova sessão — pergunta ao usuário
        setRascunhoDisponivel(true)
        setRascunhoData(dados)
      }
    } catch { /* ignora */ }
  }, [CHAVE])

  // Marca a sessão como ativa assim que o componente monta e CHAVE está pronta
  // Isso garante que na próxima vez que a página carregar (ex: tab discard),
  // o rascunho seja restaurado silenciosamente
  useEffect(() => {
    if (!CHAVE) return
    const SESSAO_KEY = `sessao_ativa_${CHAVE}`
    sessionStorage.setItem(SESSAO_KEY, '1')
    return () => {
      // Limpa ao desmontar definitivamente (navegação para outra rota)
      // Não limpa quando o browser apenas descarta a aba (sessionStorage persiste)
    }
  }, [CHAVE])

  useEffect(() => {
    supabase.from('sessoes').select('*').order('nome').then(({ data }) => {
      const lista = (data ?? []) as Sessao[]
      setSessoes(lista)
      setArvore(agruparSessoes(lista))
    })
    supabase.from('categorias').select('*').order('nome').then(({ data }) => {
      const cats = (data ?? []) as CategoriaDB[]
      setCategorias(cats)
      if (!categoriaId && cats.length > 0) {
        categoriaAutoSetRef.current = true
        setCategoriaId(cats[0].id)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detecta se o formulário foi alterado
  useEffect(() => {
    const tituloInicial    = inicial?.titulo       ?? ''
    const conteudoInicial  = inicial?.conteudo     ?? ''
    const sessaoInicial    = inicial?.sessao_id    ?? searchParams.get('sessao') ?? ''
    const categoriaInicial = inicial?.categoria_id ?? ''
    const privadoInicial   = inicial?.privado      ?? false

    const categoriaAlterada = categoriaAutoSetRef.current
      ? false  // ignorar mudança automática ao carregar
      : categoriaId !== categoriaInicial

    setFormSujo(
      titulo      !== tituloInicial    ||
      conteudo    !== conteudoInicial  ||
      sessaoId    !== sessaoInicial    ||
      categoriaAlterada                ||
      privado     !== privadoInicial   ||
      comCredencial !== (inicial?.temCredencial ?? false) ||
      credenciais.some((c, i) => {
        const orig = inicial?.credenciaisExistentes?.[i]
        return !orig || c.tipo !== orig.tipo || c.label !== orig.label ||
               c.host !== orig.host || c.porta !== orig.porta ||
               c.usuario !== orig.usuario || c.dominio !== orig.dominio ||
               c.observacoes !== orig.observacoes
      }) ||
      anexos.length !== (inicial?.anexosExistentes?.length ?? 0)
    )
  }, [titulo, conteudo, sessaoId, categoriaId, privado, comCredencial, credenciais, anexos, inicial, searchParams])

  // Monta objeto de rascunho com todos os campos (sem senhas)
  function montarRascunho(): DadosRascunho {
    return {
      titulo,
      sessaoId,
      categoriaId,
      conteudo,
      privado,
      comCredencial,
      credenciais: credenciais.map(c => ({
        tipo:        c.tipo,
        label:       c.label,
        host:        c.host,
        porta:       c.porta,
        usuario:     c.usuario,
        dominio:     c.dominio,
        observacoes: c.observacoes,
      })),
      anexos,
      salvoEm: new Date().toISOString(),
    }
  }

  // Salva rascunho automaticamente (debounce 1s)
  // Inline dos valores para evitar closure stale em montarRascunho
  useEffect(() => {
    if (!formSujo || !CHAVE) return
    const snapshot = {
      titulo, sessaoId, categoriaId, conteudo, privado, comCredencial,
      credenciais: credenciais.map(c => ({
        tipo: c.tipo, label: c.label, host: c.host, porta: c.porta,
        usuario: c.usuario, dominio: c.dominio, observacoes: c.observacoes,
      })),
      anexos,
      salvoEm: new Date().toISOString(),
    } satisfies DadosRascunho
    const timer = setTimeout(() => {
      if (salvandoRef.current) return
      try {
        localStorage.setItem(CHAVE, JSON.stringify(snapshot))
      } catch { /* quota */ }
    }, 1000)
    return () => clearTimeout(timer)
  }, [titulo, sessaoId, categoriaId, conteudo, privado, comCredencial, credenciais, anexos, formSujo, CHAVE])

  // Registra/remove o guard de navegação global (Navbar, breadcrumbs, etc.)
  useEffect(() => {
    if (formSujo && !salvandoRef.current) {
      registrarGuard(confirmarSaida)
    } else {
      removerGuard()
    }
    return () => removerGuard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSujo])

  // Alerta ao fechar aba/recarregar
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (formSujo && !salvandoRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [formSujo])

  // Ref para distinguir saves feitos pela Page Visibility API
  // Evita que o banner de rascunho apareça ao voltar de outra aba do browser
  const savedByVisibilityRef = useRef(false)

  // Salva imediatamente ao trocar de aba (Page Visibility API)
  // Cobre o caso de tab discard pelo browser quando há pouca memória
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden' && formSujo && CHAVE && !salvandoRef.current) {
        savedByVisibilityRef.current = true
        try {
          localStorage.setItem(CHAVE, JSON.stringify({
            titulo, sessaoId, categoriaId, conteudo, privado, comCredencial,
            credenciais: credenciais.map(c => ({
              tipo: c.tipo, label: c.label, host: c.host, porta: c.porta,
              usuario: c.usuario, dominio: c.dominio, observacoes: c.observacoes,
            })),
            anexos,
            salvoEm: new Date().toISOString(),
          } satisfies DadosRascunho))
        } catch { /* quota */ }
      } else if (document.visibilityState === 'visible') {
        // Voltou para a aba — limpa o flag se o React ainda tem o estado em memória
        // (tab discard não ocorreu), para não suprimir banners futuros legítimos
        if (savedByVisibilityRef.current) {
          savedByVisibilityRef.current = false
          setRascunhoDisponivel(false)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [titulo, sessaoId, categoriaId, conteudo, privado, comCredencial, credenciais, anexos, formSujo, CHAVE])

  // ── Helpers de navegação com confirmação ────────────────────────────────────
  function confirmarSaida(acao: () => void) {
    if (formSujo && !salvandoRef.current) {
      pendingNavRef.current = acao
      setModalSaida(true)
    } else {
      acao()
    }
  }

  function salvarRascunhoESair() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        titulo, sessaoId, categoriaId, conteudo, privado, comCredencial,
        credenciais: credenciais.map(c => ({
          tipo: c.tipo, label: c.label, host: c.host, porta: c.porta,
          usuario: c.usuario, dominio: c.dominio, observacoes: c.observacoes,
        })),
        anexos,
        salvoEm: new Date().toISOString(),
      } satisfies DadosRascunho))
    } catch { /* quota */ }
    // Limpa a flag de sessão para que, ao retornar à página,
    // o banner amarelo apareça pedindo confirmação para restaurar
    sessionStorage.removeItem(`sessao_ativa_${CHAVE}`)
    setModalSaida(false)
    const acao = pendingNavRef.current
    pendingNavRef.current = null
    acao?.()
  }

  function prosseguirSaida() {
    limparRascunho()
    setModalSaida(false)
    const acao = pendingNavRef.current
    pendingNavRef.current = null
    acao?.()
  }

  function cancelarSaida() {
    pendingNavRef.current = null
    setModalSaida(false)
  }

  // ── Rascunho ────────────────────────────────────────────────────────────────
  function restaurarRascunho() {
    if (!rascunhoData) return
    setTitulo(rascunhoData.titulo)
    setSessaoId(rascunhoData.sessaoId)
    setCategoriaId(rascunhoData.categoriaId)
    setConteudo(rascunhoData.conteudo)
    setPrivado(rascunhoData.privado)
    setComCredencial(rascunhoData.comCredencial)
    // Restaura credenciais (sem senha — campo fica vazio)
    if (rascunhoData.credenciais?.length) {
      setCredenciais(rascunhoData.credenciais.map(c => ({
        tipo:        c.tipo as CredencialForm['tipo'],
        label:       c.label,
        host:        c.host,
        porta:       c.porta,
        usuario:     c.usuario,
        senha:       '',   // nunca salvo no rascunho
        dominio:     c.dominio,
        observacoes: c.observacoes,
      })))
    }
    // Restaura anexos
    if (rascunhoData.anexos?.length) {
      setAnexos(rascunhoData.anexos)
    }
    setRascunhoDisponivel(false)
    setRascunhoData(null)
  }

  function descartarRascunho() {
    localStorage.removeItem(CHAVE)
    setRascunhoDisponivel(false)
    setRascunhoData(null)
  }

  function limparRascunho() {
    localStorage.removeItem(CHAVE)
    sessionStorage.removeItem(`sessao_ativa_${CHAVE}`)
  }

  // ── Credenciais ─────────────────────────────────────────────────────────────
  function adicionarCredencial() {
    setCredenciais(prev => [...prev, { ...CREDENCIAL_VAZIA }])
  }

  function atualizarCredencial(indice: number, dados: CredencialForm) {
    setCredenciais(prev => prev.map((c, i) => i === indice ? dados : c))
  }

  function removerCredencial(indice: number) {
    setCredenciais(prev => prev.filter((_, i) => i !== indice))
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return }

    const conteudoVazio = !conteudo.trim() || conteudo === '<p></p>'
    if (conteudoVazio && !(privado && comCredencial)) {
      setErro('O conteúdo não pode estar vazio.'); return
    }
    if (!categoriaId) { setErro('Selecione uma categoria.'); return }

    setSalvando(true)
    salvandoRef.current = true
    setErro('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      let registroId = inicial?.id

      const payload = {
        titulo,
        sessao_id:    sessaoId    || null,
        categoria_id: categoriaId || null,
        conteudo:     conteudo === '<p></p>' ? '' : conteudo,
        privado,
      }

      if (modo === 'criar') {
        const { data, error } = await supabase
          .from('registros')
          .insert({ ...payload, criado_por: user.id })
          .select('id').single()
        if (error) throw error
        registroId = data.id
      } else {
        const { data: atual } = await supabase
          .from('registros').select('titulo, conteudo').eq('id', inicial!.id).single()
        const { error } = await supabase
          .from('registros')
          .update({ ...payload, atualizado_em: new Date().toISOString(), editado_por: user.id })
          .eq('id', inicial!.id)
        if (error) throw error
        if (atual) {
          await supabase.from('registro_historico').insert({
            registro_id: inicial!.id,
            titulo:      atual.titulo,
            conteudo:    atual.conteudo,
            editado_por: user.id,
          })
        }
      }

      let senhasAtuais: Record<number, string> = {}
      if (modo === 'editar' && comCredencial) {
        const { data: credsAtuais } = await supabase
          .from('credenciais')
          .select('ordem, senha_cifrada')
          .eq('registro_id', registroId)
          .order('ordem', { ascending: true })
        credsAtuais?.forEach((c: { ordem: number; senha_cifrada: string }) => {
          senhasAtuais[c.ordem] = c.senha_cifrada
        })
      }

      await supabase.from('credenciais').delete().eq('registro_id', registroId)

      if (comCredencial && credenciais.length > 0) {
        const paraInserir = await Promise.all(
          credenciais.map(async (cred, idx) => {
            const credParaCifrar = { ...cred }
            if (!credParaCifrar.senha && modo === 'editar' && senhasAtuais[idx]) {
              const cifrada = await criptografarCredencial({ ...credParaCifrar, senha: '' }, user.id)
              return {
                registro_id: registroId, tipo: cifrada.tipo, label: cifrada.label,
                host: cifrada.host, porta: cifrada.porta, usuario: cifrada.usuario,
                senha_cifrada: senhasAtuais[idx], dominio: cifrada.dominio,
                observacoes: cifrada.observacoes, ordem: idx,
              }
            }
            const cifrada = await criptografarCredencial(credParaCifrar, user.id)
            return {
              registro_id: registroId, tipo: cifrada.tipo, label: cifrada.label,
              host: cifrada.host, porta: cifrada.porta, usuario: cifrada.usuario,
              senha_cifrada: cifrada.senha_cifrada, dominio: cifrada.dominio,
              observacoes: cifrada.observacoes, ordem: idx,
            }
          })
        )
        const { error: errCred } = await supabase.from('credenciais').insert(paraInserir)
        if (errCred) throw errCred
      }

      await supabase.from('anexos').delete().eq('registro_id', registroId)
      if (anexos.length > 0) {
        await supabase.from('anexos').insert(
          anexos.map((a: ArquivoUpload) => ({
            registro_id: registroId, nome: a.nome, url: a.url, tipo: a.tipo, tamanho: a.tamanho,
          }))
        )
      }

      limparRascunho()
      setFormSujo(false)
      navigate(`/registros/${registroId}`)
    } catch (err) {
      console.error(err)
      setErro('Erro ao salvar. Tente novamente.')
      salvandoRef.current = false
    } finally {
      setSalvando(false)
    }
  }

  const sessaoSelecionada    = sessoes.find(s => s.id === sessaoId)
  const categoriaSelecionada = categorias.find(c => c.id === categoriaId)

  function formatarDataRascunho(iso: string) {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '' }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Banner: rascunho encontrado */}
      {rascunhoDisponivel && rascunhoData && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-700
                        bg-amber-50 dark:bg-amber-950/30 px-4 py-3.5">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Rascunho encontrado</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
              Salvo em {formatarDataRascunho(rascunhoData.salvoEm)}
              {rascunhoData.titulo && <> — <span className="font-medium">"{rascunhoData.titulo}"</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={restaurarRascunho}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition">
              Restaurar
            </button>
            <button type="button" onClick={descartarRascunho}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700
                         text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition">
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Modal: confirmar saída */}
      {modalSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelarSaida} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
                          border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6">
            {/* Ícone */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40
                              flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Título e descrição */}
            <div className="text-center mb-5">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Você tem alterações não publicadas
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                O que deseja fazer antes de sair?
              </p>
            </div>

            {/* Ações — 3 opções */}
            <div className="flex flex-col gap-2">

              {/* Opção 1: Salvar rascunho e sair */}
              <button type="button" onClick={salvarRascunhoESair}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700
                           active:scale-[0.98] text-white text-sm font-medium transition text-left">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold leading-tight">Salvar rascunho e sair</p>
                  <p className="text-xs text-white/70 mt-0.5 font-normal">Continue de onde parou ao voltar</p>
                </div>
              </button>

              {/* Opção 2: Continuar editando */}
              <button type="button" onClick={cancelarSaida}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-brand-200
                           dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100
                           dark:hover:bg-brand-900/40 active:scale-[0.98] text-sm font-medium transition text-left">
                <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 leading-tight">Continuar editando</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">Voltar ao formulário sem sair</p>
                </div>
              </button>

              {/* Divisor */}
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500">ou</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Opção 3: Sair sem salvar */}
              <button type="button" onClick={prosseguirSaida}
                className="w-full py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400
                           hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20
                           active:scale-[0.98] transition font-medium">
                Sair sem salvar
              </button>

            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Indicador de rascunho ativo */}
        {formSujo && !rascunhoDisponivel && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400
                          bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800
                          rounded-lg px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span>Rascunho salvo automaticamente — suas alterações não serão perdidas.</span>
          </div>
        )}

        {/* Título */}
        <div>
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="Título do registro..."
            className="w-full text-2xl font-semibold bg-transparent border-none outline-none
                       text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 py-1" />
          <div className="h-px bg-gray-200 dark:bg-gray-700 mt-2" />
        </div>

        {/* Toggle Privado */}
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 transition cursor-pointer
          ${privado ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
          onClick={() => setPrivado(v => !v)}>
          <div className={`relative w-10 h-6 rounded-full flex-shrink-0 transition mt-0.5
            ${privado ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-gray-200 rounded-full shadow transition-all
              ${privado ? 'left-5' : 'left-1'}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${privado ? 'text-amber-800 dark:text-amber-200' : 'text-gray-700 dark:text-gray-300'}`}>
              {privado ? '🔒 Registro privado' : '🌐 Registro público'}
            </p>
            <p className={`text-xs mt-0.5 ${privado ? 'text-amber-700 dark:text-amber-300/90' : 'text-gray-500 dark:text-gray-400'}`}>
              {privado
                ? 'Visível apenas para você. Ideal para credenciais e dados sensíveis.'
                : 'Visível para toda a equipe autenticada.'}
            </p>
          </div>
        </div>

        {/* Sessão */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sessão <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
            </label>
            <a href="/sessoes" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">+ Gerenciar sessões</a>
          </div>
          {sessoes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
              Nenhuma sessão.{' '}
              <a href="/sessoes" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">Criar agora</a>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 items-start">
              <button type="button" onClick={() => setSessaoId('')}
                className={`self-start px-3.5 py-1.5 rounded-lg text-sm font-medium transition border
                  ${!sessaoId ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-700'
                              : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                Sem sessão
              </button>
              {arvore.map(sessao => (
                <div key={sessao.id} className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => setSessaoId(sessao.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition border-2
                      ${sessaoId === sessao.id ? 'text-white border-transparent'
                                               : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}
                    style={sessaoId === sessao.id ? { backgroundColor: sessao.cor } : { color: sessao.cor, borderColor: sessao.cor + '44' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {sessao.nome}
                  </button>
                  {sessao.filhas.map(filha => (
                    <button key={filha.id} type="button" onClick={() => setSessaoId(filha.id)}
                      className={`flex items-center gap-1 pl-5 pr-3 py-1 rounded-lg text-xs font-medium transition border-2
                        ${sessaoId === filha.id ? 'text-white border-transparent'
                                                : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}
                      style={sessaoId === filha.id ? { backgroundColor: filha.cor } : { color: filha.cor, borderColor: filha.cor + '33' }}>
                      <span className="text-gray-300 mr-0.5" style={{ fontSize: 10 }}>└</span>
                      <svg className="w-3 h-3 flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {filha.nome}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {sessaoSelecionada && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Sessão: <strong style={{ color: sessaoSelecionada.cor }}>{sessaoSelecionada.nome}</strong>
            </p>
          )}
        </div>

        {/* Categoria */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
            <a href="/categorias" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">+ Gerenciar categorias</a>
          </div>
          {categorias.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
              Nenhuma categoria.{' '}
              <a href="/categorias" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">Criar agora</a>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => (
                <button key={cat.id} type="button" onClick={() => { categoriaAutoSetRef.current = false; setCategoriaId(cat.id) }}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition border-2 ${cat.cor}
                    ${categoriaId === cat.id ? 'border-gray-600 dark:border-gray-400 scale-105' : 'border-transparent'}`}>
                  {cat.nome}
                </button>
              ))}
            </div>
          )}
          {categoriaSelecionada && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Categoria: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoriaSelecionada.cor}`}>
                {categoriaSelecionada.nome}
              </span>
            </p>
          )}
        </div>

        {/* Credenciais */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setComCredencial(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                ${comCredencial ? 'bg-gray-800 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <svg className={`w-4 h-4 ${comCredencial ? 'text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Credenciais de acesso</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">RDP, VPN, SSH, FTP — senhas criptografadas com AES-256</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition
              ${comCredencial ? 'bg-gray-800 dark:bg-gray-700 border-gray-800 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600'}`}>
              {comCredencial && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
          {comCredencial && (
            <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="p-4 space-y-3">
                {credenciais.map((cred, idx) => (
                  <FormCredencial
                    key={idx}
                    credencial={cred}
                    indice={idx}
                    total={credenciais.length}
                    modoEdicao={modo === 'editar'}
                    onChange={dados => atualizarCredencial(idx, dados)}
                    onRemover={() => removerCredencial(idx)}
                  />
                ))}
                <button type="button" onClick={adicionarCredencial}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2
                             border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400
                             hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400
                             hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar outro acesso
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Conteúdo
            {privado && comCredencial && (
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(opcional)</span>
            )}
          </label>
          <Editor conteudo={conteudo} onChange={setConteudo} />
        </div>

        {/* Anexos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Anexos <span className="text-gray-400 dark:text-gray-500 font-normal">(imagens e PDFs)</span>
          </label>
          <UploadAnexos onUpload={setAnexos} arquivosExistentes={anexos} />
        </div>

        {erro && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-4 py-3 rounded-xl">
            {erro}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={() => confirmarSaida(() => navigate(-1))}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white
                       font-medium px-5 py-2.5 rounded-xl text-sm transition
                       disabled:opacity-60 disabled:cursor-not-allowed">
            {salvando
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>{modo === 'criar' ? 'Salvar registro' : 'Salvar alterações'}</>
            }
          </button>
        </div>
      </form>
    </>
  )
}
