# FuumaFuma

Site pessoal da Mel: um blog com banner rotativo, diário de progresso de
escrita, publicações organizadas por tag e um painel de escrita de
verdade (parecido com o editor do WordPress), hospedado de graça no
Netlify.

## Como o site funciona por baixo dos panos

- O **front-end** (o que aparece no navegador) é HTML, CSS e JS puros —
  sem servidor, sem banco de dados.
- Cada publicação vira **um arquivo** dentro de `data/posts/` (ex.:
  `2026-09-15-titulo-da-fic.json`).
- A cada publicação nova, um **script de build** (`scripts/build-posts.js`)
  roda automaticamente no Netlify, junta todos esses arquivos e gera
  `data/posts.json` — que é o arquivo que o site de fato lê para montar a
  Home, a página Histórias e cada publicação. Ele também atualiza sozinho
  a data da última publicação em `data/config.json`, para o "Diário de
  escrita" da Home recalcular certinho.
- O **painel de escrita** (`/admin`) usa o Decap CMS: a Mel escreve num
  editor de texto visual, com botões de negrito, itálico, título, citação
  e imagem — sem tocar em nenhum arquivo — e ele mesmo cria o arquivo
  certo em `data/posts/` a cada "Publicar".

## Passo a passo para colocar no ar (você, uma vez)

### 1. Suba os arquivos para o GitHub

```bash
git clone https://github.com/jacqueroll/FuumaFuma.git
cd FuumaFuma
# copie o conteúdo desta pasta para dentro do repositório clonado
git add .
git commit -m "site do FuumaFuma com painel de escrita"
git push
```

### 2. Crie o site no Netlify

1. Crie uma conta em netlify.com (dá para entrar direto com a conta do
   GitHub).
2. **Add new site → Import an existing project → GitHub**, autorize o
   Netlify e escolha o repositório `jacqueroll/FuumaFuma`.
3. Configuração de build: o Netlify já deve detectar sozinho, pelo
   `netlify.toml`, que o comando é `npm run build` e a pasta publicada é
   a raiz do projeto. Só clique em **Deploy**.
4. Em alguns minutos o site está no ar num endereço tipo
   `https://algum-nome-aleatorio.netlify.app`. Em **Site configuration →
   Domain management** dá para trocar esse nome ou apontar um domínio
   próprio, se um dia vocês quiserem.

### 3. Ative o login do painel (GitHub OAuth)

O login do painel passa direto pelo GitHub: quem for escrever faz login
com a própria conta do GitHub, e essa conta precisa ter permissão de
escrita no repositório `jacqueroll/FuumaFuma`. O projeto já vem com duas
Netlify Functions (`netlify/functions/auth.js` e `callback.js`) que fazem
essa ponte — falta só criar as credenciais no GitHub e colocá-las no
Netlify.

**a. Crie um GitHub OAuth App**

1. No GitHub, vá em **Settings → Developer settings → OAuth Apps → New
   OAuth App** (`https://github.com/settings/developers`).
2. Preencha:
   - **Application name**: `FuumaFuma CMS` (ou qualquer nome)
   - **Homepage URL**: `https://fuumafuma.netlify.app`
   - **Authorization callback URL**: `https://fuumafuma.netlify.app/api/callback`
3. Clique em **Register application**.
4. Copie o **Client ID** que aparece. Clique em **Generate a new client
   secret** e copie o **Client secret** também (ele só aparece uma vez).

**b. Coloque essas credenciais no Netlify**

1. No painel do Netlify, vá em **Project configuration → Environment
   variables**.
2. Adicione duas variáveis:
   - `GITHUB_OAUTH_CLIENT_ID` = o Client ID copiado
   - `GITHUB_OAUTH_CLIENT_SECRET` = o Client secret copiado
3. Salve e depois vá em **Deploys → Trigger deploy → Deploy site**, para
   o site recompilar já com essas variáveis disponíveis.

> Se um dia vocês trocarem o domínio do site de novo, é preciso atualizar
> tanto a Authorization callback URL no GitHub quanto o `base_url` em
> `admin/config.yml` para o endereço novo.

### 4. Dê acesso à Mel

1. Ela precisa de uma conta no GitHub (gratuita, se ainda não tiver).
2. No repositório, vá em **Settings → Collaborators → Add people** e
   coloque o usuário do GitHub dela. Ela recebe um convite por e-mail
   para aceitar.
3. Depois de aceitar, o caminho dela para escrever é sempre:
   `https://fuumafuma.netlify.app/admin/` — ela clica em **"Login with
   GitHub"**, autoriza o app na primeira vez, e cai direto no painel.

## Como a Mel escreve, no dia a dia

1. Acessa `/admin` (dá para deixar salvo nos favoritos), clica em **Login
   with GitHub** e entra com a conta dela.
2. Clica em **Publicações → New Post**.
3. Preenche título, data, tags, resumo, capa (opcional) e escreve o
   texto no editor — negrito, itálico, título, citação, listas, links e
   imagens tudo pelos botões, sem precisar saber HTML.
4. Clica em **Publish**.
5. Em 1 a 2 minutos o Netlify recompila o site sozinho e a publicação
   aparece na Home e em Histórias, já com a data do "Diário de escrita"
   atualizada.

Apagar ou editar uma publicação depois é só abrir ela de novo em
**Publicações**, mudar o que quiser (ou apagar) e publicar de novo.

Para trocar entre meta quinzenal e mensal, é em **Configurações → Meta de
escrita**, dentro do próprio painel.

## Caminho alternativo, sem o painel (offline)

Se algum dia o painel estiver fora do ar, ou a Mel preferir escrever sem
internet primeiro, `escrever.html` continua funcionando como antes: um
editor local que salva rascunho no navegador e gera o código de um
arquivo para colar manualmente em `data/posts/` pelo site do GitHub. O
passo a passo fica dentro da própria página.

## Estrutura do projeto

```
index.html                → Home (banner, boas-vindas, progresso, últimas publicações)
historias.html            → todas as publicações, com filtro por tag
post.html                 → template de uma publicação (lido via ?slug=...)
sobre-mim.html             → página "Sobre mim"
sobre-projeto.html        → página "Sobre o projeto"
escrever.html             → editor manual, alternativo ao painel (não fica no menu)
admin/                    → o painel de escrita (Decap CMS)
admin/config.yml          → configuração do painel (campos, coleções, endereço do site)
netlify/functions/        → ponte de login (GitHub OAuth) para o painel funcionar
data/posts/               → um arquivo .json por publicação — o que a Mel edita, direto ou pelo painel
data/posts.json           → gerado sozinho a cada build — o que o site lê no navegador
data/config.json          → gerado sozinho a cada build (meta de escrita + última publicação)
scripts/build-posts.js    → junta data/posts/*.json em data/posts.json
netlify.toml              → diz ao Netlify como rodar o build
package.json              → dependência usada no build (conversor de markdown)
assets/css/style.css      → identidade visual (paleta inspirada no Goodreads)
assets/js/                → toda a lógica do site (sem frameworks, JS puro)
assets/images/hero/       → imagens do banner rotativo (Fuuma e Kamui)
assets/images/about/      → imagens das páginas "Sobre"
assets/images/posts/      → imagens enviadas pelo painel entram aqui sozinhas
```

## Removendo a publicação de exemplo

Existe uma publicação de demonstração em
`data/posts/post-de-exemplo-pode-apagar.json` (aparece como "Post de
exemplo — pode apagar!"). A forma mais simples de removê-la é abrir o
painel em `/admin`, entrar em Publicações, abrir essa publicação e clicar
em apagar.

## Créditos das imagens

As artes de Fuuma Monou e Kamui Shirou usadas no banner e nas páginas
"Sobre" são ilustrações oficiais de **X/1999**, de **CLAMP**, enviadas
pela própria Mel. Este é um site de fã, sem fins comerciais.
