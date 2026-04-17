/** Links das notas de versão na documentação oficial Senior (fonte única para UI e futuro monitor). */
export interface LinkDocSenior {
  id: string
  titulo: string
  url: string
}

export const DOCS_SENIOR_NOTAS_VERSAO: LinkDocSenior[] = [
  {
    id: 'erp-5-10-4',
    titulo: 'Gestão Empresarial ERP — 5.10.4',
    url: 'https://documentacao.senior.com.br/gestaoempresarialerp/notasdaversao/#5-10-4.htm',
  },
  {
    id: 'de-5-8-16',
    titulo: 'Documentos Eletrônicos — 5.8.16',
    url: 'https://documentacao.senior.com.br/documentoseletronicos/notasdaversao/#5-8-16.htm',
  },
]
