# HiAdv

Gestão jurídica para escritórios de advocacia, com a Sara como assistente de ações.

**Autoria:** compartilhada entre Deividy e Felipe Lanhi.

## Como rodar

```bash
npm ci
npm run dev        # abre em http://localhost:5173 usando o projeto de TESTE do Supabase
npm test           # testes de lógica (Vitest)
npm run e2e        # testes de tela no computador e no celular (Playwright)
```

## Regras do projeto

- Interface em português do Brasil; código em inglês.
- O front só conhece a URL e a chave **publicável** do Supabase. A chave secreta nunca entra aqui (o próprio código recusa).
- Desenvolvimento e testes usam o projeto de teste, com dados fictícios.
- Publicação: push na `main` publica no GitHub Pages em `hiadv.com.br`. Nunca apagar `public/CNAME`.
- Projeto e plano: `docs/` (documento de projeto do HiAdv 2 e plano da Fase 0).
