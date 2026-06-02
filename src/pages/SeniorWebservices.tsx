import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Campo {
  tag:         string
  label:       string
  tipo:        'String' | 'Integer' | 'Double' | 'DateTime'
  obrigatorio: boolean
  descricao:   string
  opcoes?:     string          // ex: "J=Jurídica, F=Física"
  mascara?:    string          // ex: "Number(009)"
}

interface Secao {
  tag:    string
  label:  string
  campos: Campo[]
  filhos?: Secao[]
}

interface Porta {
  id:      string
  nome:    string
  label:   string
  secoes:  Secao[]
}

interface Webservice {
  id:       string
  nome:     string
  classe:   string
  modulo:   string
  portas:   Porta[]
}

// ── Dados dos Webservices ─────────────────────────────────────────────────────
const WEBSERVICES: Webservice[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // CLIENTES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'clientes',
    nome: 'Clientes',
    classe: 'com.senior.g5.co.ger.cad.clientes',
    modulo: 'Cadastros',
    portas: [
      {
        id: 'GravarClientes',
        nome: 'GravarClientes',
        label: 'Gravar / Atualizar Cliente',
        secoes: [
          {
            tag: 'dadosGeraisCliente', label: 'Dados Gerais do Cliente',
            campos: [
              { tag: 'codCli',  label: 'Código do Cliente',     tipo: 'Integer', obrigatorio: true,  descricao: 'Number(009) - Código do cliente. Se omitido, o sistema gera automaticamente.', mascara: 'Number(009)' },
              { tag: 'nomCli',  label: 'Nome do Cliente',        tipo: 'String',  obrigatorio: true,  descricao: 'String(100) - Razão social / nome completo do cliente.', mascara: 'String(100)' },
              { tag: 'apeCli',  label: 'Nome Fantasia',          tipo: 'String',  obrigatorio: true,  descricao: 'String(050) - Nome fantasia do cliente.', mascara: 'String(050)' },
              { tag: 'tipCli',  label: 'Tipo de Cliente',        tipo: 'String',  obrigatorio: true,  descricao: 'String(001) - Tipo de pessoa.', opcoes: 'J=Jurídica, F=Física' },
              { tag: 'tipMer',  label: 'Tipo de Mercado',        tipo: 'String',  obrigatorio: true,  descricao: 'String(001) - Mercado do cliente.', opcoes: 'I=Interno (Nacional), E=Externo (Internacional), P=Prospect' },
              { tag: 'cliCon',  label: 'Contribuinte de ICMS',   tipo: 'String',  obrigatorio: true,  descricao: 'String(001) - Indica se o cliente é contribuinte de ICMS.', opcoes: 'S=Sim, N=Não' },
              { tag: 'cgcCpf',  label: 'CNPJ / CPF',            tipo: 'String',  obrigatorio: false, descricao: 'Number(014) - CNPJ ou CPF do cliente.', mascara: 'Number(014)' },
              { tag: 'tipEmp',  label: 'Tipo de Empresa',        tipo: 'Integer', obrigatorio: false, descricao: 'Tipo de empresa do cliente.' },
              { tag: 'insEst',  label: 'Inscrição Estadual',     tipo: 'String',  obrigatorio: false, descricao: 'String(025) - Inscrição estadual.', mascara: 'String(025)' },
              { tag: 'insMun',  label: 'Inscrição Municipal',    tipo: 'String',  obrigatorio: false, descricao: 'String(016) - Inscrição municipal.', mascara: 'String(016)' },
              { tag: 'endCli',  label: 'Endereço',               tipo: 'String',  obrigatorio: false, descricao: 'String(100) - Logradouro do cliente.', mascara: 'String(100)' },
              { tag: 'nenCli',  label: 'Número do Endereço',     tipo: 'String',  obrigatorio: false, descricao: 'String(060) - Número do endereço.', mascara: 'String(060)' },
              { tag: 'cplEnd',  label: 'Complemento',            tipo: 'String',  obrigatorio: false, descricao: 'String(020) - Complemento do endereço.', mascara: 'String(020)' },
              { tag: 'baiCli',  label: 'Bairro',                 tipo: 'String',  obrigatorio: false, descricao: 'String(075) - Bairro.', mascara: 'String(075)' },
              { tag: 'cidCli',  label: 'Cidade',                 tipo: 'String',  obrigatorio: false, descricao: 'String(060) - Cidade.', mascara: 'String(060)' },
              { tag: 'sigUfs',  label: 'UF',                     tipo: 'String',  obrigatorio: false, descricao: 'String(002) - Sigla do estado.', mascara: 'String(002)' },
              { tag: 'cepCli',  label: 'CEP',                    tipo: 'String',  obrigatorio: false, descricao: 'Number(008) - CEP do cliente.', mascara: 'Number(008)' },
              { tag: 'codPai',  label: 'País',                   tipo: 'String',  obrigatorio: false, descricao: 'String(004) - Código do país.', mascara: 'String(004)' },
              { tag: 'fonCli',  label: 'Telefone 1',             tipo: 'String',  obrigatorio: false, descricao: 'String(020) - Número do telefone.', mascara: 'String(020)' },
              { tag: 'fonCl2',  label: 'Telefone 2',             tipo: 'String',  obrigatorio: false, descricao: 'String(020) - Telefone 2.', mascara: 'String(020)' },
              { tag: 'intNet',  label: 'E-mail',                 tipo: 'String',  obrigatorio: false, descricao: 'String(100) - E-mail do cliente.', mascara: 'String(100)' },
              { tag: 'sitCli',  label: 'Situação',               tipo: 'String',  obrigatorio: false, descricao: 'Situação do cadastro.', opcoes: 'A=Ativo, I=Inativo' },
              { tag: 'emaNfe',  label: 'E-mail NF-e',            tipo: 'String',  obrigatorio: false, descricao: 'String(100) - E-mail para envio de NF-e.', mascara: 'String(100)' },
              { tag: 'ideExt',  label: 'Identificador Externo',  tipo: 'String',  obrigatorio: false, descricao: 'Chave de identificação do cliente em sistema externo.' },
            ],
            filhos: [
              {
                tag: 'definicoesCliente', label: 'Definições do Cliente (por filial)',
                campos: [
                  { tag: 'codEmp',  label: 'Empresa',              tipo: 'Integer', obrigatorio: true,  descricao: 'Código da empresa.' },
                  { tag: 'codFil',  label: 'Filial',               tipo: 'Integer', obrigatorio: true,  descricao: 'Código da filial.' },
                  { tag: 'codCpg',  label: 'Condição de Pagamento',tipo: 'String',  obrigatorio: true,  descricao: 'Código da condição de pagamento (obrigatório para GO UP).' },
                  { tag: 'codFpg',  label: 'Forma de Pagamento',   tipo: 'Integer', obrigatorio: true,  descricao: 'Código da forma de pagamento (obrigatório para GO UP).' },
                  { tag: 'codCrp',  label: 'Grupo Contas a Rec.',  tipo: 'String',  obrigatorio: true,  descricao: 'Código do grupo de contas a receber (obrigatório para GO UP).' },
                  { tag: 'vlrLim',  label: 'Limite de Crédito',    tipo: 'Double',  obrigatorio: false, descricao: 'Valor do limite de crédito.' },
                  { tag: 'datLim',  label: 'Data Limite Crédito',  tipo: 'String',  obrigatorio: false, descricao: 'Data limite do crédito.' },
                  { tag: 'codTab',  label: 'Tabela de Preço',      tipo: 'String',  obrigatorio: false, descricao: 'Código da tabela de preço.' },
                  { tag: 'codRep',  label: 'Representante',        tipo: 'Integer', obrigatorio: false, descricao: 'Código do representante.' },
                  { tag: 'codVen',  label: 'Vendedor',             tipo: 'Integer', obrigatorio: false, descricao: 'Código do vendedor.' },
                  { tag: 'codTra',  label: 'Transportadora',       tipo: 'Integer', obrigatorio: false, descricao: 'Código da transportadora padrão.' },
                  { tag: 'perDs1',  label: 'Desconto 1 (%)',       tipo: 'Double',  obrigatorio: false, descricao: 'Percentual de desconto 1.' },
                  { tag: 'perDsc',  label: 'Desconto Padrão (%)',  tipo: 'Double',  obrigatorio: false, descricao: 'Percentual de desconto padrão.' },
                  { tag: 'ctaRed',  label: 'Conta Reduzida',       tipo: 'Integer', obrigatorio: false, descricao: 'Conta contábil reduzida.' },
                  { tag: 'cifFob',  label: 'CIF/FOB',              tipo: 'String',  obrigatorio: false, descricao: 'Tipo de frete.', opcoes: 'C=CIF, F=FOB' },
                ],
              },
            ],
          },
          {
            tag: 'root', label: 'Controle da Requisição',
            campos: [
              { tag: 'sigInt', label: 'Sistema Integrador', tipo: 'String', obrigatorio: false, descricao: 'Identificação do sistema integrador.' },
              { tag: 'idtReq', label: 'ID da Requisição',   tipo: 'String', obrigatorio: false, descricao: 'Identificador único da requisição para rastreio.' },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FORNECEDORES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'fornecedores',
    nome: 'Fornecedores',
    classe: 'com.senior.g5.co.ger.cad.fornecedores',
    modulo: 'Cadastros',
    portas: [
      {
        id: 'GravarFornecedores',
        nome: 'GravarFornecedores',
        label: 'Gravar / Atualizar Fornecedor',
        secoes: [
          {
            tag: 'dadosGeraisFornecedor', label: 'Dados Gerais do Fornecedor',
            campos: [
              { tag: 'codFor', label: 'Código do Fornecedor', tipo: 'Integer', obrigatorio: true,  descricao: 'Number(009) - Código do fornecedor.' },
              { tag: 'nomFor', label: 'Nome / Razão Social',  tipo: 'String',  obrigatorio: true,  descricao: 'String(100) - Razão social do fornecedor.' },
              { tag: 'apeFor', label: 'Nome Fantasia',        tipo: 'String',  obrigatorio: true,  descricao: 'String(050) - Nome fantasia.' },
              { tag: 'tipFor', label: 'Tipo de Pessoa',       tipo: 'String',  obrigatorio: true,  descricao: 'Tipo de pessoa.', opcoes: 'J=Jurídica, F=Física' },
              { tag: 'cgcCpf', label: 'CNPJ / CPF',          tipo: 'String',  obrigatorio: false, descricao: 'Number(014) - CNPJ ou CPF.' },
              { tag: 'insEst', label: 'Inscrição Estadual',   tipo: 'String',  obrigatorio: false, descricao: 'String(025) - Inscrição estadual.' },
              { tag: 'endFor', label: 'Endereço',             tipo: 'String',  obrigatorio: false, descricao: 'String(100) - Logradouro.' },
              { tag: 'nenFor', label: 'Número',               tipo: 'String',  obrigatorio: false, descricao: 'String(060) - Número do endereço.' },
              { tag: 'cplEnd', label: 'Complemento',          tipo: 'String',  obrigatorio: false, descricao: 'String(020) - Complemento.' },
              { tag: 'baiFor', label: 'Bairro',               tipo: 'String',  obrigatorio: false, descricao: 'String(075) - Bairro.' },
              { tag: 'cidFor', label: 'Cidade',               tipo: 'String',  obrigatorio: false, descricao: 'String(060) - Cidade.' },
              { tag: 'sigUfs', label: 'UF',                   tipo: 'String',  obrigatorio: false, descricao: 'String(002) - Sigla do estado.' },
              { tag: 'cepFor', label: 'CEP',                  tipo: 'String',  obrigatorio: false, descricao: 'Number(008) - CEP.' },
              { tag: 'fonFor', label: 'Telefone',             tipo: 'String',  obrigatorio: false, descricao: 'String(020) - Telefone.' },
              { tag: 'intNet', label: 'E-mail',               tipo: 'String',  obrigatorio: false, descricao: 'String(100) - E-mail.' },
              { tag: 'sitFor', label: 'Situação',             tipo: 'String',  obrigatorio: false, descricao: 'Situação do cadastro.', opcoes: 'A=Ativo, I=Inativo' },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PEDIDOS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pedidos',
    nome: 'Pedidos de Venda',
    classe: 'com.senior.g5.co.mcm.ven.pedidos',
    modulo: 'Vendas',
    portas: [
      {
        id: 'GravarPedidos',
        nome: 'GravarPedidos',
        label: 'Gravar / Atualizar Pedido',
        secoes: [
          {
            tag: 'pedido', label: 'Cabeçalho do Pedido',
            campos: [
              { tag: 'opeExe',  label: 'Operação',              tipo: 'String',  obrigatorio: true,  descricao: 'Operação a executar.', opcoes: 'I=Incluir, A=Alterar, E=Excluir' },
              { tag: 'codEmp',  label: 'Empresa',               tipo: 'Integer', obrigatorio: true,  descricao: 'Código da empresa.' },
              { tag: 'codFil',  label: 'Filial',                tipo: 'Integer', obrigatorio: true,  descricao: 'Código da filial.' },
              { tag: 'codCli',  label: 'Código do Cliente',     tipo: 'Integer', obrigatorio: true,  descricao: 'Number(009) - Código do cliente.' },
              { tag: 'tnsPro',  label: 'Transação',             tipo: 'String',  obrigatorio: true,  descricao: 'Código da transação do pedido.' },
              { tag: 'codCpg',  label: 'Condição de Pagamento', tipo: 'String',  obrigatorio: true,  descricao: 'Código da condição de pagamento.' },
              { tag: 'codFpg',  label: 'Forma de Pagamento',    tipo: 'Integer', obrigatorio: true,  descricao: 'Código da forma de pagamento.' },
              { tag: 'numPed',  label: 'Número do Pedido',      tipo: 'Integer', obrigatorio: false, descricao: 'Número do pedido (gerado automaticamente se omitido).' },
              { tag: 'datPed',  label: 'Data do Pedido',        tipo: 'DateTime',obrigatorio: false, descricao: 'Data de emissão do pedido.' },
              { tag: 'datEnt',  label: 'Data de Entrega',       tipo: 'DateTime',obrigatorio: false, descricao: 'Data prevista de entrega.' },
              { tag: 'codRep',  label: 'Representante',         tipo: 'Integer', obrigatorio: false, descricao: 'Código do representante.' },
              { tag: 'codVen',  label: 'Vendedor',              tipo: 'Integer', obrigatorio: false, descricao: 'Código do vendedor.' },
              { tag: 'codTra',  label: 'Transportadora',        tipo: 'Integer', obrigatorio: false, descricao: 'Código da transportadora.' },
              { tag: 'codTab',  label: 'Tabela de Preço',       tipo: 'String',  obrigatorio: false, descricao: 'Código da tabela de preço.' },
              { tag: 'codMoe',  label: 'Moeda',                 tipo: 'String',  obrigatorio: false, descricao: 'Código da moeda.' },
              { tag: 'perDsc',  label: 'Desconto (%)',          tipo: 'Double',  obrigatorio: false, descricao: 'Percentual de desconto geral.' },
              { tag: 'obsGer',  label: 'Observação',            tipo: 'String',  obrigatorio: false, descricao: 'Observação geral do pedido.' },
              { tag: 'pedCli',  label: 'Pedido do Cliente',     tipo: 'String',  obrigatorio: false, descricao: 'Número do pedido no sistema do cliente.' },
              { tag: 'idtReq',  label: 'ID da Requisição',      tipo: 'String',  obrigatorio: false, descricao: 'Identificador único para rastreio.' },
            ],
            filhos: [
              {
                tag: 'produto', label: 'Itens do Pedido',
                campos: [
                  { tag: 'opeExe',  label: 'Operação do Item',    tipo: 'String',  obrigatorio: true,  descricao: 'Operação no item.', opcoes: 'I=Incluir, A=Alterar, E=Excluir' },
                  { tag: 'codPro',  label: 'Código do Produto',   tipo: 'String',  obrigatorio: true,  descricao: 'Código do produto.' },
                  { tag: 'codDer',  label: 'Código da Derivação', tipo: 'String',  obrigatorio: false, descricao: 'Código da derivação do produto.' },
                  { tag: 'qtdPed',  label: 'Quantidade',          tipo: 'Double',  obrigatorio: true,  descricao: 'Quantidade pedida.' },
                  { tag: 'vlrUni',  label: 'Valor Unitário',      tipo: 'Double',  obrigatorio: false, descricao: 'Valor unitário do produto.' },
                  { tag: 'perDsc',  label: 'Desconto (%)',        tipo: 'Double',  obrigatorio: false, descricao: 'Percentual de desconto do item.' },
                  { tag: 'tnsPro',  label: 'Transação do Item',   tipo: 'String',  obrigatorio: false, descricao: 'Transação específica do item.' },
                  { tag: 'seqIpd',  label: 'Sequência',           tipo: 'Integer', obrigatorio: false, descricao: 'Sequência do item no pedido.' },
                  { tag: 'datEnt',  label: 'Data Entrega Item',   tipo: 'DateTime',obrigatorio: false, descricao: 'Data de entrega específica do item.' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUTOS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'produtos',
    nome: 'Produtos',
    classe: 'com.senior.g5.co.ger.cad.produto',
    modulo: 'Cadastros',
    portas: [
      {
        id: 'Cadastrar_X',
        nome: 'Cadastrar_X',
        label: 'Cadastrar / Atualizar Produto',
        secoes: [
          {
            tag: 'produto', label: 'Dados do Produto',
            campos: [
              { tag: 'codPro',  label: 'Código do Produto',      tipo: 'String',  obrigatorio: true,  descricao: 'Código do produto.' },
              { tag: 'desPro',  label: 'Descrição',              tipo: 'String',  obrigatorio: true,  descricao: 'String(100) - Descrição do produto.' },
              { tag: 'codFam',  label: 'Família',                tipo: 'String',  obrigatorio: true,  descricao: 'Código da família do produto.' },
              { tag: 'sitPro',  label: 'Situação',               tipo: 'String',  obrigatorio: true,  descricao: 'Situação do produto.', opcoes: 'A=Ativo, I=Inativo' },
              { tag: 'uniPro',  label: 'Unidade',                tipo: 'String',  obrigatorio: true,  descricao: 'Unidade de medida do produto.' },
              { tag: 'tipPro',  label: 'Tipo de Produto',        tipo: 'String',  obrigatorio: false, descricao: 'Tipo do produto.', opcoes: 'A=Acabado, S=Semiacabado, M=Matéria-prima, B=Beneficiamento, E=Embalagem, O=Outros' },
              { tag: 'vlrCus',  label: 'Custo',                  tipo: 'Double',  obrigatorio: false, descricao: 'Valor de custo do produto.' },
              { tag: 'vlrVen',  label: 'Valor de Venda',         tipo: 'Double',  obrigatorio: false, descricao: 'Valor de venda do produto.' },
              { tag: 'pesLiq',  label: 'Peso Líquido',           tipo: 'Double',  obrigatorio: false, descricao: 'Peso líquido do produto.' },
              { tag: 'pesBru',  label: 'Peso Bruto',             tipo: 'Double',  obrigatorio: false, descricao: 'Peso bruto do produto.' },
              { tag: 'codNcm',  label: 'NCM',                    tipo: 'String',  obrigatorio: false, descricao: 'Código NCM do produto.' },
              { tag: 'codEan',  label: 'Código EAN/GTIN',        tipo: 'String',  obrigatorio: false, descricao: 'Código de barras EAN.' },
              { tag: 'obsPro',  label: 'Observação',             tipo: 'String',  obrigatorio: false, descricao: 'Observações sobre o produto.' },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NOTAS FISCAIS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'notasfiscais',
    nome: 'Notas Fiscais de Entrada',
    classe: 'com.senior.g5.co.mfi.ent.nfe',
    modulo: 'Fiscal',
    portas: [
      {
        id: 'GravarNFe',
        nome: 'GravarNFe',
        label: 'Gravar Nota Fiscal de Entrada',
        secoes: [
          {
            tag: 'notaFiscal', label: 'Cabeçalho da Nota Fiscal',
            campos: [
              { tag: 'codEmp',  label: 'Empresa',               tipo: 'Integer', obrigatorio: true,  descricao: 'Código da empresa.' },
              { tag: 'codFil',  label: 'Filial',                tipo: 'Integer', obrigatorio: true,  descricao: 'Código da filial.' },
              { tag: 'codFor',  label: 'Fornecedor',            tipo: 'Integer', obrigatorio: true,  descricao: 'Código do fornecedor.' },
              { tag: 'numNot',  label: 'Número da NF',          tipo: 'String',  obrigatorio: true,  descricao: 'Número da nota fiscal.' },
              { tag: 'serNot',  label: 'Série da NF',           tipo: 'String',  obrigatorio: true,  descricao: 'Série da nota fiscal.' },
              { tag: 'datEnt',  label: 'Data de Entrada',       tipo: 'DateTime',obrigatorio: true,  descricao: 'Data de entrada da nota fiscal.' },
              { tag: 'datEmi',  label: 'Data de Emissão',       tipo: 'DateTime',obrigatorio: true,  descricao: 'Data de emissão da nota fiscal.' },
              { tag: 'tnsPro',  label: 'Transação',             tipo: 'String',  obrigatorio: true,  descricao: 'Código da transação.' },
              { tag: 'vlrNot',  label: 'Valor Total da NF',     tipo: 'Double',  obrigatorio: true,  descricao: 'Valor total da nota fiscal.' },
              { tag: 'vlrIpi',  label: 'Valor IPI',             tipo: 'Double',  obrigatorio: false, descricao: 'Valor do IPI da nota fiscal.' },
              { tag: 'vlrIcm',  label: 'Valor ICMS',            tipo: 'Double',  obrigatorio: false, descricao: 'Valor do ICMS.' },
              { tag: 'vlrFre',  label: 'Valor Frete',           tipo: 'Double',  obrigatorio: false, descricao: 'Valor do frete.' },
              { tag: 'chaNfe',  label: 'Chave de Acesso NF-e',  tipo: 'String',  obrigatorio: false, descricao: 'Chave de acesso da NF-e (44 dígitos).' },
              { tag: 'codCpg',  label: 'Condição de Pagamento', tipo: 'String',  obrigatorio: false, descricao: 'Condição de pagamento.' },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ORÇAMENTOS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'orcamentos',
    nome: 'Orçamentos',
    classe: 'com.senior.g5.co.mcm.ven.orcamento',
    modulo: 'Vendas',
    portas: [
      {
        id: 'GravarOrcamentos',
        nome: 'GravarOrcamentos',
        label: 'Gravar / Atualizar Orçamento',
        secoes: [
          {
            tag: 'orcamento', label: 'Dados do Orçamento',
            campos: [
              { tag: 'codEmp',  label: 'Empresa',               tipo: 'Integer', obrigatorio: true,  descricao: 'Código da empresa.' },
              { tag: 'codFil',  label: 'Filial',                tipo: 'Integer', obrigatorio: true,  descricao: 'Código da filial.' },
              { tag: 'codCli',  label: 'Cliente',               tipo: 'Integer', obrigatorio: true,  descricao: 'Código do cliente.' },
              { tag: 'tnsPro',  label: 'Transação Produto',     tipo: 'String',  obrigatorio: false, descricao: 'Código da transação de produto.' },
              { tag: 'tnsSer',  label: 'Transação Serviço',     tipo: 'String',  obrigatorio: false, descricao: 'Código da transação de serviço.' },
              { tag: 'codCpg',  label: 'Condição de Pagamento', tipo: 'String',  obrigatorio: false, descricao: 'Código da condição de pagamento.' },
              { tag: 'codFpg',  label: 'Forma de Pagamento',    tipo: 'Integer', obrigatorio: false, descricao: 'Código da forma de pagamento.' },
              { tag: 'codRep',  label: 'Representante',         tipo: 'Integer', obrigatorio: false, descricao: 'Código do representante.' },
              { tag: 'codVen',  label: 'Vendedor',              tipo: 'Integer', obrigatorio: false, descricao: 'Código do vendedor.' },
              { tag: 'vldOct',  label: 'Validade',              tipo: 'DateTime',obrigatorio: false, descricao: 'Data de validade do orçamento.' },
              { tag: 'desOct',  label: 'Descrição',             tipo: 'String',  obrigatorio: false, descricao: 'Descrição do orçamento.' },
              { tag: 'perDsc',  label: 'Desconto (%)',          tipo: 'Double',  obrigatorio: false, descricao: 'Percentual de desconto geral.' },
            ],
          },
        ],
      },
    ],
  },
]

// ── Gerador XML ───────────────────────────────────────────────────────────────
function gerarXML(
  ws: Webservice,
  porta: Porta,
  valores: Record<string, string>,
  user: string,
  password: string,
  encryption: string,
): string {
  function renderSecao(secao: Secao, indent: number): string {
    const pad = '  '.repeat(indent)

    if (secao.tag === 'root') {
      return secao.campos
        .filter(c => valores[c.tag]?.trim())
        .map(c => `${pad}<${c.tag}>${valores[c.tag]}</${c.tag}>`)
        .join('\n')
    }

    const camposXml = secao.campos
      .filter(c => valores[c.tag]?.trim() || c.obrigatorio)
      .map(c => `${pad}  <${c.tag}>${valores[c.tag] ?? ''}</${c.tag}>`)
      .join('\n')

    const filhosXml = (secao.filhos ?? [])
      .map(f => renderSecao(f, indent + 1))
      .filter(Boolean)
      .join('\n')

    const corpo = [camposXml, filhosXml].filter(Boolean).join('\n')

    return `${pad}<${secao.tag}>\n${corpo}\n${pad}</${secao.tag}>`
  }

  const secoesXml = porta.secoes
    .map(s => renderSecao(s, 4))
    .filter(Boolean)
    .join('\n')

  return `<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ser="http://services.senior.com.br">
  <soapenv:Body>
    <ser:${porta.nome}>
      <user>${user}</user>
      <password>${password}</password>
      <encryption>${encryption || '0'}</encryption>
      <parameters>
${secoesXml}
      </parameters>
    </ser:${porta.nome}>
  </soapenv:Body>
</soapenv:Envelope>`
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SeniorWebservices({ user }: { user: User | null }) {
  const [wsId,    setWsId]    = useState(WEBSERVICES[0].id)
  const [portaId, setPortaId] = useState(WEBSERVICES[0].portas[0].id)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [wsUser,  setWsUser]  = useState('')
  const [wsPwd,   setWsPwd]   = useState('')
  const [wsEnc,   setWsEnc]   = useState('0')
  const [copiado, setCopiado] = useState(false)
  const [abaDir,  setAbaDir]  = useState<'xml' | 'campos'>('campos')
  const [soObrig, setSoObrig] = useState(false)

  const ws    = useMemo(() => WEBSERVICES.find(w => w.id === wsId)!,           [wsId])
  const porta = useMemo(() => ws.portas.find(p => p.id === portaId) ?? ws.portas[0], [ws, portaId])

  // Todos os campos planos de todas as seções
  const todosCampos = useMemo(() => {
    const lista: Campo[] = []
    function extrair(secoes: Secao[]) {
      for (const s of secoes) {
        lista.push(...s.campos)
        if (s.filhos) extrair(s.filhos)
      }
    }
    extrair(porta.secoes)
    return lista
  }, [porta])

  const camposVisiveis = useMemo(() =>
    soObrig ? todosCampos.filter(c => c.obrigatorio) : todosCampos,
  [todosCampos, soObrig])

  const xml = useMemo(() =>
    gerarXML(ws, porta, valores, wsUser, wsPwd, wsEnc),
  [ws, porta, valores, wsUser, wsPwd, wsEnc])

  function set(tag: string, val: string) {
    setValores(prev => ({ ...prev, [tag]: val }))
  }

  function copiar() {
    navigator.clipboard.writeText(xml).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000)
    })
  }

  function limpar() {
    setValores({})
    setWsUser(''); setWsPwd(''); setWsEnc('0')
  }

  // Ao trocar webservice, resetar porta
  function trocarWs(id: string) {
    const novo = WEBSERVICES.find(w => w.id === id)!
    setWsId(id)
    setPortaId(novo.portas[0].id)
    setValores({})
  }

  const obrigFaltando = todosCampos.filter(c => c.obrigatorio && !valores[c.tag]?.trim())
  const totalPreench  = todosCampos.filter(c => valores[c.tag]?.trim()).length

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const selectCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500'

  function renderCampos(secoes: Secao[]) {
    return secoes.map(secao => {
      const camposSec = soObrig ? secao.campos.filter(c => c.obrigatorio) : secao.campos
      const filhos    = secao.filhos ?? []

      if (secao.tag === 'root') {
        if (!camposSec.length) return null
        return (
          <div key={secao.tag}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{secao.label}</h3>
            <div className="space-y-3">{camposSec.map(c => renderCampo(c))}</div>
          </div>
        )
      }

      return (
        <div key={secao.tag} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{secao.label}</span>
            <code className="ml-2 text-[11px] text-gray-400 font-mono">&lt;{secao.tag}&gt;</code>
          </div>
          <div className="p-4 space-y-3">
            {camposSec.map(c => renderCampo(c))}
            {filhos.length > 0 && (
              <div className="space-y-4 mt-2">
                {renderCampos(filhos)}
              </div>
            )}
          </div>
        </div>
      )
    })
  }

  function renderCampo(c: Campo) {
    const val = valores[c.tag] ?? ''
    return (
      <div key={c.tag}>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {c.label}
          </label>
          {c.obrigatorio && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-medium">obrigatório</span>
          )}
          <code className="ml-auto text-[10px] font-mono text-gray-400">&lt;{c.tag}&gt;</code>
        </div>
        {c.opcoes ? (
          <select value={val} onChange={e => set(c.tag, e.target.value)} className={selectCls}>
            <option value="">-- selecione --</option>
            {c.opcoes.split(',').map(op => {
              const [v, l] = op.trim().split('=')
              return <option key={v} value={v.trim()}>{v.trim()} — {l?.trim()}</option>
            })}
          </select>
        ) : (
          <input
            type="text" value={val}
            onChange={e => set(c.tag, e.target.value)}
            placeholder={c.mascara ?? c.descricao.split(' - ')[0] ?? ''}
            className={`${inputCls} ${c.obrigatorio && !val ? 'border-red-300 dark:border-red-700' : ''}`}
          />
        )}
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">{c.descricao}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-5">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200">Senior Webservices</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Senior Webservices</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gere requisições SOAP para os webservices do Senior ERP</p>
          </div>
          <button onClick={limpar}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpar
          </button>
        </div>

        {/* Seletor de webservice + porta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Webservice</label>
            <select value={wsId} onChange={e => trocarWs(e.target.value)} className={selectCls}>
              {WEBSERVICES.map(w => (
                <option key={w.id} value={w.id}>{w.modulo} — {w.nome}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1 font-mono">{ws.classe}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Porta (operação)</label>
            <select value={portaId} onChange={e => { setPortaId(e.target.value); setValores({}) }} className={selectCls}>
              {ws.portas.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-4">

          {/* ── Painel esquerdo: formulário ──────────────────────────── */}
          <div className="space-y-4">

            {/* Autenticação */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Autenticação
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Usuário <span className="text-red-500">*</span></label>
                  <input type="text" value={wsUser} onChange={e => setWsUser(e.target.value)} placeholder="senior" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Senha <span className="text-red-500">*</span></label>
                  <input type="password" value={wsPwd} onChange={e => setWsPwd(e.target.value)} placeholder="••••••" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Encryption</label>
                  <select value={wsEnc} onChange={e => setWsEnc(e.target.value)} className={selectCls}>
                    <option value="0">0 — Sem criptografia</option>
                    <option value="1">1 — MD5</option>
                    <option value="2">2 — SHA1</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filtro + progresso */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div onClick={() => setSoObrig(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${soObrig ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${soObrig ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Mostrar apenas obrigatórios</span>
              </label>
              <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                {totalPreench}/{todosCampos.length} preenchidos
                {obrigFaltando.length > 0 && (
                  <span className="ml-2 text-red-500">· {obrigFaltando.length} obrigatório(s) faltando</span>
                )}
              </div>
            </div>

            {/* Campos por seção */}
            <div className="space-y-4">
              {renderCampos(porta.secoes)}
            </div>
          </div>

          {/* ── Painel direito: XML gerado ──────────────────────────── */}
          <div className="xl:sticky xl:top-6 self-start space-y-3">

            {/* Abas */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl">
              {(['campos', 'xml'] as const).map(a => (
                <button key={a} onClick={() => setAbaDir(a)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${abaDir === a ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                  {a === 'campos' ? '📋 Campos preenchidos' : '📄 XML gerado'}
                </button>
              ))}
            </div>

            {abaDir === 'xml' ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Envelope SOAP</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{porta.nome}</p>
                  </div>
                  <button onClick={copiar}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white transition">
                    {copiado
                      ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copiado!</>
                      : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar XML</>
                    }
                  </button>
                </div>
                <pre className="p-5 text-[11px] font-mono leading-relaxed text-green-400 bg-gray-950 overflow-auto max-h-[600px] whitespace-pre-wrap break-all">
                  {xml}
                </pre>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campos preenchidos</h3>
                </div>
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  {Object.entries(valores).filter(([, v]) => v.trim()).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Nenhum campo preenchido ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(valores).filter(([, v]) => v.trim()).map(([tag, val]) => {
                        const campo = todosCampos.find(c => c.tag === tag)
                        return (
                          <div key={tag} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <code className="text-[11px] font-mono font-semibold text-brand-600 dark:text-brand-400">{tag}</code>
                                {campo?.obrigatorio && <span className="text-[10px] text-red-500">obrigatório</span>}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{campo?.label ?? tag}</p>
                            </div>
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 shrink-0 max-w-[120px] truncate">{val}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumo de obrigatórios */}
            {obrigFaltando.length > 0 && (
              <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">
                  Campos obrigatórios não preenchidos ({obrigFaltando.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {obrigFaltando.map(c => (
                    <code key={c.tag} className="text-[11px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono">
                      {c.tag}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* WSDL */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">WSDL</p>
              <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 break-all leading-relaxed">
                http://[servidor]/g5-senior-services/sapiens_Sync{ws.classe.replace(/\./g, '_')}?wsdl
              </p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
