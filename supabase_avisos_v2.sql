-- ============================================================
-- AVISOS — Versão 2.0
-- Execute no SQL Editor do Supabase
-- ============================================================

insert into avisos (tipo, titulo, descricao, versao, publicado_em) values

('novidade',
 'Sistema de Chamados',
 'Agora é possível abrir chamados diretamente pelo sistema para reportar bugs, problemas e sugestões. Acesse "Chamados" na barra de navegação, clique em "Abrir chamado", preencha o tipo, prioridade, título e descrição. Equipes de suporte e administradores podem gerenciar status e prioridade de cada chamado.',
 '2.0', now()),

('novidade',
 'Perfis e permissões de usuários',
 'Administradores agora podem gerenciar o nível de acesso de cada usuário pelo menu "Perfis". Existem três perfis: Usuário (acesso padrão), Suporte (gerencia chamados) e Admin (acesso total). A troca de perfil exibe um resumo das permissões que o usuário ganha ou perde antes de confirmar.',
 '2.0', now()),

('novidade',
 'Nome de exibição por usuário',
 'Cada usuário agora possui um nome de exibição cadastrado pelo administrador. O nome aparece na barra de navegação, nos registros (criado/atualizado por) e nos chamados (aberto por), substituindo o e-mail em todos os pontos do sistema.',
 '2.0', now()),

('melhoria',
 'Autor exibido nos registros',
 'A página de visualização de cada registro agora exibe quem criou e quem realizou a última edição, com data e horário completos. As informações ficam logo abaixo do título do registro.',
 '2.0', now()),

('melhoria',
 'Autor exibido nos chamados',
 'Na página de detalhes de um chamado, a data e horário de abertura agora são acompanhados do nome de quem abriu o chamado, facilitando a rastreabilidade e o acompanhamento pela equipe.',
 '2.0', now()),

('correcao',
 'Textos cortados na barra de navegação',
 'Corrigido o problema em que itens da barra de navegação — como "Base de Conhecimento", "Notas de versão Senior" e "Novo registro" — quebravam em duas linhas em determinadas resoluções de tela. Todos os elementos agora permanecem em uma única linha e centralizados verticalmente.',
 '2.0', now());
