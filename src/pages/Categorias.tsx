import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, CORES_CATEGORIA, type CategoriaDB } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Categorias({ user }: { user: User | null }) {
  const [categorias,   setCategorias]   = useState<CategoriaDB[]>([])
  const [loading,      setLoading]      = useState(true)
  const [salvando,     setSalvando]     = useState(false)
  const [excluindo,    setExcluindo]    = useState<string | null>(null)
  const [editando,     setEditando]     = useState<CategoriaDB | null>(null)
  const [novoNome,     setNovoNome]     = useState('')
  const [novaCor,      setNovaCor]      = useState(CORES_CATEGORIA[0].value)
  const [erro,         setErro]         = useState('')
  const [mostrarForm,  setMostrarForm]  = useState(false)

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .order('nome')
    setCategorias((data ?? []) as CategoriaDB[])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function iniciarEdicao(cat: CategoriaDB) {
    setEditando(cat)
    setNovoNome(cat.nome)
    setNovaCor(cat.cor)
    setMostrarForm(true)
    setErro('')
  }

  function cancelar() {
    setEditando(null)
    setNovoNome('')
    setNovaCor(CORES_CATEGORIA[0].value)
    setMostrarForm(false)
    setErro('')
  }

  async function salvar() {
    if (!novoNome.trim()) { setErro('O nome é obrigatório.'); return }
    setSalvando(true)
    setErro('')

    if (editando) {
      const { error } = await supabase
        .from('categorias')
        .update({ nome: novoNome.trim(), cor: novaCor })
        .eq('id', editando.id)
      if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }
    } else {
      const { error } = await supabase
        .from('categorias')
        .insert({ nome: novoNome.trim(), cor: novaCor })
      if (error) { setErro('Erro ao criar categoria.'); setSalvando(false); return }
    }

    await carregar()
    cancelar()
    setSalvando(false)
  }

  async function excluir(id: string) {
    setExcluindo(id)
    await supabase.from('categorias').delete().eq('id', id)
    await carregar()
    setExcluindo(null)
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-2xl mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200">Categorias</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Categorias</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crie e gerencie as categorias dos registros</p>
          </div>
          {!mostrarForm && (
            <button
              onClick={() => { setMostrarForm(true); setEditando(null); setNovoNome(''); setNovaCor(CORES_CATEGORIA[0].value) }}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova categoria
            </button>
          )}
        </div>

        {mostrarForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editando ? 'Editar categoria' : 'Nova categoria'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && salvar()}
                  placeholder="Ex: Treinamento, Integração..."
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_CATEGORIA.map(cor => (
                    <button
                      key={cor.value}
                      type="button"
                      onClick={() => setNovaCor(cor.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border-2 ${cor.value}
                        ${novaCor === cor.value ? 'border-gray-500 scale-105' : 'border-transparent'}`}
                    >
                      {cor.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Pré-visualização:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${novaCor}`}>
                    {novoNome || 'Nome da categoria'}
                  </span>
                </div>
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={cancelar}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                  Cancelar
                </button>
                <button type="button" onClick={salvar} disabled={salvando}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition disabled:opacity-60">
                  {salvando
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>{editando ? 'Salvar alterações' : 'Criar categoria'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🏷</div>
              <p className="font-medium text-gray-600">Nenhuma categoria criada</p>
              <p className="text-sm mt-1">Clique em "Nova categoria" para começar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {categorias.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.cor}`}>
                      {cat.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => iniciarEdicao(cat)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => excluir(cat.id)}
                      disabled={excluindo === cat.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Excluir"
                    >
                      {excluindo === cat.id
                        ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
