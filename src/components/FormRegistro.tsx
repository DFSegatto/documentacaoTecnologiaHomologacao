import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

interface Props {
  inicial?: RegistroFormData
  modo: 'criar' | 'editar'
}

export default function FormRegistro({ inicial, modo }: Props) {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const [titulo,        setTitulo]        = useState(inicial?.titulo       ?? '')
  const [sessaoId,      setSessaoId]      = useState(inicial?.sessao_id    ?? searchParams.get('sessao') ?? '')
  const [categoriaId,   setCategoriaId]   = useState(inicial?.categoria_id ?? '')
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

  useEffect(() => {
    supabase.from('sessoes').select('*').order('nome').then(({ data }) => {
      const lista = (data ?? []) as Sessao[]
      setSessoes(lista)
      setArvore(agruparSessoes(lista))
    })
    supabase.from('categorias').select('*').order('nome').then(({ data }) => {
      const cats = (data ?? []) as CategoriaDB[]
      setCategorias(cats)
      if (!categoriaId && cats.length > 0) setCategoriaId(cats[0].id)
    })
  }, [])

  function adicionarCredencial() {
    setCredenciais(prev => [...prev, { ...CREDENCIAL_VAZIA }])
  }

  function atualizarCredencial(indice: number, dados: CredencialForm) {
    setCredenciais(prev => prev.map((c, i) => i === indice ? dados : c))
  }

  function removerCredencial(indice: number) {
    setCredenciais(prev => prev.filter((_, i) => i !== indice))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return }

    const conteudoVazio = !conteudo.trim() || conteudo === '<p></p>'
    if (conteudoVazio && !(privado && comCredencial)) {
      setErro('O conteúdo não pode estar vazio.'); return
    }
    if (!categoriaId) { setErro('Selecione uma categoria.'); return }

    setSalvando(true); setErro('')

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

      // Salvar credenciais — apaga todas e reinserindo na ordem
      // Na edição, busca senhas cifradas atuais para reutilizar se campo senha estiver vazio
      let senhasAtuais: Record<number, string> = {}
      if (modo === 'editar' && comCredencial) {
        const { data: credsAtuais } = await supabase
          .from('credenciais')
          .select('ordem, senha_cifrada')
          .eq('registro_id', registroId)
          .order('ordem', { ascending: true })
        credsAtuais?.forEach(c => { senhasAtuais[c.ordem] = c.senha_cifrada })
      }

      await supabase.from('credenciais').delete().eq('registro_id', registroId)

      if (comCredencial && credenciais.length > 0) {
        const paraInserir = await Promise.all(
          credenciais.map(async (cred, idx) => {
            // Se senha vazia na edição, reutiliza a cifrada existente
            const credParaCifrar = { ...cred }
            if (!credParaCifrar.senha && modo === 'editar' && senhasAtuais[idx]) {
              // Usa a senha cifrada existente diretamente
              const cifrada = await criptografarCredencial({ ...credParaCifrar, senha: '' }, user.id)
              return {
                registro_id:   registroId,
                tipo:          cifrada.tipo,
                label:         cifrada.label,
                host:          cifrada.host,
                porta:         cifrada.porta,
                usuario:       cifrada.usuario,
                senha_cifrada: senhasAtuais[idx], // mantém a cifrada original
                dominio:       cifrada.dominio,
                observacoes:   cifrada.observacoes,
                ordem:         idx,
              }
            }
            const cifrada = await criptografarCredencial(credParaCifrar, user.id)
            return {
              registro_id:   registroId,
              tipo:          cifrada.tipo,
              label:         cifrada.label,
              host:          cifrada.host,
              porta:         cifrada.porta,
              usuario:       cifrada.usuario,
              senha_cifrada: cifrada.senha_cifrada,
              dominio:       cifrada.dominio,
              observacoes:   cifrada.observacoes,
              ordem:         idx,
            }
          })
        )
        const { error: errCred } = await supabase.from('credenciais').insert(paraInserir)
        if (errCred) throw errCred
      }

      // Anexos
      await supabase.from('anexos').delete().eq('registro_id', registroId)
      if (anexos.length > 0) {
        await supabase.from('anexos').insert(
          anexos.map(a => ({ registro_id: registroId, nome: a.nome, url: a.url, tipo: a.tipo, tamanho: a.tamanho }))
        )
      }

      navigate(`/registros/${registroId}`)
    } catch (err) {
      console.error(err)
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const sessaoSelecionada    = sessoes.find(s => s.id === sessaoId)
  const categoriaSelecionada = categorias.find(c => c.id === categoriaId)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                ${!sessaoId ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-700' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              Sem sessão
            </button>
            {arvore.map(sessao => (
              <div key={sessao.id} className="flex flex-col gap-1.5">
                <button type="button" onClick={() => setSessaoId(sessao.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition border-2
                    ${sessaoId === sessao.id ? 'text-white border-transparent' : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}
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
                      ${sessaoId === filha.id ? 'text-white border-transparent' : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}
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
              <button key={cat.id} type="button" onClick={() => setCategoriaId(cat.id)}
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

      {/* Bloco de Credenciais */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {/* Header — toggle */}
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

        {/* Lista de credenciais */}
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

              {/* Botão adicionar */}
              <button type="button" onClick={adicionarCredencial}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2
                           border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-brand-300
                           dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition">
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

      {erro && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-4 py-3 rounded-xl">{erro}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <button type="button" onClick={() => navigate(-1)}
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
  )
}
