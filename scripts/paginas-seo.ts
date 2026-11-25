// Gera as páginas de busca do site (uma por tema que os advogados pesquisam no Google).
// Rodar: npx tsx scripts/paginas-seo.ts   → escreve <slug>/index.html, o sitemap.xml e a lista de entradas do Vite.
// Regras: só o que o HiAdv faz de verdade, sem promessa de resultado e sem comparar com concorrentes pelo nome.
import { mkdirSync, writeFileSync } from 'node:fs'

type Pergunta = [string, string]
type Pagina = { slug: string; titulo: string; descricao: string; h1: string; abertura: string; blocos: [string, string][]; perguntas: Pergunta[] }

const URL = 'https://hiadv.com.br'
const HOJE = new Date().toISOString().slice(0, 10)

export const PAGINAS: Pagina[] = [
  {
    slug: 'software-juridico',
    titulo: 'Software jurídico para escritório de advocacia | HiAdv',
    descricao: 'Software jurídico online para escritórios de advocacia: prazos, publicações, casos por área, atendimentos, tarefas e financeiro no celular e no computador. Teste grátis por 14 dias.',
    h1: 'Software jurídico para o escritório inteiro',
    abertura: 'O HiAdv é um software jurídico online feito por advogados. Ele junta num só lugar o que costuma ficar espalhado entre planilha, agenda, WhatsApp e pasta no Drive: os casos de cada área, os prazos, as publicações, os atendimentos e o financeiro.',
    blocos: [
      ['Casos por área, em etapas', 'Cada área do escritório (trabalhista, cível e família, bancário, penal, previdenciário e extrajudicial) tem um quadro com as etapas prontas. O caso anda de etapa em etapa com o que falta para avançar à vista, e quem assume recebe um resumo da passagem.'],
      ['Prazos e publicações sem planilha', 'As publicações chegam pela OAB acompanhada, os prazos são contados com os feriados dos tribunais e tudo aparece na tela "Seu dia" de quem é o responsável.'],
      ['No celular e no computador', 'O HiAdv se instala pelo navegador no Android, no iPhone e no computador e funciona como aplicativo. Não precisa de servidor no escritório.'],
      ['Sigilo e LGPD', 'Cada escritório só enxerga os próprios dados, o acesso é por pessoa com papéis definidos pelo Gestor Master e as ações importantes ficam registradas.'],
    ],
    perguntas: [
      ['Quanto custa o HiAdv?', 'Os planos começam em R$ 119,90 por mês no Júnior. O Pleno custa R$ 197,90, o Sênior R$ 397,50 e o Sênior + Sara R$ 524,50.'],
      ['Tem teste grátis?', 'Sim, 14 dias com os dados do seu escritório.'],
      ['Serve para escritório pequeno?', 'Sim. O Júnior foi pensado para o advogado autônomo, com ou sem um assistente.'],
    ],
  },
  {
    slug: 'sistema-para-advogados',
    titulo: 'Sistema para advogados: gestão de processos e prazos | HiAdv',
    descricao: 'Sistema para advogados e escritórios: controle de processos, prazos, publicações, clientes e tarefas da equipe, com quadro por área e acesso pelo celular.',
    h1: 'Sistema para advogados que trabalham em equipe',
    abertura: 'Um sistema para advogados precisa responder a três perguntas todo dia: o que vence hoje, quem está cuidando e o que falta para o caso andar. O HiAdv mostra isso para cada pessoa da equipe, sem precisar montar relatório.',
    blocos: [
      ['A tela "Seu dia"', 'Cada pessoa abre o sistema e vê o que está atrasado, o que é para hoje e os próximos sete dias: prazos, audiências, perícias e tarefas.'],
      ['Tarefas com dono e data', 'Tarefas nascem das etapas do caso ou são criadas na hora, com responsável, prazo e histórico. O gestor vê a carga de cada pessoa.'],
      ['Ficha do cliente completa', 'Casos, processos, honorários, documentos pendentes e o link de acompanhamento que o cliente abre sem senha.'],
      ['Busca rápida', 'Ctrl+K encontra cliente, caso, processo ou CPF de qualquer tela.'],
    ],
    perguntas: [
      ['Preciso instalar alguma coisa no computador?', 'Não. O HiAdv roda no navegador e pode ser instalado como aplicativo no celular e no computador.'],
      ['Quantas pessoas podem usar?', 'Depende do plano: do Júnior (1 Master e 1 colaborador) ao Sênior (até 5 Masters e 20 colaboradores).'],
    ],
  },
  {
    slug: 'software-previdenciario',
    titulo: 'Software para advocacia previdenciária | HiAdv',
    descricao: 'Software para advogado previdenciarista: casos de auxílio-acidente, auxílio-doença, aposentadoria e BPC em etapas, do requerimento no INSS à ação judicial, com perícias e exigências no prazo.',
    h1: 'Software para advocacia previdenciária',
    abertura: 'O HiAdv nasceu dentro de um escritório previdenciário. O previdenciário administrativo e o judicial têm quadros próprios, com as etapas que o caso percorre do primeiro contato até a implantação do benefício.',
    blocos: [
      ['Do requerimento à ação', 'Etapas para conferência de documentos e CNIS, requerimento no INSS, exigências, perícia, recurso ao CRPS e ação judicial, cada uma com o seu checklist.'],
      ['Perícias e exigências no radar', 'A perícia entra na agenda do responsável com o lembrete do que o cliente deve levar, e a exigência do INSS vira tarefa com prazo.'],
      ['Benefícios por incapacidade', 'Auxílio-doença, aposentadoria por incapacidade permanente e auxílio-acidente, além de BPC/LOAS e planejamento de aposentadoria.'],
      ['O cliente acompanha sozinho', 'O cliente recebe um link pessoal e vê a fase do caso em linguagem simples e os próximos compromissos, sem documentos nem anotações internas.'],
    ],
    perguntas: [
      ['O HiAdv faz cálculo previdenciário?', 'O plano Pleno inclui calculadoras de cada área. O parecer sobre o direito continua com o advogado.'],
      ['Serve para escritório que atua no Brasil todo?', 'Sim. O sistema é online e os prazos consideram os feriados de cada tribunal.'],
    ],
  },
  {
    slug: 'crm-juridico',
    titulo: 'CRM jurídico: do primeiro contato ao contrato | HiAdv',
    descricao: 'CRM jurídico para escritórios de advocacia: atendimentos do primeiro contato até virar cliente, com origem rastreada, etapas, responsáveis e passagem para o caso.',
    h1: 'CRM jurídico para os atendimentos do escritório',
    abertura: 'Quem chega pelo site, pelo WhatsApp ou por indicação entra na tela de Atendimentos com a origem marcada. O atendimento anda pelas etapas até virar cliente e caso, sem ninguém precisar redigitar nada.',
    blocos: [
      ['Etapas do atendimento', 'Novo contato, em conversa, proposta enviada, contrato e caso aberto. Dá para ver em lista ou em quadro.'],
      ['Origem de cada contato', 'Instagram, site, indicação ou WhatsApp: o escritório sabe de onde vêm os clientes que fecham.'],
      ['Sem envio automático ao cliente', 'O sistema organiza e lembra. Nenhuma mensagem sai para o cliente sem alguém da equipe conferir.'],
    ],
    perguntas: [
      ['O atendimento vira caso automaticamente?', 'Quando o contrato é fechado, o atendimento vira cliente e caso na área certa, já com os dados preenchidos.'],
    ],
  },
  {
    slug: 'controle-de-prazos-processuais',
    titulo: 'Controle de prazos processuais e publicações | HiAdv',
    descricao: 'Controle de prazos processuais com feriados dos tribunais e publicações pela OAB acompanhada. Cada prazo tem responsável e aparece na agenda de quem vai cumprir.',
    h1: 'Controle de prazos processuais e publicações',
    abertura: 'Prazo perdido custa caro. No HiAdv, a publicação chega pela OAB acompanhada, vira prazo contado com os feriados do tribunal e fica na agenda de quem é o responsável, com aviso antes do vencimento.',
    blocos: [
      ['Publicações pela OAB', 'As intimações das OABs acompanhadas aparecem numa caixa própria para ler, distribuir e transformar em prazo ou tarefa.'],
      ['Feriados dos tribunais', 'A contagem considera dias úteis e os feriados do tribunal do processo.'],
      ['Agenda por pessoa', 'Prazos, audiências e perícias ficam na agenda e na tela "Seu dia" do responsável, com os atrasados no topo.'],
    ],
    perguntas: [
      ['Quantas OABs posso acompanhar?', 'Uma no Júnior, três no Pleno e dez nos planos Sênior.'],
    ],
  },
  {
    slug: 'sobre',
    titulo: 'Sobre o HiAdv: software jurídico feito por advogados | HiAdv',
    descricao: 'Conheça o HiAdv, software jurídico brasileiro criado por advogados para organizar prazos, casos e atendimentos de escritórios de advocacia, com sigilo, LGPD e ética da OAB desde o começo.',
    h1: 'Sobre o HiAdv',
    abertura: 'O HiAdv é um software jurídico brasileiro, criado e desenvolvido pelos fundadores Felipe Schena Lanhi e Deividy Ryan de Jesus Batista a partir da rotina real de um escritório de advocacia. Ele organiza o que o escritório faz todo dia (prazos, publicações, casos, atendimentos e honorários) e deixa com o advogado o que é dele: parecer, decisão e assinatura.',
    blocos: [
      ['Quem faz o HiAdv', 'Felipe Schena Lanhi é advogado (OAB/SC 30.297) e conduz o produto a partir da prática do escritório. Deividy Ryan de Jesus Batista é o responsável pelo desenvolvimento da plataforma. Os dois fundaram o HiAdv e respondem por ele.'],
      ['Feito dentro de um escritório', 'Cada tela nasceu de um problema do dia a dia: prazo que escapava na planilha, cliente perguntando pelo WhatsApp em que fase está o caso, documento que ninguém sabia se tinha chegado.'],
      ['Sigilo e LGPD', 'Cada escritório só enxerga os próprios dados. A conexão é criptografada, o acesso é por pessoa com papéis definidos pelo Gestor Master, as ações importantes ficam registradas e laudos e exames são tratados como dados sensíveis.'],
      ['Ética da advocacia', 'O sistema organiza, avisa e agenda. Nenhuma mensagem sai para o cliente sem alguém da equipe conferir, e a IA só prepara rascunhos marcados para revisão do advogado.'],
      ['Implantação e suporte', 'Os 20 primeiros escritórios têm implantação assistida sem custo: a equipe do HiAdv ajuda a importar os clientes e a configurar as áreas. O atendimento é pelo WhatsApp (49) 99973-0572 e pelo e-mail hiadvofc@gmail.com.'],
    ],
    perguntas: [
      ['O HiAdv atende escritórios de outros estados?', 'Sim. O HiAdv é 100% online e atende escritórios de todo o Brasil.'],
      ['Como falo com a equipe do HiAdv?', 'Pelo WhatsApp (49) 99973-0572 ou pelo e-mail hiadvofc@gmail.com.'],
    ],
  },
]

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

function html(p: Pagina): string {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${URL}/${p.slug}/`, url: `${URL}/${p.slug}/`, name: p.titulo, description: p.descricao, inLanguage: 'pt-BR', isPartOf: { '@id': `${URL}/#site` }, about: { '@id': `${URL}/#app` } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'HiAdv', item: `${URL}/` }, { '@type': 'ListItem', position: 2, name: p.h1, item: `${URL}/${p.slug}/` }] },
      { '@type': 'FAQPage', mainEntity: p.perguntas.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  }
  const outras = PAGINAS.filter((o) => o.slug !== p.slug).map((o) => `<li><a href="/${o.slug}/">${esc(o.h1)}</a></li>`).join('')
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(p.titulo)}</title>
    <meta name="description" content="${esc(p.descricao)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#0e0e0e" />
    <link rel="canonical" href="${URL}/${p.slug}/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="HiAdv" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:url" content="${URL}/${p.slug}/" />
    <meta property="og:title" content="${esc(p.titulo)}" />
    <meta property="og:description" content="${esc(p.descricao)}" />
    <meta property="og:image" content="${URL}/og-hiadv.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" href="/icons/favicon-96.png" sizes="96x96" />
    <link rel="icon" href="/icons/favicon-48.png" sizes="48x48" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
  </head>
  <body class="sv">
    <header class="sv-topo"><div class="sv-largura sv-topo-linha">
      <a class="sv-marca marca" href="/" aria-label="HiAdv, início"><span class="marca-pasta" aria-hidden="true"><i></i><b>Hi</b></span><span class="marca-nome" aria-hidden="true">Adv</span></a>
      <div class="sv-topo-acoes"><a class="sv-experimentar" href="/experimentar">Experimentar</a><a class="sv-btn sv-btn-claro" href="/aderir">Aderir</a></div>
    </div></header>
    <main id="conteudo" class="sv-seo">
      <section class="sv-largura sv-seo-abre">
        <nav class="sv-seo-trilha" aria-label="Você está em"><a href="/">HiAdv</a> / <span>${esc(p.h1)}</span></nav>
        <h1>${esc(p.h1)}</h1>
        <p class="sv-heroi-sub">${esc(p.abertura)}</p>
        <div class="sv-heroi-acoes"><a class="sv-btn sv-btn-claro sv-btn-grande" href="/aderir">Testar grátis por 14 dias</a><a class="sv-btn sv-btn-contorno sv-btn-grande" href="/experimentar">Ver o sistema por dentro</a></div>
      </section>
      <section class="sv-largura sv-seo-blocos">
        ${p.blocos.map(([t, d]) => `<article><h2>${esc(t)}</h2><p>${esc(d)}</p></article>`).join('\n        ')}
      </section>
      <section class="sv-largura sv-duvidas">
        <h2>Perguntas frequentes</h2>
        ${p.perguntas.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n        ')}
      </section>
      <section class="sv-largura sv-seo-mais">
        <h2>Veja também</h2>
        <ul>${outras}<li><a href="/#planos">Planos e preços</a></li><li><a href="/#como-funciona">Como o HiAdv funciona por dentro</a></li></ul>
      </section>
    </main>
    <footer class="sv-rodape"><p class="sv-largura sv-rodape-fim">© 2026 HiAdv · <a href="/">hiadv.com.br</a> · <a href="/sobre/">Sobre</a> · <a href="/privacidade/">Privacidade e cookies</a></p></footer>
    <script type="module" src="/src/site/pagina.ts"></script>
  </body>
</html>
`
}

for (const p of PAGINAS) { mkdirSync(p.slug, { recursive: true }); writeFileSync(`${p.slug}/index.html`, html(p)) }
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${URL}/</loc><lastmod>${HOJE}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
${PAGINAS.map((p) => `  <url><loc>${URL}/${p.slug}/</loc><lastmod>${HOJE}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n')}
  <url><loc>${URL}/privacidade/</loc><lastmod>${HOJE}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>
`)
writeFileSync('scripts/paginas-seo.json', JSON.stringify([...PAGINAS.map((p) => p.slug), 'privacidade']))
console.log('páginas de busca geradas:', PAGINAS.length)
