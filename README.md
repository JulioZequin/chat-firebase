# ChatFire 🔥 — Chat individual e em grupo com Firebase e Push

Aplicativo de chat em **React Native + Expo + TypeScript** com conversas individuais e em grupo,
autenticação por **e-mail e senha**, mensagens em tempo real no **Firebase Realtime Database**,
perfis/grupos/configurações no **Cloud Firestore** e **notificações push** enviadas por uma
**API própria publicada na internet** (Node.js + Express + Firebase Admin SDK), seguindo uma
política de destinatários configurável por grupo.

---

## 👥 Integrantes

- RM556602 — Danilo Gronski Wendler
- RM554758 — Italo Caliari Silva
- RM554676 — Júlio César Ruiz Zequin
- RM555983 — Pedro Henrique Muzel Santos
- RM556027 — Vitor Montemor Ismael

---

## 🌐 API online

| Item | Valor |
|---|---|
| URL pública | **https://chat-firebase-omega.vercel.app** |
| Health check | `GET https://chat-firebase-omega.vercel.app/health` |
| Tecnologia | Node.js + Express 5 + TypeScript + Firebase Admin SDK + expo-server-sdk |
| Hospedagem | Vercel, plano Hobby gratuito (Express zero-config → Vercel Function com HTTPS) |

---

## 🧰 Tecnologias

| Camada | Tecnologia |
|---|---|
| App | React Native 0.86, **Expo SDK 57**, TypeScript 6 (strict, sem `any`) |
| Navegação | React Navigation 7 (native-stack) com parâmetros tipados |
| Auth | Firebase Authentication (somente e-mail/senha), sessão persistida com AsyncStorage |
| Mensagens | Firebase Realtime Database (listeners `onValue`) |
| Dados | Cloud Firestore (perfis, grupos, conversas, tokens, preferências) |
| Imagens | **Cloudinary** (plano gratuito; upload assinado pela API; apenas a URL vai ao Firestore) |
| Push | **Firebase Cloud Messaging** (Android, via Admin SDK) + Expo Push Service (iOS/APNs), `expo-notifications` no app |
| API | Node.js + Express 5, Firebase Admin SDK, `expo-server-sdk`, `express-rate-limit`, hospedada na Vercel |

---

## 🔥 Responsabilidade de cada serviço Firebase

| Serviço | O que guarda / faz |
|---|---|
| **Authentication** | Cria contas e autentica por e-mail e senha, recupera a sessão, identifica pelo `uid`, logout. A API rejeita tokens de outros provedores. |
| **Realtime Database** | `messages/{conversationId}/{messageId}` — todas as mensagens (individuais e de grupo); listeners em tempo real. `conversations/{id}/members/{uid}` — espelho de participantes usado pelas regras para liberar leitura/escrita. |
| **Cloud Firestore** | `users/{uid}` (diretório: nome, foto) · `users/{uid}/private/profile` (e-mail, celular, nascimento) · `users/{uid}/private/preferences` (push ligado/desligado) · `users/{uid}/devices/{deviceId}` (tokens) · `groups/{groupId}` (nome, foto, dono, integrantes, `memberLimit`, `notificationPolicy`) · `directConversations/{id}` · `notificationDispatches/{id}` (idempotência, só a API). |
| **Cloud Messaging (FCM)** | Entrega o push no Android (app em 2º plano ou fechado) com `conversationId`, `conversationType` e `messageId` no payload. |

### Estrutura de dados

```text
Firestore
├── users/{uid}                       uid, name, nameLower, photoUrl, createdAt
│   ├── private/profile               email, phoneNumber, birthDate (AAAA-MM-DD)
│   ├── private/preferences           pushEnabled, updatedAt
│   └── devices/{deviceId}            token, provider (fcm|expo), platform, enabled, updatedAt
├── groups/{groupId}                  name, photoUrl, ownerId, memberIds[], memberLimit,
│                                     notificationPolicy, policyUpdatedBy, createdAt, updatedAt
├── directConversations/dm_<a>_<b>    type, participantIds[a,b], createdAt
└── notificationDispatches/{cid__mid} status, summary (somente API)

Realtime Database
├── conversations/{conversationId}/members/{uid}: true
└── messages/{conversationId}/{messageId}
      conversationId, conversationType, senderId, text,
      target { type: 'conversation' | 'member', memberId? },
      mentionedUserIds[], createdAt (timestamp do servidor)
```

> **Por que um espelho de integrantes no RTDB?** As regras do Realtime Database não conseguem ler
> o Firestore. Para que só participantes leiam/enviem mensagens, a lista de integrantes do grupo
> (fonte da verdade no Firestore) é espelhada em `conversations/{groupId}/members` **somente pela
> API** (endpoint `sync-members`, com Admin SDK). Para conversas individuais, o próprio app grava os
> dois participantes, e a regra só aceita se o id `dm_<uid1>_<uid2>` contiver os dois `uid`.
> Esta é a decisão documentada de "validações que dependem dos dois serviços ficam na API".

---

## 📁 Estrutura do projeto

```text
.
├── App.tsx                      # providers + handler de notificação em 1º plano
├── firebaseConfig.json          # config do SDK cliente (sem segredos) — OBRIGATÓRIO
├── app.json / eas.json          # Expo + EAS Build
├── firestore.rules              # regras do Firestore (versionadas)
├── database.rules.json          # regras do Realtime Database (versionadas)
├── firebase.json / .firebaserc  # deploy das regras pela Firebase CLI
├── src/
│   ├── components/   Avatar, ChatMessage, ChatInput, MentionPicker, ConversationItem,
│   │                 GroupMemberItem, UserListItem, PhotoPicker, PolicySelector,
│   │                 Loading, ErrorMessage, EmptyState, OfflineBanner, ...
│   ├── screens/      Login, Register, Conversations, Users, GroupForm, Chat,
│   │                 GroupMembers, Profile
│   ├── services/     firebase, authService, userService, groupService, chatService,
│   │                 notificationService, storageService, apiClient
│   ├── hooks/        useAuth, useChat, useGroups, useConversations, useNotifications,
│   │                 useUserDirectory, useConnectivity
│   ├── contexts/     AuthContext, NotificationContext
│   ├── navigation/   RootNavigator, navigationRef
│   ├── types/        user, chat, group, notification, navigation
│   └── utils/        conversationId, groupValidation, validation, errors, format
└── server/                      # API online
    └── src/
        ├── index.ts (entrada Vercel) / local.ts / createApp.ts / config.ts / types.ts
        ├── middleware/  authenticate.ts, errorHandler.ts
        ├── routes/      notifications.ts, groups.ts, users.ts, uploads.ts, health.ts
        └── services/    firebaseAdmin.ts, notificationSender.ts, recipientResolver.ts,
                         dispatchGuard.ts, membershipSync.ts, profileAccess.ts, cloudinary.ts
```

---

## ⚙️ Configuração do Firebase (passo a passo)

1. Crie um projeto em <https://console.firebase.google.com>.
2. **Authentication** → *Sign-in method* → ative **somente E-mail/senha**.
3. **Firestore Database** → criar banco (modo produção).
4. **Realtime Database** → criar banco (modo bloqueado).
5. Todo o projeto funciona no plano gratuito **Spark** (não usamos Firebase Storage, que exigiria o plano Blaze).
6. **Configurações do projeto → Seus apps → Web (`</>`)** → copie o objeto `firebaseConfig`
   para o arquivo **`firebaseConfig.json`** na raiz (inclua o `databaseURL`).
7. **Configurações do projeto → Seus apps → Android** com o pacote `br.edu.chatfire` →
   baixe o **`google-services.json`** e coloque na raiz (é configuração de cliente, pode ser versionado).
8. Publique as regras:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add            # escolha o projeto (atualiza .firebaserc)
   firebase deploy --only firestore:rules,database
   ```

### Serviço de imagens — Cloudinary
Escolhemos o **Cloudinary** (plano gratuito, sem cartão) porque o Firebase Storage exige o plano
pago Blaze em projetos novos. As fotos são escolhidas pela galeria ou câmera (`expo-image-picker`,
com pedido e tratamento de permissão). Fluxo do upload:

1. o app chama `POST /uploads/signature` na API (com o ID Token);
2. a API confere o usuário — e, para foto de grupo, se ele é o **proprietário** no Firestore —
   e devolve uma **assinatura** válida só para aquela pasta/arquivo (o segredo do Cloudinary fica na API);
3. o app envia a imagem direto ao Cloudinary e recebe a `secure_url`;
4. **apenas a URL `https://`** é salva no Firestore (as regras recusam qualquer valor que não
   seja `https://`, o que bloqueia Base64).

Configuração: crie conta grátis em <https://cloudinary.com>, abra **Dashboard → API Keys** e copie
*Cloud name*, *API Key* e *API Secret* para as variáveis `CLOUDINARY_*` da API (na Vercel).
Se a foto não existir ou falhar ao carregar, o app mostra uma imagem padrão
(`assets/default-avatar.png` / `assets/default-group.png`).

---

## 📱 Instalação e execução do app

```bash
npm install
cp .env.example .env          # preencha EXPO_PUBLIC_API_URL e EXPO_PUBLIC_EAS_PROJECT_ID
npx eas-cli login
npx eas-cli init              # gera o projectId do EAS (atualize app.json → extra.eas.projectId)
```

Push **não funciona no Expo Go** (SDK 53+). Use um *development build*:

```bash
# Android (gera APK instalável no celular)
npx eas-cli build --profile development --platform android
# iOS (exige conta Apple Developer)
npx eas-cli build --profile development --platform ios

npx expo start --dev-client     # abre o bundle no development build
```

Ou localmente: `npx expo run:android` / `npx expo run:ios`.

Variáveis do app (`.env.example`):

| Variável | Descrição |
|---|---|
| `EXPO_PUBLIC_API_URL` | Opcional. URL da API; se vazio, usa `app.json → expo.extra.apiUrl` (versionado, não é segredo) |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | projectId do EAS (token Expo no iOS) |

---

## 🔔 Configuração das notificações

### Android (FCM direto)
1. `google-services.json` na raiz (passo 7 acima) — o app obtém o **token nativo do FCM**
   (`getDevicePushTokenAsync`) e o salva em `users/{uid}/devices`.
2. A API envia com o **Firebase Admin SDK** (`messaging.sendEachForMulticast`) no canal
   `messages` (alta prioridade), com `notification` + `data` → entregue em 2º plano e com o app fechado.
3. Android 13+: o app pede a permissão `POST_NOTIFICATIONS`.

### iOS (Expo Push Service → APNs)
1. Conta Apple Developer. No `eas build` para iOS, aceite gerar a **Push Key (APNs)**
   (ou `npx eas-cli credentials` → iOS → Push Notifications).
2. O app obtém o **Expo push token** (`getExpoPushTokenAsync` com o projectId) e a API envia
   pelo Expo Push Service (`expo-server-sdk`), que entrega via APNs.
3. Teste em **iPhone físico** (simulador não recebe push remoto).

> Motivo da divisão: no iOS, o FCM exige o SDK nativo do Firebase e o upload da chave APNs no
> **Testes realizados:** o app foi testado em **Android** (development build via EAS).
> O iOS não foi testado por exigir conta Apple Developer paga; o código e a configuração
> do Expo Push Service para iOS estão implementados.
> Firebase; o enunciado permite FCM **ou** Expo Push Service, então no iOS usamos o Expo e no
> Android usamos o FCM diretamente, ambos disparados **somente pela API**.

### Toque na notificação
O payload contém `conversationId`, `conversationType` e `messageId`. O hook `useNotifications`
usa `useLastNotificationResponse` (cobre app aberto, em 2º plano e iniciado pela notificação)
e navega para `Chat` da conversa correspondente. Com a conversa aberta na tela, o banner não é exibido.

### Estados tratados
Permissão negada (banner com atalho para Configurações), dispositivo sem token, emulador/simulador,
falha no registro (com "tentar novamente"), falha no envio do push (aviso no chat sem perder a mensagem).

---

## 📨 Política de notificações (calculada no servidor)

Configurada pelo **proprietário** do grupo na tela de edição; salva em `groups/{id}.notificationPolicy`
(com `policyUpdatedBy` e `updatedAt`).

| Política | Quem recebe push |
|---|---|
| `all_group_messages` | Todos os integrantes, exceto o remetente (inclusive em mensagens direcionadas, que continuam visíveis a todos). |
| `mentioned_members` | Somente integrantes **mencionados** (botão `@`) ou **selecionados como destinatário**. |
| `direct_messages_only` | Mensagens do grupo **não** geram push; só conversas individuais geram. |
| `disabled` | Nenhuma mensagem do grupo gera push. |
| *Conversa individual* | Sempre o outro participante. |

Regras gerais aplicadas pela API: o remetente nunca recebe; só participantes **atuais** recebem
(lidos do Firestore no momento do envio); usuários com `pushEnabled = false` não recebem;
tokens inválidos (`registration-token-not-registered`, `DeviceNotRegistered` etc.) são
**desativados** (`enabled: false`). O texto do push **não inclui o conteúdo da mensagem**
(ex.: "Ana enviou uma mensagem no grupo" / "Ana mencionou você").

No chat do grupo, o botão **`@`** abre a seleção de integrantes: escolhendo **1** integrante a
mensagem fica com `target = { type: 'member', memberId }`; escolhendo vários, todos entram em
`mentionedUserIds`. Em ambos os casos a mensagem continua no histórico do grupo.

---

## 👥 Limite de integrantes e proteção contra concorrência

- `memberLimit` é definido na criação, deve ser **inteiro entre 2 e 100**, inclui o proprietário,
  e pode ser alterado pelo proprietário — nunca abaixo da quantidade atual.
- A interface mostra `atual/limite` e **vagas disponíveis**, e bloqueia seleção quando não há vagas.
- **Servidor (Security Rules do Firestore):** toda escrita em `groups/{id}` é validada sobre o
  **documento resultante**: `memberIds.size() <= memberLimit`, sem duplicados, dono incluído,
  limite inteiro. Como a regra é avaliada em cada commit, **nenhum estado gravado pode estourar o
  limite**, mesmo com requisições simultâneas — a escrita que ultrapassaria é rejeitada.
- **Transações:** `groupService.updateGroup/removeMember/leaveGroup` usam `runTransaction`. Se dois
  clientes alteram o grupo ao mesmo tempo, o Firestore detecta o conflito e repete a transação com
  o estado mais novo; a checagem de vagas é refeita com a contagem real. O segundo a chegar recebe
  "Grupo sem vagas".
- Só o proprietário altera integrantes/limite/política; um integrante comum só pode **remover a si
  mesmo** (sair) — garantido nas regras.

---

## 🔒 Regras de segurança (resumo)

Arquivos versionados: [`firestore.rules`](firestore.rules) e [`database.rules.json`](database.rules.json).

- Tudo exige usuário autenticado; caminhos não previstos são negados.
- **Mensagens (RTDB):** leitura e escrita só para quem está em `conversations/{id}/members`;
  `senderId == auth.uid`; `createdAt == now`; texto 1–2000; `conversationType` coerente com o id;
  destinatário/mencionados precisam ser integrantes; mensagens são imutáveis (sem edição/exclusão).
- **Removido do grupo:** a API atualiza o espelho → o Firebase cancela o listener dele
  (`permission_denied`) e ele não lê nem envia novas mensagens; o app mostra "Você não participa mais".
- **Grupos:** leitura só para integrantes; gerência só pelo proprietário; limite validado.
- **Conversas individuais:** id `dm_<menor>_<maior>`, dois participantes distintos e existentes,
  o criador é um deles; imutáveis.
- **Perfis:** diretório público (nome/foto) para busca; **dados cadastrais** e **tokens**
  só para o próprio usuário. Terceiros só veem e-mail/celular/nascimento pela API
  (`GET /users/:uid/profile`), que confere se há conversa individual ou grupo em comum.
- `notificationDispatches` é inacessível ao app.

---

## 🖥️ API — configuração, execução e publicação

### Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | Disponibilidade da API e conexão com o Firebase |
| GET | `/` | — | Lista de endpoints |
| POST | `/notifications/messages` | Bearer ID Token | Body `{ conversationId, messageId }` — envia o push da mensagem |
| POST | `/groups/:groupId/sync-members` | Bearer ID Token | Espelha integrantes do Firestore no RTDB |
| GET | `/users/:uid/profile` | Bearer ID Token | Perfil cadastral, se houver conversa/grupo em comum |
| POST | `/uploads/signature` | Bearer ID Token | Body `{ kind: 'user' }` ou `{ kind: 'group', groupId }` — assinatura de upload no Cloudinary |

Fluxo do `POST /notifications/messages`:
1. valida o ID Token com o Admin SDK (`verifyIdToken`, checando revogação e provedor `password`);
2. lê a mensagem no **RTDB** e confere que existe e que `senderId` é o usuário autenticado;
3. lê participantes e política no **Firestore**;
4. calcula os destinatários **no servidor** (`recipientResolver.ts`, com testes);
5. **idempotência:** reivindica `notificationDispatches/{cid__mid}` em transação — reenvios
   respondem `{ duplicate: true }` sem notificar de novo;
6. busca tokens, envia por FCM/Expo, desativa tokens inválidos e grava o resumo.

Exemplo de resposta:
```json
{ "duplicate": false, "policy": "mentioned_members", "recipients": 1, "devices": 1, "delivered": 1, "failed": 0, "invalidTokensDisabled": 0 }
```

### Variáveis de ambiente (somente os nomes — valores ficam no painel da hospedagem)

| Variável | Descrição |
|---|---|
| `FIREBASE_PROJECT_ID` | id do projeto |
| `FIREBASE_CLIENT_EMAIL` | e-mail da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | chave privada da conta de serviço (pode colar com `\n`) |
| `FIREBASE_DATABASE_URL` | URL do Realtime Database |
| `CLOUDINARY_CLOUD_NAME` | Cloud name do Cloudinary |
| `CLOUDINARY_API_KEY` | API Key do Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret do Cloudinary |
| `EXPO_ACCESS_TOKEN` | opcional (Expo "enhanced push security") |
| `PORT` | só para rodar localmente |

### Conta de serviço com permissões mínimas
Em vez da conta padrão `firebase-adminsdk` (que é muito ampla), crie no Google Cloud Console
(**IAM → Contas de serviço**) uma conta só para a API com os papéis:
`Firebase Authentication Viewer`, `Cloud Datastore User`, `Firebase Realtime Database Admin`
e `Firebase Cloud Messaging API Admin`. Gere uma chave JSON, copie `client_email` e `private_key`
para as variáveis da Vercel e **apague o arquivo JSON** do computador. Nunca coloque no GitHub.

### Rodar localmente (desenvolvimento)
```bash
cd server
npm install
cp .env.example .env   # preencha com os valores reais (o .env está no .gitignore)
npm run dev            # http://localhost:3000
npm test               # testes das políticas de destinatários e da assinatura de upload
```

### Publicar na Vercel (gratuito, sem cartão)
A API usa o suporte **zero-config a Express** da Vercel: `server/src/index.ts` importa o Express e
exporta o app por padrão, e a Vercel o transforma numa Vercel Function com HTTPS. Não há servidor
para "acordar", então a API fica disponível durante toda a correção.

1. Suba o repositório no GitHub.
2. Em <https://vercel.com>, entre com o GitHub → **Add New → Project** → importe o repositório.
3. Em **Root Directory**, escolha **`server`**. O preset detectado deve ser **Express**.
4. Em **Environment Variables**, cadastre as variáveis da tabela acima (valores reais só aqui).
> **Observação:** foi necessário fixar `jose@^5` em `overrides` no `server/package.json`,
> pois a versão 6 (ESM-only), trazida como dependência do Firebase Admin, causava
> `ERR_REQUIRE_ESM` na Vercel.
5. **Deploy**. Teste: `https://SUA-API.vercel.app/health` → `{"status":"ok","firebase":"ok",...}`.
6. Coloque a URL em `app.json → expo.extra.apiUrl`, gere o build do app e atualize a tabela no topo.

> Depois de alterar variáveis na Vercel, faça **Redeploy** para elas valerem.

---

## 🧪 Como testar as políticas

1. Crie 3 contas (A, B, C) em aparelhos diferentes (ou A em um aparelho e B/C em outro, trocando de login).
2. A cria um grupo com B e C, limite 3 → "Grupo sem vagas".
3. Política `all_group_messages`: A envia → B e C recebem push; A não.
4. `mentioned_members`: A envia com `@B` → só B recebe.
5. `direct_messages_only` / `disabled`: mensagens do grupo não geram push; conversa individual A↔B gera.
6. A remove C → C perde acesso às novas mensagens imediatamente.
7. Reenviar o mesmo `messageId` para a API → `{ "duplicate": true }`.

---

## 🖼️ Prints

| Login | Cadastro | Conversas |
|---|---|---|
| ![](docs/prints/login.png) | ![](docs/prints/cadastro.png) | ![](docs/prints/conversas.png) |

| Usuários | Criar/editar grupo | Chat individual |
|---|---|---|
| ![](docs/prints/usuarios.png) | ![](docs/prints/grupo-form.png) | ![](docs/prints/chat-individual.png) |

| Chat em grupo | Integrantes | Perfil |
|---|---|---|
| ![](docs/prints/chat-grupo.png) | ![](docs/prints/integrantes.png) | ![](docs/prints/perfil.png) |

### Evidência de notificação recebida

| Push recebido | Toque abriu a conversa |
|---|---|
| ![](docs/prints/push-recebido.png) | ![](docs/prints/push-abriu-conversa.png) |

---

## ✅ Checklist

- [x] React Native, Expo SDK 57 e TypeScript (strict, sem `any`)
- [x] Cadastro/login apenas e-mail e senha; nome, celular, nascimento e foto no cadastro
- [x] Logout (desativa o token do aparelho, remove listeners) e recuperação de sessão
- [x] Conversas individuais com exatamente 2 participantes, sem duplicidade nem consigo mesmo
- [x] Perfil pela foto do participante / pela lista de integrantes do grupo
- [x] Criação/edição de grupos, foto, limite configurável e vagas disponíveis
- [x] Limite protegido por transação + Security Rules (concorrência)
- [x] Mensagens no Realtime Database com atualização em tempo real
- [x] Perfis, grupos, políticas, tokens e preferências no Firestore
- [x] Fotos no Cloudinary (upload assinado pela API), apenas URL no Firestore
- [x] FCM (Android) e Expo Push (iOS) enviados apenas pela API online autenticada
- [x] Políticas `all_group_messages`, `mentioned_members`, `direct_messages_only`, `disabled`
- [x] Remetente excluído; toque na notificação abre a conversa; idempotência
- [x] Regras do Firestore e do Realtime Database versionadas
- [x] `firebaseConfig.json` e `.env.example` (app e API) sem segredos
- [ ] Preencher integrantes, URL da API e prints antes da entrega
