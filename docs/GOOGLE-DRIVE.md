# Ligar o Google Drive no HiAdv

O HiAdv usa a permissão **drive.file** do Google: ele só enxerga os arquivos e pastas que a pessoa escolher na janela do Google. Nada é copiado para o HiAdv; os arquivos são lidos na hora e o rascunho é salvo de volta na pasta escolhida.

Isto é feito **uma vez só, para todo o HiAdv**, pela conta hiadvofc@gmail.com. Os valores gerados são identificadores públicos, não senhas.

1. Entre em console.cloud.google.com com hiadvofc@gmail.com e crie o projeto **HiAdv**.
2. Em **APIs e serviços › Biblioteca**, ative **Google Drive API** e **Google Picker API**.
3. Em **Tela de consentimento OAuth**: tipo **Externo**, nome **HiAdv**, e-mail de suporte hiadvofc@gmail.com, domínio autorizado **hiadv.com.br**, página inicial https://hiadv.com.br, política de privacidade (link do site). Em escopos, adicione só `.../auth/drive.file`. Depois, **Publicar app** (status "Em produção").
4. Em **Credenciais › Criar credenciais › ID do cliente OAuth**: tipo **Aplicativo da Web**, origem JavaScript autorizada **https://hiadv.com.br**. Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).
5. Em **Credenciais › Criar credenciais › Chave de API**: restrinja a **Referenciadores HTTP** `https://hiadv.com.br/*` e às APIs **Google Picker API** e **Google Drive API**. Copie a chave (começa com `AIza`).
6. Em **Painel do projeto**, copie o **Número do projeto** (só números).
7. No HiAdv, o Deividy abre **Central HiAdv › Google Drive do HiAdv**, cola os três valores e salva.
8. Em cada escritório do plano Sênior, o Gestor Master liga **Google Drive** em **Configurações › Integrações**.

Depois disso, no **Assistente de IA** aparece **Escolher arquivos do Drive** (PDF, Word, Google Docs e fotos; PDF e foto passam pelo reconhecimento de texto do próprio Google) e, no rascunho, **Salvar no Drive**, com o nome no padrão `aaaa_mm_dd - Título - Cliente`.
