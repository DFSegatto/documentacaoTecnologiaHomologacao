import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Campo {
  tag: string; label: string
  tipo: 'String' | 'Integer' | 'Double' | 'DateTime'
  obrigatorio: boolean; descricao: string
  opcoes?: string; mascara?: string
}
interface Secao { tag: string; label: string; campos: Campo[]; filhos?: Secao[] }
interface Porta  { id: string; nome: string; label: string; secoes: Secao[] }
interface WsComFormulario {
  id: string; nome: string; classe: string; modulo: string; portas: Porta[]
}


// ── Formulário gerado por IA ──────────────────────────────────────────────────
interface WsIA {
  classe: string
  porta:  string
  secoes: Secao[]
}
// ── Catálogo completo (documentação oficial) ──────────────────────────────────
interface WsCatalogo {
  classe: string; descricao: string; url: string; modulo: string
}

const BASE = 'https://documentacao.senior.com.br/gestaoempresarialerp/5.10.4/webservices/'
function url(slug: string) { return BASE + slug + '.htm' }

const CATALOGO: WsCatalogo[] = [
  // Ação SID
  { modulo: 'Ação SID',     classe: 'com.senior.g5.co.ger.portal.prop', descricao: 'Portal de propriedades', url: url('com_senior_g5_co_ger_portal_prop') },
  { modulo: 'Ação SID',     classe: 'com.senior.g5.co.ger.sid',          descricao: 'SID — Serviço de Identificação Distribuída', url: url('com_senior_g5_co_ger_sid') },

  // Cadastros
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.apr.niveisaprovacao',   descricao: 'Níveis de aprovação', url: url('com_senior_g5_co_ger_apr_niveisaprovacao') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.centrocusto',       descricao: 'Centros de Custo — exportação e consulta', url: url('com_senior_g5_co_ger_cad_centrocusto') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.centrorecurso',     descricao: 'Consulta de centros de recurso', url: url('com_senior_g5_co_ger_cad_centrorecurso') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.clientes',          descricao: 'Gravar, consultar e excluir clientes', url: url('com_senior_g5_co_ger_cad_clientes') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.cidades',               descricao: 'Exportar cadastro de cidades (RAIS - SIG)', url: url('com_senior_g5_co_cad_cidades') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.contribuinte',          descricao: 'Consulta de cadastro do contribuinte', url: url('com_senior_g5_co_cad_contribuinte') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.deposito',              descricao: 'Depósito — exportação e consulta', url: url('com_senior_g5_co_cad_deposito') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.derivacao',             descricao: 'Alteração do preço de custo de derivações', url: url('com_senior_g5_co_cad_derivacao') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.duplicarempresa',       descricao: 'Duplicar empresas', url: url('com_senior_g5_co_cad_duplicarempresa') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.exportarrateio',        descricao: 'Retorno de rateios do tipo C', url: url('com_senior_g5_co_cad_exportarrateio') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.familiaparametros',     descricao: 'Exportação de parâmetros da família', url: url('com_senior_g5_co_cad_familiaparametros') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.cad.parametrosintegracao',  descricao: 'Exportação de parâmetros de integração do produto', url: url('com_senior_g5_co_cad_parametrosintegracao') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.favorecido',        descricao: 'Cadastro de favorecidos', url: url('com_senior_g5_co_ger_cad_favorecido') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.fornecedor',        descricao: 'Fornecedor (versão simplificada)', url: url('com_senior_g5_co_ger_cad_fornecedor') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.fornecedores',      descricao: 'Gravar, consultar e excluir fornecedores', url: url('com_senior_g5_co_ger_cad_fornecedores') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.impostos',          descricao: 'Cadastro de impostos', url: url('com_senior_g5_co_ger_cad_impostos') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.marcaveiculo',      descricao: 'Incluir ou excluir marca de veículo', url: url('com_senior_g5_co_ger_cad_marcaveiculo') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.ModeloPlano',       descricao: 'Modelo de plano', url: url('com_senior_g5_co_ger_cad_modeloplano') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.modeloveiculo',     descricao: 'Incluir ou excluir modelo de veículo', url: url('com_senior_g5_co_ger_cad_modeloveiculo') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.motivoparada',      descricao: 'Consulta de motivos de parada', url: url('com_senior_g5_co_ger_cad_motivoparada') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.motivos',           descricao: 'Cadastro de motivos', url: url('com_senior_g5_co_ger_cad_motivos') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.operador',          descricao: 'Consulta de operadores', url: url('com_senior_g5_co_ger_cad_operador') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.produto',           descricao: 'Gravar, consultar e excluir produtos', url: url('com_senior_g5_co_ger_cad_produto') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.produto.origemProduto', descricao: 'Origem do produto — exportação e consulta', url: url('com_senior_g5_co_ger_cad_produto_origemproduto') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.produto.safra',     descricao: 'Safras — exportação e consulta', url: url('com_senior_g5_co_ger_cad_produto_safra') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.propriedadeSubpropriedade', descricao: 'Propriedades e subpropriedades', url: url('com_senior_g5_co_ger_cad_propriedadesubpropriedade') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.sacado',            descricao: 'Cadastro de sacados', url: url('com_senior_g5_co_ger_cad_sacado') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.SerieNF',           descricao: 'Série de nota fiscal', url: url('com_senior_g5_co_ger_cad_serienf') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.servico',           descricao: 'Cadastro de serviços', url: url('com_senior_g5_co_ger_cad_servico') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.tipoveiculo',       descricao: 'Importar ou excluir tipos de veículo', url: url('com_senior_g5_co_ger_cad_tipoveiculo') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.transportadora',    descricao: 'Cadastro de transportadoras', url: url('com_senior_g5_co_ger_cad_transportadora') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.usuario',           descricao: 'Cadastro de usuários', url: url('com_senior_g5_co_ger_cad_usuario') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.veiculo',           descricao: 'Importação do cadastro de veículos', url: url('com_senior_g5_co_ger_cad_veiculo') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.convenio',              descricao: 'Convênios', url: url('com_senior_g5_co_ger_convenio') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.int.padrao.pessoa',         descricao: 'Pessoa padrão', url: url('com_senior_g5_co_int_padrao_pessoa') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.int.agr.pesagem',           descricao: 'Pesagem de entrada/saída de veículo (balança)', url: url('com_senior_g5_co_int_agr_pesagem') },
  { modulo: 'Cadastros', classe: 'com.senior.g5.co.ger.cad.controladoria.tributos.unidadeimobiliaria', descricao: 'Unidades imobiliárias', url: url('com_senior_g5_co_ger_cad_controladoria_tributos_unidadeimobiliaria') },

  // Controladoria
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.ger.cad.controladoria.tributos.dispositivosfiscais', descricao: 'Manutenção de dispositivos fiscais', url: url('com_senior_g5_co_ger_cad_controladoria_tributos_dispositivosfiscais') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.ger.cad.controladoria.tributos.tarifabancaria',     descricao: 'Tarifas bancárias — inserir, alterar e excluir', url: url('com_senior_g5_co_ger_cad_controladoria_tributos_tarifabancaria') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.apropriacaodoscustos',    descricao: 'Consultar apropriação dos custos por centro de custo/conta', url: url('com_senior_g5_co_mct_ctb_apropriacaodoscustos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.conciliacaosaldos',       descricao: 'Conciliação de saldos contábeis', url: url('com_senior_g5_co_mct_ctb_conciliacaosaldos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.criteriodedistribuicao',  descricao: 'Critério de distribuição — inserir, alterar e excluir', url: url('com_senior_g5_co_mct_ctb_criteriodedistribuicao') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.dimp',                        descricao: 'DIMP', url: url('com_senior_g5_co_mct_dimp') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.exportacaoempresafilial', descricao: 'Exportação de empresa/filial contábil', url: url('com_senior_g5_co_mct_ctb_exportacaoempresafilial') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.exportacaoorcado',        descricao: 'Exportação do orçado contábil', url: url('com_senior_g5_co_mct_ctb_exportacaoorcado') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.exportacaoplanocontas',   descricao: 'Exportação do plano de contas', url: url('com_senior_g5_co_mct_ctb_exportacaoplanocontas') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.exportacaorealizado',     descricao: 'Exportação do realizado contábil', url: url('com_senior_g5_co_mct_ctb_exportacaorealizado') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.gerarlotectb',            descricao: 'Gerar lote contábil', url: url('com_senior_g5_co_mct_ctb_gerarlotectb') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.importacaolctctb',        descricao: 'Importação de lançamentos contábeis', url: url('com_senior_g5_co_mct_ctb_importacaolctctb') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.integracao',              descricao: 'Integração contábil', url: url('com_senior_g5_co_mct_ctb_integracao') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.processarlotectb',        descricao: 'Processar lote contábil', url: url('com_senior_g5_co_mct_ctb_processarlotectb') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.relacionamentocriteriodistribuicao', descricao: 'Relacionamento conta contábil × centro de custo para distribuição', url: url('com_senior_g5_co_mct_ctb_relacionamentocriteriodistribuicao') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.visaocontabil',           descricao: 'Visão contábil', url: url('com_senior_g5_co_mct_ctb_visaocontabil') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.fci',                         descricao: 'FCI — Ficha de Conteúdo de Importação', url: url('com.senior.g5.co.mct.fci') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.gravarnotafiscalentrada', descricao: 'Gravar nota fiscal de entrada em tributos', url: url('com_senior_g5_co_mct_imp_gravarnotafiscalentrada') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.gravarnotafiscalsaida',   descricao: 'Gravar nota fiscal de saída em tributos', url: url('com_senior_g5_co_mct_imp_gravarnotafiscalsaida') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.notafiscalentradasimplificado', descricao: 'Importar NF de entrada simplificada direto em Tributos', url: url('com_senior_g5_co_mct_imp_notafiscalentradasimplificado') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.notafiscalsaidasimplificado',   descricao: 'Importar NF de saída simplificada para Compliance Fiscal', url: url('com_senior_g5_co_mct_imp_notafiscalsaidasimplificado') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.integracao.notasfiscais', descricao: 'Integração de documentos fiscais para Tributos (F660INT)', url: url('com_senior_g5_co_mct_imp_escrituracao_integracao_notasfiscais') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamentos.titulos', descricao: 'Integração de títulos, rateios e baixas', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamentos_titulos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamentos.estornolancamentos', descricao: 'Estornar notas fiscais de entrada e saída', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamentos_estornolancamentos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.importarnotasfiscaisentrada', descricao: 'Importar notas fiscais de entrada', url: url('com_senior_g5_co_mct_imp_importarnotasfiscaisentrada') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.excluirnotafiscalentrada', descricao: 'Excluir nota fiscal de entrada de tributos', url: url('com_senior_g5_co_mct_imp_excluirnotafiscalentrada') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.exclusaocalculo',          descricao: 'Exclusão de apurações de impostos', url: url('com_senior_g5_co_mct_imp_exclusaocalculo') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.rpa.importacaolancamentos', descricao: 'Importar RPAs em lote na Gestão de Tributos', url: url('com_senior_g5_co_mct_imp_rpa_importacaolancamentos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.rpa.exportacaolancamentos', descricao: 'Exportar RPAs em lote na Gestão de Tributos', url: url('com_senior_g5_co_mct_imp_rpa_exportacaolancamentos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.rpa.exclusaolancamentos',  descricao: 'Excluir RPAs em lote na Gestão de Tributos', url: url('com_senior_g5_co_mct_imp_rpa_exclusaolancamentos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.retencaopessoafisica',  descricao: 'EFD-Reinf R-4010 — Retenções na fonte pessoa física', url: url('com_senior_g5_co_mct_imp_reinf_retencaopessoafisica') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.retencaopessoajuridica', descricao: 'EFD-Reinf R-4020 — Retenções na fonte pessoa jurídica', url: url('com_senior_g5_co_mct_imp_reinf_retencaopessoajuridica') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.retencaobeneficiarionaoidentificado', descricao: 'EFD-Reinf R-4040 — Retenções beneficiário não identificado', url: url('com_senior_g5_co_mct_imp_reinf_retencaobeneficiarionaoidentificado') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.retencaorecebimento',   descricao: 'EFD-Reinf R-4080 — Retenção no recebimento', url: url('com_senior_g5_co_mct_imp_reinf_retencaorecebimento') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.contribuicaoprevidenciaria', descricao: 'EFD-Reinf — Contribuição previdenciária', url: url('com_senior_g5_co_mct_imp_reinf_contribuicaoprevidenciaria') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.servicostomados',      descricao: 'EFD-Reinf — Serviços tomados', url: url('com_senior_g5_co_mct_imp_reinf_servicostomados') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.receitasrecebidas',    descricao: 'EFD-Reinf — Receitas recebidas', url: url('com_senior_g5_co_mct_imp_reinf_receitasrecebidas') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.receitasrepassadas',   descricao: 'EFD-Reinf — Receitas repassadas', url: url('com_senior_g5_co_mct_imp_reinf_receitasrepassadas') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.comercializacaoproducaorural', descricao: 'EFD-Reinf — Comercialização de produção rural', url: url('com_senior_g5_co_mct_imp_reinf_comercializacaoproducaorural') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.importaraquisicaoproducaorural', descricao: 'EFD-Reinf R-2055 — Aquisição de produção rural', url: url('com_senior_g5_co_mct_imp_reinf_importaraquisicaoproducaorural') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.entidadepromotoraespetaculodesportivo', descricao: 'EFD-Reinf — Entidades promotoras de espetáculos desportivos', url: url('com_senior_g5_co_mct_imp_reinf_entidadepromotoraespetaculodesportivo') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.reinf.detalhamentoretencoes', descricao: 'EFD-Reinf — Detalhamento de retenções', url: url('com_senior_g5_co_mct_imp_reinf_detalhamentoretencoes') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.detalhamentoreceitasdeducoesexclusoespiscofins', descricao: 'Importar receitas/deduções e exclusões de PIS/COFINS', url: url('com_senior_g5_co_mct_imp_detalhamentoreceitasdeducoesexclusoespiscofins') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamento.producaoestoque.fichatecnica', descricao: 'SPED Bloco K — Fichas técnicas', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamento_producaoestoque_fichatecnica') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamento.producaoestoque.apontamentosproducao', descricao: 'SPED Bloco K — Apontamentos de produção', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamento_producaoestoque_apontamentosproducao') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamento.producaoestoque.saldoestoque', descricao: 'SPED Bloco K — Saldos em estoque', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamento_producaoestoque_saldoestoque') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamento.producaoestoque.periodoapuracao', descricao: 'SPED Bloco K — Períodos de apuração', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamento_producaoestoque_periodoapuracao') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamento.producaoestoque.transferenciaentreprodutos', descricao: 'SPED Bloco K — Transferência entre produtos', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamento_producaoestoque_transferenciaentreprodutos') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.lancamento.producaoestoque.producaoconjunta', descricao: 'SPED Bloco K — Produção conjunta', url: url('com_senior_g5_co_mct_imp_escrituracao_lancamento_producaoestoque_producaoconjunta') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.integracao.producaoestoque', descricao: 'SPED Bloco K — Integração produção e estoque (F660ISP)', url: url('com_senior_g5_co_mct_imp_escrituracao_integracao_producaoestoque') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.imp.escrituracao.integracao.guiarecolhimento', descricao: 'Guias de recolhimento — exportar e modificar', url: url('com_senior_g5_co_mct_imp_escrituracao_integracao_guiarecolhimento') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.aglutinacaocomposicao',   descricao: 'Aglutinação por composição contábil', url: url('com_senior_g5_co_mct_ctb_aglutinacaocomposicao') },
  { modulo: 'Controladoria', classe: 'com.senior.g5.co.mct.ctb.aglutinacaocontabil',     descricao: 'Aglutinação contábil', url: url('com_senior_g5_co_mct_ctb_aglutinacaocontabil') },

  // Mercado / Vendas
  { modulo: 'Mercado — Vendas', classe: 'com.senior.g5.co.mcm.ven.pedidos',    descricao: 'Gravar, exportar e simular pedidos de venda', url: url('com_senior_g5_co_mcm_ven_pedidos') },
  { modulo: 'Mercado — Vendas', classe: 'com.senior.g5.co.mcm.ven.orcamento',  descricao: 'Gravar, exportar e carregar orçamentos', url: url('com_senior_g5_co_mcm_ven_orcamento') },
  { modulo: 'Mercado — Vendas', classe: 'com.senior.g5.co.mcm.ven.embarque',   descricao: 'Controle de embarque', url: url('com_senior_g5_co_mcm_ven_embarque') },
  { modulo: 'Mercado — Vendas', classe: 'com.senior.g5.co.mcm.ven.notasfiscais', descricao: 'Notas fiscais de saída', url: url('com_senior_g5_co_mcm_ven_notasfiscais') },

  // Suprimentos / Compras
  { modulo: 'Suprimentos — Compras', classe: 'com.senior.g5.co.mcm.cpr.ordemcompra',   descricao: 'Exportação de ordens de compra', url: url('com_senior_g5_co_mcm_cpr_ordemcompra') },
  { modulo: 'Suprimentos — Compras', classe: 'com.senior.g5.co.mcm.cpr.cotacao',       descricao: 'Cotações de compra', url: url('com_senior_g5_co_mcm_cpr_cotacao') },
  { modulo: 'Suprimentos — Compras', classe: 'com.senior.g5.co.mcm.est.requisicoes',   descricao: 'Requisições de estoque', url: url('com_senior_g5_co_mcm_est_requisicoes') },
  { modulo: 'Suprimentos — Compras', classe: 'com.senior.g5.co.mcm.est.transferencias', descricao: 'Transferências de estoque', url: url('com_senior_g5_co_mcm_est_transferencias') },
  { modulo: 'Suprimentos — Compras', classe: 'com.senior.g5.co.mcm.est.inventario',    descricao: 'Inventário de estoque', url: url('com_senior_g5_co_mcm_est_inventario') },

  // Financeiro
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.pag.titulosPagar',      descricao: 'Títulos a pagar — gravar e consultar', url: url('com_senior_g5_co_mfi_pag_titulospagar') },
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.rec.titulosReceber',     descricao: 'Títulos a receber — gravar e consultar', url: url('com_senior_g5_co_mfi_rec_titulosreceber') },
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.rec.baixatitulos',       descricao: 'Baixa de títulos a receber', url: url('com_senior_g5_co_mfi_rec_baixatitulos') },
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.pag.baixatitulos',       descricao: 'Baixa de títulos a pagar', url: url('com_senior_g5_co_mfi_pag_baixatitulos') },
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.bancos.remessa',         descricao: 'Remessa bancária', url: url('com_senior_g5_co_mfi_bancos_remessa') },
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.bancos.retorno',         descricao: 'Retorno bancário', url: url('com_senior_g5_co_mfi_bancos_retorno') },
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.fluxocaixa',             descricao: 'Fluxo de caixa', url: url('com_senior_g5_co_mfi_fluxocaixa') },
  { modulo: 'Financeiro', classe: 'com.senior.g5.co.mfi.ent.nfe',                descricao: 'Notas fiscais de entrada', url: url('com_senior_g5_co_mfi_ent_nfe') },

  // RPA
  { modulo: 'RPA', classe: 'com.senior.g5.co.ger.cad.rpa.exclusaolotacao',    descricao: 'Exclusão da lotação tributária', url: url('com_senior_g5_co_ger_cad_rpa_exclusaolotacao') },
  { modulo: 'RPA', classe: 'com.senior.g5.co.ger.cad.rpa.exportacaolotacao',  descricao: 'Exportação do cadastro de lotação e ligações', url: url('com_senior_g5_co_ger_cad_rpa_exportacaolotacao') },

  // Varejo / Integração
  { modulo: 'Varejo / Integração', classe: 'com.senior.g5.co.int.varejo.estoque', descricao: 'Estoque de varejo', url: url('com_senior_g5_co_int_varejo_estoque') },
]

const MODULOS = [...new Set(CATALOGO.map(w => w.modulo))]

// ── Webservices com formulário detalhado ──────────────────────────────────────
const WS_FORMULARIOS: WsComFormulario[] = [
  {
    id: 'clientes', nome: 'Clientes', classe: 'com.senior.g5.co.ger.cad.clientes', modulo: 'Cadastros',
    portas: [{
      id: 'GravarClientes', nome: 'GravarClientes', label: 'Gravar / Atualizar Cliente',
      secoes: [
        { tag: 'dadosGeraisCliente', label: 'Dados Gerais', campos: [
          { tag: 'codCli', label: 'Código do Cliente',    tipo: 'Integer', obrigatorio: true,  descricao: 'Number(009) — gerado automaticamente se omitido.' },
          { tag: 'nomCli', label: 'Nome / Razão Social',  tipo: 'String',  obrigatorio: true,  descricao: 'String(100)' },
          { tag: 'apeCli', label: 'Nome Fantasia',        tipo: 'String',  obrigatorio: true,  descricao: 'String(050)' },
          { tag: 'tipCli', label: 'Tipo de Pessoa',       tipo: 'String',  obrigatorio: true,  descricao: 'J=Jurídica, F=Física', opcoes: 'J=Jurídica, F=Física' },
          { tag: 'tipMer', label: 'Tipo de Mercado',      tipo: 'String',  obrigatorio: true,  descricao: '', opcoes: 'I=Interno, E=Externo, P=Prospect' },
          { tag: 'cliCon', label: 'Contribuinte ICMS',    tipo: 'String',  obrigatorio: true,  descricao: '', opcoes: 'S=Sim, N=Não' },
          { tag: 'cgcCpf', label: 'CNPJ / CPF',          tipo: 'String',  obrigatorio: false, descricao: 'Number(014)' },
          { tag: 'insEst', label: 'Inscrição Estadual',   tipo: 'String',  obrigatorio: false, descricao: 'String(025)' },
          { tag: 'endCli', label: 'Endereço',             tipo: 'String',  obrigatorio: false, descricao: 'String(100)' },
          { tag: 'nenCli', label: 'Número',               tipo: 'String',  obrigatorio: false, descricao: 'String(060)' },
          { tag: 'cplEnd', label: 'Complemento',          tipo: 'String',  obrigatorio: false, descricao: 'String(020)' },
          { tag: 'baiCli', label: 'Bairro',               tipo: 'String',  obrigatorio: false, descricao: 'String(075)' },
          { tag: 'cidCli', label: 'Cidade',               tipo: 'String',  obrigatorio: false, descricao: 'String(060)' },
          { tag: 'sigUfs', label: 'UF',                   tipo: 'String',  obrigatorio: false, descricao: 'String(002)' },
          { tag: 'cepCli', label: 'CEP',                  tipo: 'String',  obrigatorio: false, descricao: 'Number(008)' },
          { tag: 'codPai', label: 'País',                 tipo: 'String',  obrigatorio: false, descricao: 'String(004)' },
          { tag: 'fonCli', label: 'Telefone',             tipo: 'String',  obrigatorio: false, descricao: 'String(020)' },
          { tag: 'intNet', label: 'E-mail',               tipo: 'String',  obrigatorio: false, descricao: 'String(100)' },
          { tag: 'emaNfe', label: 'E-mail NF-e',          tipo: 'String',  obrigatorio: false, descricao: 'String(100)' },
          { tag: 'sitCli', label: 'Situação',             tipo: 'String',  obrigatorio: false, descricao: '', opcoes: 'A=Ativo, I=Inativo' },
          { tag: 'ideExt', label: 'Identificador Externo',tipo: 'String',  obrigatorio: false, descricao: 'Chave em sistema externo' },
        ], filhos: [{ tag: 'definicoesCliente', label: 'Definições por Filial', campos: [
          { tag: 'codEmp', label: 'Empresa',              tipo: 'Integer', obrigatorio: true,  descricao: 'Código da empresa' },
          { tag: 'codFil', label: 'Filial',               tipo: 'Integer', obrigatorio: true,  descricao: 'Código da filial' },
          { tag: 'codCpg', label: 'Condição de Pagamento',tipo: 'String',  obrigatorio: true,  descricao: 'Obrigatório para GO UP' },
          { tag: 'codFpg', label: 'Forma de Pagamento',   tipo: 'Integer', obrigatorio: true,  descricao: 'Obrigatório para GO UP' },
          { tag: 'codCrp', label: 'Grupo C/R',           tipo: 'String',  obrigatorio: true,  descricao: 'Grupo de contas a receber — obrigatório para GO UP' },
          { tag: 'vlrLim', label: 'Limite de Crédito',    tipo: 'Double',  obrigatorio: false, descricao: '' },
          { tag: 'codTab', label: 'Tabela de Preço',      tipo: 'String',  obrigatorio: false, descricao: '' },
          { tag: 'codRep', label: 'Representante',        tipo: 'Integer', obrigatorio: false, descricao: '' },
          { tag: 'codVen', label: 'Vendedor',             tipo: 'Integer', obrigatorio: false, descricao: '' },
          { tag: 'codTra', label: 'Transportadora',       tipo: 'Integer', obrigatorio: false, descricao: '' },
          { tag: 'cifFob', label: 'CIF/FOB',             tipo: 'String',  obrigatorio: false, descricao: '', opcoes: 'C=CIF, F=FOB' },
        ]}] },
        { tag: 'root', label: 'Controle', campos: [
          { tag: 'sigInt', label: 'Sistema Integrador', tipo: 'String', obrigatorio: false, descricao: '' },
          { tag: 'idtReq', label: 'ID da Requisição',   tipo: 'String', obrigatorio: false, descricao: '' },
        ]},
      ],
    }],
  },
  {
    id: 'fornecedores', nome: 'Fornecedores', classe: 'com.senior.g5.co.ger.cad.fornecedores', modulo: 'Cadastros',
    portas: [{
      id: 'GravarFornecedores', nome: 'GravarFornecedores', label: 'Gravar / Atualizar Fornecedor',
      secoes: [{ tag: 'dadosGeraisFornecedor', label: 'Dados Gerais', campos: [
        { tag: 'codFor', label: 'Código',         tipo: 'Integer', obrigatorio: true,  descricao: 'Number(009)' },
        { tag: 'nomFor', label: 'Nome',           tipo: 'String',  obrigatorio: true,  descricao: 'String(100)' },
        { tag: 'apeFor', label: 'Nome Fantasia',  tipo: 'String',  obrigatorio: true,  descricao: 'String(050)' },
        { tag: 'tipFor', label: 'Tipo de Pessoa', tipo: 'String',  obrigatorio: true,  descricao: '', opcoes: 'J=Jurídica, F=Física' },
        { tag: 'cgcCpf', label: 'CNPJ / CPF',    tipo: 'String',  obrigatorio: false, descricao: 'Number(014)' },
        { tag: 'insEst', label: 'Insc. Estadual', tipo: 'String',  obrigatorio: false, descricao: 'String(025)' },
        { tag: 'endFor', label: 'Endereço',       tipo: 'String',  obrigatorio: false, descricao: 'String(100)' },
        { tag: 'nenFor', label: 'Número',         tipo: 'String',  obrigatorio: false, descricao: 'String(060)' },
        { tag: 'cplEnd', label: 'Complemento',    tipo: 'String',  obrigatorio: false, descricao: 'String(020)' },
        { tag: 'baiFor', label: 'Bairro',         tipo: 'String',  obrigatorio: false, descricao: 'String(075)' },
        { tag: 'cidFor', label: 'Cidade',         tipo: 'String',  obrigatorio: false, descricao: 'String(060)' },
        { tag: 'sigUfs', label: 'UF',             tipo: 'String',  obrigatorio: false, descricao: 'String(002)' },
        { tag: 'cepFor', label: 'CEP',            tipo: 'String',  obrigatorio: false, descricao: 'Number(008)' },
        { tag: 'fonFor', label: 'Telefone',       tipo: 'String',  obrigatorio: false, descricao: 'String(020)' },
        { tag: 'intNet', label: 'E-mail',         tipo: 'String',  obrigatorio: false, descricao: 'String(100)' },
        { tag: 'sitFor', label: 'Situação',       tipo: 'String',  obrigatorio: false, descricao: '', opcoes: 'A=Ativo, I=Inativo' },
      ]}],
    }],
  },
  {
    id: 'pedidos', nome: 'Pedidos de Venda', classe: 'com.senior.g5.co.mcm.ven.pedidos', modulo: 'Mercado — Vendas',
    portas: [{
      id: 'GravarPedidos', nome: 'GravarPedidos', label: 'Gravar / Atualizar Pedido',
      secoes: [{ tag: 'pedido', label: 'Cabeçalho do Pedido', campos: [
        { tag: 'opeExe',  label: 'Operação',              tipo: 'String',   obrigatorio: true,  descricao: '', opcoes: 'I=Incluir, A=Alterar, E=Excluir, C=Cancelar' },
        { tag: 'codEmp',  label: 'Empresa',               tipo: 'Integer',  obrigatorio: true,  descricao: '' },
        { tag: 'codFil',  label: 'Filial',                tipo: 'Integer',  obrigatorio: true,  descricao: '' },
        { tag: 'codCli',  label: 'Cliente',               tipo: 'Integer',  obrigatorio: true,  descricao: 'Number(009)' },
        { tag: 'tnsPro',  label: 'Transação Produto',     tipo: 'String',   obrigatorio: true,  descricao: '' },
        { tag: 'codCpg',  label: 'Condição de Pagamento', tipo: 'String',   obrigatorio: true,  descricao: '' },
        { tag: 'codFpg',  label: 'Forma de Pagamento',    tipo: 'Integer',  obrigatorio: true,  descricao: '' },
        { tag: 'numPed',  label: 'Número do Pedido',      tipo: 'Integer',  obrigatorio: false, descricao: 'Gerado automaticamente se omitido' },
        { tag: 'datPed',  label: 'Data do Pedido',        tipo: 'DateTime', obrigatorio: false, descricao: 'Formato: dd/mm/aaaa' },
        { tag: 'datEnt',  label: 'Data de Entrega',       tipo: 'DateTime', obrigatorio: false, descricao: 'Formato: dd/mm/aaaa' },
        { tag: 'codRep',  label: 'Representante',         tipo: 'Integer',  obrigatorio: false, descricao: '' },
        { tag: 'codVen',  label: 'Vendedor',              tipo: 'Integer',  obrigatorio: false, descricao: '' },
        { tag: 'codTra',  label: 'Transportadora',        tipo: 'Integer',  obrigatorio: false, descricao: '' },
        { tag: 'codTab',  label: 'Tabela de Preço',       tipo: 'String',   obrigatorio: false, descricao: '' },
        { tag: 'perDsc',  label: 'Desconto Geral (%)',    tipo: 'String',   obrigatorio: false, descricao: 'Separador decimal: vírgula. Ex: 10,00' },
        { tag: 'pedCli',  label: 'Pedido do Cliente',     tipo: 'String',   obrigatorio: false, descricao: '' },
        { tag: 'sitPed',  label: 'Situação',              tipo: 'Integer',  obrigatorio: false, descricao: '', opcoes: '0=Aberto, 1=Atendido, 2=Aberto Parcial' },
        { tag: 'idtReq',  label: 'ID da Requisição',      tipo: 'String',   obrigatorio: false, descricao: '' },
      ], filhos: [{ tag: 'produto', label: 'Itens do Pedido', campos: [
        { tag: 'opeExe',  label: 'Operação do Item',      tipo: 'String',   obrigatorio: true,  descricao: '', opcoes: 'I=Incluir, A=Alterar, E=Excluir' },
        { tag: 'codPro',  label: 'Código do Produto',     tipo: 'String',   obrigatorio: true,  descricao: '' },
        { tag: 'codDer',  label: 'Derivação',             tipo: 'String',   obrigatorio: false, descricao: '' },
        { tag: 'qtdPed',  label: 'Quantidade',            tipo: 'String',   obrigatorio: true,  descricao: 'Separador decimal: vírgula. Ex: 5,00' },
        { tag: 'preUni',  label: 'Preço Unitário',        tipo: 'String',   obrigatorio: false, descricao: 'Separador decimal: vírgula. Ex: 150,00' },
        { tag: 'perDsc',  label: 'Desconto Item (%)',     tipo: 'String',   obrigatorio: false, descricao: 'Separador decimal: vírgula. Ex: 5,00' },
        { tag: 'datEnt',  label: 'Data Entrega Item',     tipo: 'String',   obrigatorio: false, descricao: 'Formato: dd/mm/aaaa' },
        { tag: 'seqIpd',  label: 'Sequência',             tipo: 'Integer',  obrigatorio: false, descricao: 'Sequência do item' },
        { tag: 'tnsPro',  label: 'Transação do Item',     tipo: 'String',   obrigatorio: false, descricao: '' },
      ]}] }],
    }],
  },
  {
    id: 'produtos', nome: 'Produtos', classe: 'com.senior.g5.co.ger.cad.produto', modulo: 'Cadastros',
    portas: [{
      id: 'Cadastrar_X', nome: 'Cadastrar_X', label: 'Cadastrar / Atualizar Produto',
      secoes: [{ tag: 'produto', label: 'Dados do Produto', campos: [
        { tag: 'codPro',  label: 'Código do Produto',   tipo: 'String',  obrigatorio: true,  descricao: '' },
        { tag: 'desPro',  label: 'Descrição',           tipo: 'String',  obrigatorio: true,  descricao: 'String(100)' },
        { tag: 'codFam',  label: 'Família',             tipo: 'String',  obrigatorio: true,  descricao: '' },
        { tag: 'sitPro',  label: 'Situação',            tipo: 'String',  obrigatorio: true,  descricao: '', opcoes: 'A=Ativo, I=Inativo' },
        { tag: 'uniPro',  label: 'Unidade de Medida',   tipo: 'String',  obrigatorio: true,  descricao: '' },
        { tag: 'tipPro',  label: 'Tipo de Produto',     tipo: 'String',  obrigatorio: false, descricao: '', opcoes: 'A=Acabado, S=Semiacabado, M=Matéria-prima, B=Beneficiamento, E=Embalagem, O=Outros' },
        { tag: 'sitDer',  label: 'Situação Derivação',  tipo: 'String',  obrigatorio: false, descricao: 'Necessário quando família tem máscara de derivação', opcoes: 'A=Ativo, I=Inativo' },
        { tag: 'vlrCus',  label: 'Custo',               tipo: 'Double',  obrigatorio: false, descricao: '' },
        { tag: 'vlrVen',  label: 'Preço de Venda',      tipo: 'Double',  obrigatorio: false, descricao: '' },
        { tag: 'pesLiq',  label: 'Peso Líquido',        tipo: 'Double',  obrigatorio: false, descricao: '' },
        { tag: 'pesBru',  label: 'Peso Bruto',          tipo: 'Double',  obrigatorio: false, descricao: '' },
        { tag: 'codNcm',  label: 'NCM',                 tipo: 'String',  obrigatorio: false, descricao: '' },
        { tag: 'codEan',  label: 'EAN / GTIN',          tipo: 'String',  obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
  {
    id: 'orcamentos', nome: 'Orçamentos', classe: 'com.senior.g5.co.mcm.ven.orcamento', modulo: 'Mercado — Vendas',
    portas: [{
      id: 'GravarOrcamentos', nome: 'GravarOrcamentos', label: 'Gravar / Atualizar Orçamento',
      secoes: [{ tag: 'orcamento', label: 'Dados do Orçamento', campos: [
        { tag: 'codEmp',  label: 'Empresa',               tipo: 'Integer',  obrigatorio: true,  descricao: '' },
        { tag: 'codFil',  label: 'Filial',                tipo: 'Integer',  obrigatorio: true,  descricao: '' },
        { tag: 'codCli',  label: 'Cliente',               tipo: 'Integer',  obrigatorio: true,  descricao: '' },
        { tag: 'tnsPro',  label: 'Transação Produto',     tipo: 'String',   obrigatorio: false, descricao: '' },
        { tag: 'tnsSer',  label: 'Transação Serviço',     tipo: 'String',   obrigatorio: false, descricao: '' },
        { tag: 'codCpg',  label: 'Condição de Pagamento', tipo: 'String',   obrigatorio: false, descricao: '' },
        { tag: 'codFpg',  label: 'Forma de Pagamento',    tipo: 'Integer',  obrigatorio: false, descricao: '' },
        { tag: 'codRep',  label: 'Representante',         tipo: 'Integer',  obrigatorio: false, descricao: '' },
        { tag: 'codVen',  label: 'Vendedor',              tipo: 'Integer',  obrigatorio: false, descricao: '' },
        { tag: 'vldOct',  label: 'Validade',              tipo: 'DateTime', obrigatorio: false, descricao: 'Formato: dd/mm/aaaa' },
        { tag: 'desOct',  label: 'Descrição',             tipo: 'String',   obrigatorio: false, descricao: '' },
        { tag: 'perDsc',  label: 'Desconto (%)',          tipo: 'Double',   obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
  {
    id: 'transportadora', nome: 'Transportadora', classe: 'com.senior.g5.co.ger.cad.transportadora', modulo: 'Cadastros',
    portas: [{
      id: 'GravarTransportadora', nome: 'GravarTransportadora', label: 'Gravar / Atualizar Transportadora',
      secoes: [
        { tag: 'gridTransportadora', label: 'Dados da Transportadora', campos: [
          { tag: 'codEmp',  label: 'Empresa',             tipo: 'Integer' as const, obrigatorio: true,  descricao: '' },
          { tag: 'codFil',  label: 'Filial',              tipo: 'Integer' as const, obrigatorio: true,  descricao: '' },
          { tag: 'codTra',  label: 'Código',              tipo: 'Integer' as const, obrigatorio: true,  descricao: '' },
          { tag: 'nomTra',  label: 'Nome / Razão Social', tipo: 'String'  as const, obrigatorio: true,  descricao: '' },
          { tag: 'apeTra',  label: 'Nome Fantasia',       tipo: 'String'  as const, obrigatorio: true,  descricao: '' },
          { tag: 'tipTra',  label: 'Tipo de Pessoa',      tipo: 'String'  as const, obrigatorio: true,  descricao: '', opcoes: 'J=Jurídica, F=Física' },
          { tag: 'cgcCpf',  label: 'CNPJ / CPF',         tipo: 'Double'  as const, obrigatorio: false, descricao: '' },
          { tag: 'insEst',  label: 'Insc. Estadual',      tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'fonTra',  label: 'Telefone',            tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'intNet',  label: 'E-mail',              tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'sitTra',  label: 'Situação',            tipo: 'String'  as const, obrigatorio: false, descricao: '', opcoes: 'A=Ativo, I=Inativo' },
          { tag: 'nrnTrc',  label: 'RNTRC',               tipo: 'String'  as const, obrigatorio: false, descricao: 'Registro Nacional de Transportadores Rodoviários de Carga' },
          { tag: 'cifFob',  label: 'CIF/FOB',             tipo: 'String'  as const, obrigatorio: false, descricao: '', opcoes: 'C=CIF, F=FOB' },
          { tag: 'pesMax',  label: 'Peso Máximo',         tipo: 'Double'  as const, obrigatorio: false, descricao: '' },
          { tag: 'tipOpe',  label: 'Tipo de Operação',    tipo: 'Integer' as const, obrigatorio: false, descricao: '', opcoes: '1=Inclusão, 2=Alteração' },
          { tag: 'ideExt',  label: 'Identificador Externo', tipo: 'String' as const, obrigatorio: false, descricao: '' },
        ], filhos: [{ tag: 'cEP', label: 'Endereço', campos: [
          { tag: 'endTra',  label: 'Endereço',    tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'nenTra',  label: 'Número',      tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'cplEnd',  label: 'Complemento', tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'baiTra',  label: 'Bairro',      tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'cidTra',  label: 'Cidade',      tipo: 'String'  as const, obrigatorio: false, descricao: '' },
          { tag: 'sigUfs',  label: 'UF',          tipo: 'String'  as const, obrigatorio: false, descricao: 'String(002)' },
          { tag: 'cepTra',  label: 'CEP',         tipo: 'Integer' as const, obrigatorio: false, descricao: '' },
          { tag: 'codPai',  label: 'País',        tipo: 'String'  as const, obrigatorio: false, descricao: 'String(004)' },
        ]}] },
        { tag: 'root', label: 'Controle', campos: [
          { tag: 'sistemaIntegracao', label: 'Sistema Integrador', tipo: 'String' as const, obrigatorio: false, descricao: 'String(15)' },
        ]},
      ],
    }],
  },
  {
    id: 'servico', nome: 'Serviços', classe: 'com.senior.g5.co.ger.cad.servico', modulo: 'Cadastros',
    portas: [{
      id: 'Cadastrar', nome: 'Cadastrar', label: 'Cadastrar / Atualizar Serviço',
      secoes: [{ tag: 'servico', label: 'Dados do Serviço', campos: [
        { tag: 'codEmp',  label: 'Empresa',           tipo: 'Integer' as const, obrigatorio: false, descricao: 'Number(004)' },
        { tag: 'codSer',  label: 'Código do Serviço', tipo: 'String'  as const, obrigatorio: false, descricao: 'String(014)' },
        { tag: 'desSer',  label: 'Descrição',         tipo: 'String'  as const, obrigatorio: false, descricao: 'String(070)' },
        { tag: 'desNfv',  label: 'Descrição na NF',   tipo: 'String'  as const, obrigatorio: false, descricao: 'Para impressão na nota fiscal' },
        { tag: 'codFam',  label: 'Família',            tipo: 'String'  as const, obrigatorio: false, descricao: 'String(006)' },
        { tag: 'uniMed',  label: 'Unidade de Medida', tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'sitSer',  label: 'Situação',           tipo: 'String'  as const, obrigatorio: false, descricao: '', opcoes: 'A=Ativo, I=Inativo' },
        { tag: 'preVen',  label: 'Preço de Venda',    tipo: 'String'  as const, obrigatorio: false, descricao: 'Decimal com vírgula. Ex: 150,00' },
        { tag: 'preCpr',  label: 'Preço de Compra',   tipo: 'String'  as const, obrigatorio: false, descricao: 'Decimal com vírgula' },
        { tag: 'perIss',  label: 'ISS (%)',            tipo: 'String'  as const, obrigatorio: false, descricao: 'Alíquota ISS' },
        { tag: 'perPis',  label: 'PIS (%)',            tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'perCof',  label: 'COFINS (%)',         tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'perCsl',  label: 'CSLL (%)',           tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'perIrf',  label: 'IRF (%)',            tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'codNbs',  label: 'NBS',                tipo: 'String'  as const, obrigatorio: false, descricao: 'Nomenclatura Brasileira de Serviços' },
        { tag: 'obsSer',  label: 'Observação',         tipo: 'String'  as const, obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
  {
    id: 'centrocusto', nome: 'Centro de Custo', classe: 'com.senior.g5.co.ger.cad.centrocusto', modulo: 'Cadastros',
    portas: [{
      id: 'Exportar', nome: 'Exportar', label: 'Exportar Centros de Custo',
      secoes: [{ tag: 'root', label: 'Parâmetros', campos: [
        { tag: 'codEmp',               label: 'Empresa',            tipo: 'Integer' as const, obrigatorio: true,  descricao: 'Number(004)' },
        { tag: 'codFil',               label: 'Filial',             tipo: 'Integer' as const, obrigatorio: true,  descricao: 'Number(005)' },
        { tag: 'identificadorSistema', label: 'Sistema Integrador', tipo: 'String'  as const, obrigatorio: true,  descricao: 'String(15) — sigla do sistema de integração' },
        { tag: 'tipoIntegracao',       label: 'Tipo de Integração', tipo: 'String'  as const, obrigatorio: true,  descricao: '', opcoes: 'T=Todos, A=Somente Alterados, E=Registro Específico' },
        { tag: 'codCcu',               label: 'Centro de Custo',    tipo: 'String'  as const, obrigatorio: false, descricao: 'String(009) — filtro por centro específico' },
        { tag: 'quantidadeRegistros',  label: 'Qtd. Registros',     tipo: 'Integer' as const, obrigatorio: false, descricao: 'Limite de registros a retornar' },
      ]}],
    }],
  },
  {
    id: 'nfeentrada', nome: 'NF de Entrada (Tributos)', classe: 'com.senior.g5.co.mct.imp.gravarnotafiscalentrada', modulo: 'Controladoria',
    portas: [{
      id: 'GravarNotaFiscalEntrada', nome: 'GravarNotaFiscalEntrada', label: 'Gravar NF de Entrada em Tributos',
      secoes: [{ tag: 'notaFiscal', label: 'Dados da Nota Fiscal', campos: [
        { tag: 'codEmp',  label: 'Empresa',              tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFil',  label: 'Filial',               tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFor',  label: 'Fornecedor',           tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'numNot',  label: 'Número da NF',         tipo: 'String'   as const, obrigatorio: true,  descricao: '' },
        { tag: 'serNot',  label: 'Série',                tipo: 'String'   as const, obrigatorio: true,  descricao: '' },
        { tag: 'datEnt',  label: 'Data de Entrada',      tipo: 'DateTime' as const, obrigatorio: true,  descricao: 'dd/mm/aaaa' },
        { tag: 'datEmi',  label: 'Data de Emissão',      tipo: 'DateTime' as const, obrigatorio: true,  descricao: 'dd/mm/aaaa' },
        { tag: 'tnsPro',  label: 'Transação',            tipo: 'String'   as const, obrigatorio: true,  descricao: '' },
        { tag: 'vlrNot',  label: 'Valor Total',          tipo: 'Double'   as const, obrigatorio: true,  descricao: '' },
        { tag: 'vlrIpi',  label: 'Valor IPI',            tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrIcm',  label: 'Valor ICMS',           tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrFre',  label: 'Valor Frete',          tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'chaNfe',  label: 'Chave NF-e',           tipo: 'String'   as const, obrigatorio: false, descricao: '44 dígitos' },
        { tag: 'codCpg',  label: 'Condição de Pagamento',tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrPis',  label: 'Valor PIS',            tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrCof',  label: 'Valor COFINS',         tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
  {
    id: 'titulosPagar', nome: 'Títulos a Pagar', classe: 'com.senior.g5.co.mfi.pag.titulosPagar', modulo: 'Financeiro',
    portas: [{
      id: 'GravarTitulosPagar', nome: 'GravarTitulosPagar', label: 'Gravar Títulos a Pagar',
      secoes: [{ tag: 'tituloPagar', label: 'Dados do Título', campos: [
        { tag: 'codEmp',  label: 'Empresa',              tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFil',  label: 'Filial',               tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFor',  label: 'Fornecedor',           tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFpg',  label: 'Forma de Pagamento',   tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'vlrTit',  label: 'Valor do Título',      tipo: 'Double'   as const, obrigatorio: true,  descricao: '' },
        { tag: 'datVen',  label: 'Data de Vencimento',   tipo: 'DateTime' as const, obrigatorio: true,  descricao: 'dd/mm/aaaa' },
        { tag: 'datEmi',  label: 'Data de Emissão',      tipo: 'DateTime' as const, obrigatorio: true,  descricao: 'dd/mm/aaaa' },
        { tag: 'numTit',  label: 'Número do Título',     tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'serTit',  label: 'Série',                tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'hisTit',  label: 'Histórico',            tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'numNot',  label: 'Número da NF',         tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrJur',  label: 'Valor de Juros',       tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrMul',  label: 'Valor de Multa',       tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrDsc',  label: 'Valor de Desconto',    tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'idtReq',  label: 'ID da Requisição',     tipo: 'String'   as const, obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
  {
    id: 'titulosReceber', nome: 'Títulos a Receber', classe: 'com.senior.g5.co.mfi.rec.titulosReceber', modulo: 'Financeiro',
    portas: [{
      id: 'GravarTitulosReceber', nome: 'GravarTitulosReceber', label: 'Gravar Títulos a Receber',
      secoes: [{ tag: 'tituloReceber', label: 'Dados do Título', campos: [
        { tag: 'codEmp',  label: 'Empresa',              tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFil',  label: 'Filial',               tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codCli',  label: 'Cliente',              tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFpg',  label: 'Forma de Pagamento',   tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'vlrTit',  label: 'Valor do Título',      tipo: 'Double'   as const, obrigatorio: true,  descricao: '' },
        { tag: 'datVen',  label: 'Data de Vencimento',   tipo: 'DateTime' as const, obrigatorio: true,  descricao: 'dd/mm/aaaa' },
        { tag: 'datEmi',  label: 'Data de Emissão',      tipo: 'DateTime' as const, obrigatorio: true,  descricao: 'dd/mm/aaaa' },
        { tag: 'numTit',  label: 'Número do Título',     tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'serTit',  label: 'Série',                tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'hisTit',  label: 'Histórico',            tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'numNot',  label: 'Número da NF',         tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrJur',  label: 'Valor de Juros',       tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'vlrDsc',  label: 'Valor de Desconto',    tipo: 'Double'   as const, obrigatorio: false, descricao: '' },
        { tag: 'codBan',  label: 'Banco',                tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'codAge',  label: 'Agência',              tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'idtReq',  label: 'ID da Requisição',     tipo: 'String'   as const, obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
  {
    id: 'ordemcompra', nome: 'Ordem de Compra', classe: 'com.senior.g5.co.mcm.cpr.ordemcompra', modulo: 'Suprimentos — Compras',
    portas: [{
      id: 'Exportar', nome: 'Exportar', label: 'Exportar Ordens de Compra',
      secoes: [{ tag: 'root', label: 'Parâmetros', campos: [
        { tag: 'codEmp',               label: 'Empresa',            tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFil',               label: 'Filial',             tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'identificadorSistema', label: 'Sistema Integrador', tipo: 'String'   as const, obrigatorio: true,  descricao: 'String(15)' },
        { tag: 'tipoIntegracao',       label: 'Tipo de Integração', tipo: 'String'   as const, obrigatorio: true,  descricao: '', opcoes: 'T=Todos, A=Somente Alterados, E=Registro Específico' },
        { tag: 'numOcp',               label: 'Número da OC',       tipo: 'Integer'  as const, obrigatorio: false, descricao: 'Filtro por ordem específica' },
        { tag: 'datIni',               label: 'Data Inicial',       tipo: 'DateTime' as const, obrigatorio: false, descricao: 'dd/mm/aaaa' },
        { tag: 'datFim',               label: 'Data Final',         tipo: 'DateTime' as const, obrigatorio: false, descricao: 'dd/mm/aaaa' },
        { tag: 'quantidadeRegistros',  label: 'Qtd. Registros',     tipo: 'Integer'  as const, obrigatorio: false, descricao: 'Limite de registros' },
      ]}],
    }],
  },
  {
    id: 'requisicoes', nome: 'Requisições de Estoque', classe: 'com.senior.g5.co.mcm.est.requisicoes', modulo: 'Suprimentos — Compras',
    portas: [{
      id: 'GravarRequisicoes', nome: 'GravarRequisicoes', label: 'Gravar Requisições de Estoque',
      secoes: [{ tag: 'requisicao', label: 'Cabeçalho', campos: [
        { tag: 'codEmp',  label: 'Empresa',              tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFil',  label: 'Filial',               tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'opeExe',  label: 'Operação',             tipo: 'String'   as const, obrigatorio: true,  descricao: '', opcoes: 'I=Incluir, A=Alterar, E=Excluir' },
        { tag: 'numReq',  label: 'Número da Requisição', tipo: 'Integer'  as const, obrigatorio: false, descricao: 'Gerado automaticamente se omitido' },
        { tag: 'datReq',  label: 'Data da Requisição',   tipo: 'DateTime' as const, obrigatorio: false, descricao: 'dd/mm/aaaa' },
        { tag: 'codDep',  label: 'Depósito Origem',      tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'obsReq',  label: 'Observação',           tipo: 'String'   as const, obrigatorio: false, descricao: '' },
      ], filhos: [{ tag: 'item', label: 'Itens', campos: [
        { tag: 'codPro',  label: 'Código do Produto', tipo: 'String'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codDer',  label: 'Derivação',         tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'qtdReq',  label: 'Quantidade',        tipo: 'String'  as const, obrigatorio: true,  descricao: 'Decimal com vírgula' },
        { tag: 'datNec',  label: 'Data Necessidade',  tipo: 'DateTime' as const, obrigatorio: false, descricao: 'dd/mm/aaaa' },
        { tag: 'codDep',  label: 'Depósito',          tipo: 'String'  as const, obrigatorio: false, descricao: '' },
      ]}] }],
    }],
  },
  {
    id: 'lctocontabil', nome: 'Lançamentos Contábeis', classe: 'com.senior.g5.co.mct.ctb.importacaolctctb', modulo: 'Controladoria',
    portas: [{
      id: 'ImportarLancamentos', nome: 'ImportarLancamentos', label: 'Importar Lançamentos Contábeis',
      secoes: [{ tag: 'lancamento', label: 'Dados do Lançamento', campos: [
        { tag: 'codEmp',  label: 'Empresa',              tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFil',  label: 'Filial',               tipo: 'Integer'  as const, obrigatorio: true,  descricao: '' },
        { tag: 'datLct',  label: 'Data do Lançamento',   tipo: 'DateTime' as const, obrigatorio: true,  descricao: 'dd/mm/aaaa' },
        { tag: 'ctaRed',  label: 'Conta Reduzida',       tipo: 'Integer'  as const, obrigatorio: true,  descricao: 'Conta contábil reduzida' },
        { tag: 'vlrLct',  label: 'Valor',                tipo: 'Double'   as const, obrigatorio: true,  descricao: '' },
        { tag: 'debCre',  label: 'Débito / Crédito',     tipo: 'String'   as const, obrigatorio: true,  descricao: '', opcoes: 'D=Débito, C=Crédito' },
        { tag: 'codLot',  label: 'Lote',                 tipo: 'Integer'  as const, obrigatorio: false, descricao: '' },
        { tag: 'hisCon',  label: 'Histórico',            tipo: 'String'   as const, obrigatorio: false, descricao: 'Descrição do lançamento' },
        { tag: 'codCcu',  label: 'Centro de Custo',      tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'numDoc',  label: 'Número do Documento',  tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'codMoe',  label: 'Moeda',                tipo: 'String'   as const, obrigatorio: false, descricao: '' },
        { tag: 'idtReq',  label: 'ID da Requisição',     tipo: 'String'   as const, obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
  {
    id: 'favorecido', nome: 'Favorecidos', classe: 'com.senior.g5.co.ger.cad.favorecido', modulo: 'Cadastros',
    portas: [{
      id: 'GravarFavorecido', nome: 'GravarFavorecido', label: 'Gravar / Atualizar Favorecido',
      secoes: [{ tag: 'favorecido', label: 'Dados do Favorecido', campos: [
        { tag: 'codEmp',  label: 'Empresa',         tipo: 'Integer' as const, obrigatorio: true,  descricao: '' },
        { tag: 'codFav',  label: 'Código',          tipo: 'Integer' as const, obrigatorio: true,  descricao: '' },
        { tag: 'nomFav',  label: 'Nome',            tipo: 'String'  as const, obrigatorio: true,  descricao: 'String(100)' },
        { tag: 'tipFav',  label: 'Tipo de Pessoa',  tipo: 'String'  as const, obrigatorio: true,  descricao: '', opcoes: 'J=Jurídica, F=Física' },
        { tag: 'cgcCpf',  label: 'CNPJ / CPF',     tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'insEst',  label: 'Insc. Estadual',  tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'endFav',  label: 'Endereço',        tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'nenFav',  label: 'Número',          tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'baiCid',  label: 'Bairro',          tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'cidFav',  label: 'Cidade',          tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'sigUfs',  label: 'UF',              tipo: 'String'  as const, obrigatorio: false, descricao: 'String(002)' },
        { tag: 'cepFav',  label: 'CEP',             tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'fonFav',  label: 'Telefone',        tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'intNet',  label: 'E-mail',          tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'sitFav',  label: 'Situação',        tipo: 'String'  as const, obrigatorio: false, descricao: '', opcoes: 'A=Ativo, I=Inativo' },
        { tag: 'codBan',  label: 'Banco',           tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'codAge',  label: 'Agência',         tipo: 'String'  as const, obrigatorio: false, descricao: '' },
        { tag: 'ccbFav',  label: 'Conta Corrente',  tipo: 'String'  as const, obrigatorio: false, descricao: '' },
      ]}],
    }],
  },
]

// ── Gerador XML ───────────────────────────────────────────────────────────────
function gerarXML(ws: WsComFormulario, porta: Porta, valores: Record<string, string>, user: string, pwd: string, enc: string): string {
  function renderSecao(s: Secao, ind: number): string {
    const p = '  '.repeat(ind)
    if (s.tag === 'root') {
      return s.campos.filter(c => valores[c.tag]?.trim())
        .map(c => `${p}<${c.tag}>${valores[c.tag]}</${c.tag}>`).join('\n')
    }
    const camposXml = s.campos.filter(c => valores[c.tag]?.trim() || c.obrigatorio)
      .map(c => `${p}  <${c.tag}>${valores[c.tag] ?? ''}</${c.tag}>`).join('\n')
    const filhosXml = (s.filhos ?? []).map(f => renderSecao(f, ind + 1)).filter(Boolean).join('\n')
    return `${p}<${s.tag}>\n${[camposXml, filhosXml].filter(Boolean).join('\n')}\n${p}</${s.tag}>`
  }
  const corpo = porta.secoes.map(s => renderSecao(s, 4)).filter(Boolean).join('\n')
  return `<soapenv:Envelope\n  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"\n  xmlns:ser="http://services.senior.com.br">\n  <soapenv:Body>\n    <ser:${porta.nome}>\n      <user>${user}</user>\n      <password>${pwd}</password>\n      <encryption>${enc || '0'}</encryption>\n      <parameters>\n${corpo}\n      </parameters>\n    </ser:${porta.nome}>\n  </soapenv:Body>\n</soapenv:Envelope>`
}

// ── Componente ────────────────────────────────────────────────────────────────
type Aba = 'catalogo' | 'formulario'

export default function SeniorWebservices({ user }: { user: User | null }) {
  const [aba, setAba] = useState<Aba>('catalogo')

  // IA
  const [wsIA,         setWsIA]         = useState<WsIA | null>(null)
  const [gerandoIA,    setGerandoIA]    = useState(false)
  const [erroIA,       setErroIA]       = useState<string | null>(null)
  const [classeIA,     setClasseIA]     = useState('')

  // catalogo
  const [moduloFiltro, setModuloFiltro] = useState('Todos')
  const [busca,        setBusca]        = useState('')

  // formulario
  const [wsId,    setWsId]    = useState(WS_FORMULARIOS[0].id)
  const [portaId, setPortaId] = useState(WS_FORMULARIOS[0].portas[0].id)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [wsUser,  setWsUser]  = useState('')
  const [wsPwd,   setWsPwd]   = useState('')
  const [wsEnc,   setWsEnc]   = useState('0')
  const [copiado, setCopiado] = useState(false)
  const [soObrig, setSoObrig] = useState(false)
  const [abaDir,  setAbaDir]  = useState<'campos' | 'xml'>('campos')

  const ws    = useMemo(() => WS_FORMULARIOS.find(w => w.id === wsId)!, [wsId])
  const porta = useMemo(() => ws.portas.find(p => p.id === portaId) ?? ws.portas[0], [ws, portaId])

  const todosCampos = useMemo(() => {
    const lista: Campo[] = []
    function ex(secoes: Secao[]) { for (const s of secoes) { lista.push(...s.campos); if (s.filhos) ex(s.filhos) } }
    ex(porta.secoes); return lista
  }, [porta])

  const xml = useMemo(() => gerarXML(ws, porta, valores, wsUser, wsPwd, wsEnc), [ws, porta, valores, wsUser, wsPwd, wsEnc])

  const catalogoFiltrado = useMemo(() => {
    const q = busca.toLowerCase()
    return CATALOGO.filter(w =>
      (moduloFiltro === 'Todos' || w.modulo === moduloFiltro) &&
      (!q || w.classe.toLowerCase().includes(q) || w.descricao.toLowerCase().includes(q))
    )
  }, [moduloFiltro, busca])

  const catalogoPorModulo = useMemo(() => {
    const map = new Map<string, WsCatalogo[]>()
    for (const w of catalogoFiltrado) {
      if (!map.has(w.modulo)) map.set(w.modulo, [])
      map.get(w.modulo)!.push(w)
    }
    return map
  }, [catalogoFiltrado])

  function set(tag: string, val: string) { setValores(prev => ({ ...prev, [tag]: val })) }
  function trocarWs(id: string) { const n = WS_FORMULARIOS.find(w => w.id === id)!; setWsId(id); setPortaId(n.portas[0].id); setValores({}) }
  function copiar() { navigator.clipboard.writeText(xml).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }) }

  const obrigFaltando = todosCampos.filter(c => c.obrigatorio && !valores[c.tag]?.trim())

  const iCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const sCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500'

  function renderCampo(c: Campo) {
    const val = valores[c.tag] ?? ''
    return (
      <div key={c.tag}>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.label}</label>
          {c.obrigatorio && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-medium">obrigatório</span>}
          <code className="ml-auto text-[10px] font-mono text-gray-400">&lt;{c.tag}&gt;</code>
        </div>
        {c.opcoes
          ? <select value={val} onChange={e => set(c.tag, e.target.value)} className={sCls}>
              <option value="">-- selecione --</option>
              {c.opcoes.split(',').map(op => { const [v, l] = op.trim().split('='); return <option key={v} value={v.trim()}>{v.trim()} — {l?.trim()}</option> })}
            </select>
          : <input type="text" value={val} onChange={e => set(c.tag, e.target.value)}
              placeholder={c.mascara ?? c.descricao.split('—')[0].trim()}
              className={`${iCls} ${c.obrigatorio && !val ? 'border-red-300 dark:border-red-700' : ''}`} />
        }
        {c.descricao && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{c.descricao}</p>}
      </div>
    )
  }

  function renderSecoes(secoes: Secao[]) {
    return secoes.map(s => {
      const campos = soObrig ? s.campos.filter(c => c.obrigatorio) : s.campos
      if (s.tag === 'root') return campos.length ? (
        <div key="root"><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Controle</h3>
          <div className="space-y-3">{campos.map(c => renderCampo(c))}</div></div>
      ) : null
      return (
        <div key={s.tag} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{s.label}</span>
            <code className="text-[11px] text-gray-400 font-mono">&lt;{s.tag}&gt;</code>
          </div>
          <div className="p-4 space-y-3">
            {campos.map(c => renderCampo(c))}
            {(s.filhos ?? []).length > 0 && <div className="space-y-4 pt-2">{renderSecoes(s.filhos!)}</div>}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">

        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-5">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span><span className="text-gray-700 dark:text-gray-200">Senior Webservices</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Senior Webservices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Catálogo completo de webservices SOAP do Gestão Empresarial ERP v5.10.4</p>
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit mb-6">
          {(['catalogo', 'formulario'] as Aba[]).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${aba === a ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {a === 'catalogo' ? `📚 Catálogo (${CATALOGO.length})` : '⚙️ Gerar XML'}
            </button>
          ))}
        </div>

        {/* ════ ABA CATÁLOGO ════════════════════════════════════════════════ */}
        {aba === 'catalogo' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por classe ou descrição…"
                className={`flex-1 min-w-[240px] ${iCls}`} />
              <select value={moduloFiltro} onChange={e => setModuloFiltro(e.target.value)} className={`w-56 ${sCls}`}>
                <option value="Todos">Todos os módulos</option>
                {MODULOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <p className="text-xs text-gray-400">{catalogoFiltrado.length} webservice(s) encontrado(s)</p>

            {Array.from(catalogoPorModulo.entries()).map(([modulo, lista]) => (
              <div key={modulo} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{modulo}</h2>
                  <span className="text-xs text-gray-400">{lista.length} serviço(s)</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {lista.map(w => {
                    const temFormulario = WS_FORMULARIOS.some(f => f.classe === w.classe)
                    return (
                      <div key={w.classe} className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition group">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs font-mono text-brand-600 dark:text-brand-400 break-all">{w.classe}</code>
                            {temFormulario && (
                              <button onClick={() => { const f = WS_FORMULARIOS.find(f => f.classe === w.classe)!; setWsId(f.id); setPortaId(f.portas[0].id); setAba('formulario') }}
                                className="text-[10px] px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-medium hover:bg-brand-200 dark:hover:bg-brand-900/60 transition shrink-0">
                                ⚙️ Gerar XML
                              </button>
                            )}
                          </div>
                          {w.descricao && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{w.descricao}</p>}
                        </div>
                        <a href={w.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition shrink-0 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          Docs
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════ ABA FORMULÁRIO ══════════════════════════════════════════════ */}
        {aba === 'formulario' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Webservice</label>
                <select value={wsId} onChange={e => trocarWs(e.target.value)} className={sCls}>
                  {WS_FORMULARIOS.map(w => <option key={w.id} value={w.id}>{w.modulo} — {w.nome}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1 font-mono">{ws.classe}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Porta (operação)</label>
                <select value={portaId} onChange={e => { setPortaId(e.target.value); setValores({}) }} className={sCls}>
                  {ws.portas.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-4">
              <div className="space-y-4">
                {/* Auth */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Autenticação</h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Usuário <span className="text-red-500">*</span></label>
                      <input type="text" value={wsUser} onChange={e => setWsUser(e.target.value)} placeholder="senior" className={iCls} /></div>
                    <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Senha <span className="text-red-500">*</span></label>
                      <input type="password" value={wsPwd} onChange={e => setWsPwd(e.target.value)} placeholder="••••••" className={iCls} /></div>
                    <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Encryption</label>
                      <select value={wsEnc} onChange={e => setWsEnc(e.target.value)} className={sCls}>
                        <option value="0">0 — Nenhuma</option><option value="1">1 — MD5</option><option value="2">2 — SHA1</option>
                      </select></div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div onClick={() => setSoObrig(v => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${soObrig ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${soObrig ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Apenas campos obrigatórios</span>
                  </label>
                  <span className="ml-auto text-xs text-gray-400">
                    {todosCampos.filter(c => valores[c.tag]?.trim()).length}/{todosCampos.length} preenchidos
                    {obrigFaltando.length > 0 && <span className="ml-2 text-red-500">· {obrigFaltando.length} obrigatório(s) faltando</span>}
                  </span>
                </div>

                <div className="space-y-4">{renderSecoes(porta.secoes)}</div>
              </div>

              {/* Painel direito */}
              <div className="xl:sticky xl:top-6 self-start space-y-3">
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl">
                  {(['campos', 'xml'] as const).map(a => (
                    <button key={a} onClick={() => setAbaDir(a)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${abaDir === a ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                      {a === 'campos' ? '📋 Preenchidos' : '📄 XML'}
                    </button>
                  ))}
                </div>

                {abaDir === 'xml' ? (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Envelope SOAP</p>
                        <p className="text-xs text-gray-400">{porta.nome}</p></div>
                      <button onClick={copiar} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white transition">
                        {copiado ? <>✓ Copiado!</> : <>Copiar XML</>}
                      </button>
                    </div>
                    <pre className="p-5 text-[11px] font-mono leading-relaxed text-green-400 bg-gray-950 overflow-auto max-h-[560px] whitespace-pre-wrap break-all">{xml}</pre>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campos preenchidos</p>
                    </div>
                    <div className="p-4 max-h-[500px] overflow-y-auto">
                      {Object.entries(valores).filter(([, v]) => v.trim()).length === 0
                        ? <p className="text-sm text-gray-400 text-center py-6">Nenhum campo preenchido ainda</p>
                        : <div className="space-y-2">{Object.entries(valores).filter(([, v]) => v.trim()).map(([tag, val]) => {
                            const c = todosCampos.find(c => c.tag === tag)
                            return (
                              <div key={tag} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <code className="text-[11px] font-mono font-semibold text-brand-600 dark:text-brand-400">{tag}</code>
                                    {c?.obrigatorio && <span className="text-[10px] text-red-500">obrigatório</span>}
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">{c?.label ?? tag}</p>
                                </div>
                                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 shrink-0 max-w-[120px] truncate">{val}</span>
                              </div>
                            )
                          })}</div>
                      }
                    </div>
                  </div>
                )}

                {obrigFaltando.length > 0 && (
                  <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">Campos obrigatórios faltando ({obrigFaltando.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {obrigFaltando.map(c => <code key={c.tag} className="text-[11px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono">{c.tag}</code>)}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">WSDL Síncrono</p>
                  <p className="text-[11px] font-mono text-gray-400 break-all leading-relaxed">
                    http://[servidor]/g5-senior-services/sapiens_Sync{ws.classe.replace(/\./g, '_')}?wsdl
                  </p>
                  <a href={`https://documentacao.senior.com.br/gestaoempresarialerp/5.10.4/webservices/${ws.classe.replace(/\./g, '_')}.htm`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Documentação oficial
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
