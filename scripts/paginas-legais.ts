// Gera a Política de Privacidade (/privacidade/), com a seção de cookies e armazenamento.
// Rodar: npx tsx scripts/paginas-legais.ts. Texto revisável pelos fundadores; data da versão no topo.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const VERSAO = '26 de novembro de 2026'
const CONTATO = 'hiadvofc@gmail.com'

type Secao = [string, string[]]
const SECOES: Secao[] = [
  ['Quem somos', [
    `O HiAdv é um software jurídico para escritórios de advocacia, acessado em hiadv.com.br. A plataforma foi criada e é desenvolvida e mantida pelos fundadores Felipe Schena Lanhi e Deividy Ryan de Jesus Batista, que respondem pelo tratamento dos dados descrito nesta política.`,
    `Para qualquer assunto sobre os seus dados, inclusive para exercer os seus direitos, fale com o nosso canal de privacidade pelo e-mail ${CONTATO}.`,
  ]],
  ['Os dois papéis do HiAdv', [
    `Controlador: quando você visita o site, faz a prévia, responde ao questionário de adesão, entra na lista de espera ou fala conosco, o HiAdv decide como esses dados são usados e é o controlador.`,
    `Operador: os dados que um escritório cadastra no sistema (clientes, casos, documentos, prazos, honorários e anotações) pertencem ao escritório, que é o controlador. O HiAdv trata esses dados apenas para prestar o serviço contratado, seguindo as instruções do escritório, e não os usa para nenhuma outra finalidade.`,
  ]],
  ['Quais dados tratamos', [
    `No site e na adesão: nome, e-mail, WhatsApp, número da OAB, nome do escritório, cidade e UF, as respostas do questionário, o plano escolhido, o código de indicação, quando houver, e o registro do seu consentimento.`,
    `No uso do sistema: e-mail de acesso, nome, papel na equipe e o registro das ações importantes (quem fez, o quê e quando), para segurança e auditoria. A senha é guardada pelo provedor de autenticação em formato protegido e não é visível para ninguém, nem para a equipe do HiAdv.`,
    `Dados do escritório: o que a equipe do escritório cadastrar, o que pode incluir dados pessoais sensíveis de clientes, como laudos e exames. Esses dados são tratados como sensíveis, com acesso restrito à equipe do próprio escritório.`,
    `Na prévia (/experimentar) os dados são fictícios e nada do que você fizer fica salvo.`,
  ]],
  ['Para que usamos e com qual base legal', [
    `Responder ao seu contato, recomendar um plano e liberar o teste ou a adesão: procedimentos preliminares e execução de contrato (art. 7º, V, da LGPD) e o seu consentimento, quando pedido no formulário (art. 7º, I).`,
    `Prestar o serviço ao escritório, manter o acesso, a segurança e o histórico de ações: execução de contrato (art. 7º, V) e legítimo interesse em proteger a conta e prevenir fraudes (art. 7º, IX).`,
    `Cumprir obrigações legais e regulatórias e exercer direitos em processos: art. 7º, II e VI.`,
    `Não vendemos dados pessoais, não os usamos para publicidade de terceiros e não fazemos captação de clientes para os escritórios.`,
  ]],
  ['Inteligência artificial', [
    `Os recursos de IA são opcionais e só existem nos planos Sênior e Master. No Sênior, o escritório conecta a própria chave de IA, e o uso segue o contrato do escritório com esse fornecedor. No Master, a Sara Integrada usa o fornecedor de IA contratado pelo HiAdv.`,
    `Antes de enviar um pedido à IA, o sistema troca nomes, CPF, telefones e números de processo por marcadores. A IA devolve rascunhos para revisão do advogado: nada é protocolado, assinado ou enviado ao cliente por ela.`,
  ]],
  ['Com quem os dados são compartilhados', [
    `Usamos fornecedores que funcionam como operadores do HiAdv: hospedagem do banco de dados e autenticação (Supabase), hospedagem do site (GitHub Pages) e, nos planos com IA, o fornecedor do modelo de IA.`,
    `Integrações como Google Agenda, Google Drive, Escavador, JUDIT, ZapSign, Clicksign, D4Sign e Asaas só recebem dados quando o próprio escritório as conecta, e na medida necessária para cada função.`,
    `Os dados também podem ser compartilhados por ordem judicial ou exigência legal.`,
  ]],
  ['Transferência internacional', [
    `O banco de dados de produção e alguns fornecedores ficam fora do Brasil, nos Estados Unidos. A transferência ocorre para a execução do contrato e com fornecedores que adotam garantias de proteção de dados compatíveis com a LGPD (art. 33).`,
  ]],
  ['Segurança', [
    `Cada escritório só enxerga os próprios dados. A conexão é sempre criptografada, o acesso é por pessoa com papéis definidos pelo Gestor, as ações importantes ficam registradas e as chaves de integração ficam guardadas em cofre no servidor, nunca no aparelho. Nenhum sistema é totalmente imune a incidentes; se houver um incidente relevante, os afetados e a ANPD serão comunicados como manda a lei.`,
  ]],
  ['Por quanto tempo guardamos', [
    `Os dados de adesão e de contato ficam guardados enquanto houver relação com você e depois pelo prazo necessário para cumprir obrigações legais ou exercer direitos. Os dados do escritório ficam enquanto durar o contrato. Depois do cancelamento, eles são arquivados e saem do acesso em até 72 horas; antes disso, o escritório pode pedir a exportação e, depois, a exclusão, ressalvado o que a lei mandar guardar.`,
  ]],
  ['Seus direitos', [
    `Você pode pedir a confirmação de que tratamos os seus dados, o acesso, a correção, a anonimização, o bloqueio ou a eliminação do que for desnecessário, a portabilidade, a informação sobre com quem compartilhamos e a revogação do consentimento (art. 18 da LGPD). Peça pelo e-mail ${CONTATO}. Se os dados forem de um escritório cliente do HiAdv, encaminharemos o pedido ao escritório, que é o controlador.`,
    `Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
  ]],
  ['Cookies e armazenamento no aparelho', [
    `O HiAdv não usa cookies de publicidade, de rastreamento nem ferramentas de análise de terceiros.`,
    `Usamos apenas o armazenamento essencial do navegador para o site e o sistema funcionarem: manter você conectado, lembrar o tema claro ou escuro, guardar o andamento da prévia e permitir o uso como aplicativo e sem internet (service worker). Esse armazenamento não identifica você para terceiros e pode ser apagado nas configurações do navegador; sem ele, o login e algumas funções deixam de funcionar.`,
    `O botão de WhatsApp leva ao site do WhatsApp, que segue a política própria dele.`,
  ]],
  ['Crianças e adolescentes', [
    `O HiAdv é feito para escritórios de advocacia e não se destina a menores de 18 anos. Dados de crianças e adolescentes que o escritório cadastrar como clientes seguem o melhor interesse deles, como pede o art. 14 da LGPD.`,
  ]],
  ['Mudanças nesta política', [
    `Esta política pode ser atualizada. A data da versão em vigor fica no alto desta página, e mudanças relevantes são avisadas no sistema.`,
  ]],
]

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const TERMOS: Secao[] = [
  ['O que é o HiAdv', [
    `O HiAdv é um software de gestão para escritórios de advocacia, oferecido por assinatura em hiadv.com.br e mantido pelos fundadores Felipe Schena Lanhi e Deividy Ryan de Jesus Batista. Ao aderir, o escritório aceita estes termos e a Política de Privacidade.`,
  ]],
  ['Responsabilidade pelo trabalho jurídico', [
    `O HiAdv organiza, calcula, avisa e prepara rascunhos. Ele não substitui o advogado: a conferência de prazos, publicações, intimações, cálculos, documentos e de qualquer texto preparado pela IA é sempre do advogado responsável pelo processo.`,
    `Os prazos são calculados com os feriados e as suspensões cadastrados, e as publicações chegam pelas fontes que o escritório liga (OAB, Escavador ou JUDIT). Essas fontes podem atrasar, falhar ou trazer dados incompletos, e feriados locais ou suspensões podem não estar cadastrados. Por isso, o escritório deve conferir os prazos e as publicações nos diários e sistemas oficiais.`,
    `O HiAdv não responde por perda de prazo, prejuízo processual ou dano decorrente de dado incorreto, incompleto ou atrasado vindo de terceiros, de informação cadastrada pelo próprio escritório ou da falta de conferência pelo advogado. Quando o HiAdv identificar uma falha do próprio sistema, avisa os escritórios afetados, registra a falha e corrige o mais rápido possível.`,
    `A responsabilidade do HiAdv, quando houver, fica limitada ao valor pago pelo escritório nos 12 meses anteriores ao fato, salvo o que a lei não permitir limitar.`,
  ]],
  ['Planos, acessos e preço', [
    `Cada plano tem os recursos e o número de acessos descritos na página de planos. Acessos além do plano são combinados diretamente com o gerenciamento do HiAdv.`,
    `O valor do plano é o combinado na adesão. Ele é revisto a cada 2 anos, por um percentual combinado entre os gestores do escritório e o gerenciamento do HiAdv. Melhorias ou recursos novos contratados à parte são cobrados à parte e não alteram o valor do plano.`,
    `A implantação assistida é opcional, existe só no plano Master e é cobrada uma vez.`,
  ]],
  ['Cancelamento', [
    `Não há fidelidade nem multa. O escritório pode cancelar a qualquer momento, avisando com no mínimo 30 dias de antecedência pelo WhatsApp ou pelo e-mail ${CONTATO}.`,
    `Antes do fim do contrato, o escritório pode pedir a exportação dos seus dados. Depois do cancelamento, os dados são arquivados e saem do acesso em até 72 horas, como explica a Política de Privacidade.`,
  ]],
  ['Suporte', [
    `O WhatsApp do HiAdv atende todos os dias, inclusive sábados, domingos e feriados, das 8h às 18h. O suporte técnico atende de segunda a sexta, em dias úteis, das 13h às 18h. Adesões, a Central HiAdv e as atualizações do sistema ficam com o fundador Deividy.`,
  ]],
  ['Uso adequado', [
    `O escritório cuida das senhas e dos acessos da própria equipe, cadastra apenas dados que pode tratar e segue as regras da OAB e da LGPD. É proibido tentar acessar dados de outros escritórios, burlar travas de segurança ou usar o HiAdv para captação indevida de clientes.`,
  ]],
  ['Mudanças nestes termos', [
    `Estes termos podem ser atualizados. A data da versão em vigor fica no alto da página, e mudanças relevantes são avisadas no sistema.`,
  ]],
]

function gerar(slug: string, titulo: string, trilha: string, descricao: string, secoes: Secao[]) {
const corpo = secoes.map(([t, ps], i) => `        <section aria-labelledby="pp-${i}"><h2 id="pp-${i}">${esc(t)}</h2>\n${ps.map((p) => `          <p>${esc(p)}</p>`).join('\n')}\n        </section>`).join('\n')
const marca = '<span class="marca-pasta" aria-hidden="true"><i></i><b>Hi</b></span><span class="marca-nome" aria-hidden="true">Adv</span>'
const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${titulo} | HiAdv</title>
    <meta name="description" content="${descricao}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#0e0e0e" />
    <link rel="canonical" href="https://hiadv.com.br/${slug}/" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" href="/icons/favicon-96.png" sizes="96x96" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  </head>
  <body class="sv">
    <header class="sv-topo"><div class="sv-largura sv-topo-linha">
      <a class="sv-marca marca" href="/" aria-label="HiAdv, início">${marca}</a>
      <div class="sv-topo-acoes"><a class="sv-experimentar" href="/#experimentar">Experimentar</a><a class="sv-btn sv-btn-claro" href="/aderir">Aderir</a></div>
    </div></header>
    <main id="conteudo" class="sv-seo sv-legal">
      <div class="sv-largura">
        <nav class="sv-seo-trilha" aria-label="Você está em"><a href="/">HiAdv</a> / <span>${trilha}</span></nav>
        <h1>${titulo}</h1>
        <p class="sv-legal-versao">Versão de ${VERSAO}</p>
${corpo}
      </div>
    </main>
    <footer class="sv-rodape"><p class="sv-largura sv-rodape-fim">© 2026 HiAdv · Felipe Schena Lanhi e Deividy Ryan de Jesus Batista · <a href="mailto:${CONTATO}">${CONTATO}</a> · <a href="/privacidade/">Privacidade</a> · <a href="/termos/">Termos de uso</a></p></footer>
    <script type="module" src="/src/site/pagina.ts"></script>
  </body>
</html>
`
mkdirSync(slug, { recursive: true })
writeFileSync(`${slug}/index.html`, html)
// entra no build e no sitemap junto com as páginas de busca
const lista: string[] = JSON.parse(readFileSync('scripts/paginas-seo.json', 'utf8'))
if (!lista.includes(slug)) writeFileSync('scripts/paginas-seo.json', JSON.stringify([...lista, slug]))
}
gerar('privacidade', 'Política de Privacidade e Cookies', 'Política de Privacidade', 'Como o HiAdv trata dados pessoais de visitantes, escritórios e clientes dos escritórios, quais cookies usa e como exercer os seus direitos pela LGPD.', SECOES)
gerar('termos', 'Termos de Uso', 'Termos de Uso', 'Regras de uso do HiAdv: responsabilidade pelo trabalho jurídico, planos, preço, cancelamento sem fidelidade e suporte.', TERMOS)
console.log('política e termos gerados')
