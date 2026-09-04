# 🖥️ RideOn API — Guia de Integração Frontend

Guia direto ao ponto para o frontend consumir a RideOn API. Cobre autenticação, gerenciamento de sessão, acesso por papel (RBAC) e os principais fluxos de dados.

---

## Sumário

- [1. Base URL e Headers](#1-base-url-e-headers)
- [2. Autenticação e Gerenciamento de Tokens](#2-autenticação-e-gerenciamento-de-tokens)
  - [2.1. Registro](#21-registro)
  - [2.2. Login](#22-login)
  - [2.3. Refresh de Token](#23-refresh-de-token)
  - [2.4. Identificar o Usuário Logado](#24-identificar-o-usuário-logado)
- [3. Entendendo o Campo `role` e Payloads por Perfil](#3-entendendo-o-campo-role-e-payloads-por-perfil)
- [4. Fluxo Recomendado Pós-Login](#4-fluxo-recomendado-pós-login)
- [5. Perfil do Piloto (Rider)](#5-perfil-do-piloto-rider)
- [6. Motocicletas](#6-motocicletas)
- [7. Localização em Tempo Real (WebSocket)](#7-localização-em-tempo-real-websocket)
- [8. Tratamento de Erros](#8-tratamento-de-erros)

---

## 1. Base URL e Headers

```
Base URL: http://<host>:8080
```

Todo endpoint autenticado exige o header:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## 2. Autenticação e Gerenciamento de Tokens

### 2.1. Registro

```http
POST /api/v1/auth/register
```

**Payload:**
```json
{
  "email": "piloto@rideon.com",
  "password": "minimo8chars"
}
```

**Resposta `201 Created`:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "piloto@rideon.com",
  "role": "rider",
  "status": "active",
  "created_at": "2026-09-03T20:00:00Z"
}
```

> O registro público sempre cria usuários com `role: "rider"`. A criação de admins é feita via ferramenta de seed administrativo — nunca por este endpoint.

---

### 2.2. Login

```http
POST /api/v1/auth/login
```

**Payload (igual para todos os perfis):**
```json
{
  "email": "usuario@rideon.com",
  "password": "senha"
}
```

**Resposta `200 OK` — mesma estrutura independente do perfil:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer"
}
```

> ⚠️ **O token JWT não contém o `role` do usuário.** O papel é sempre resolvido no banco em tempo real. Para saber o perfil do usuário logado, use `GET /api/v1/auth/me` logo após o login (ver seção 2.4).

**Recomendação de armazenamento:**

| Token | Onde guardar | Por quê |
|---|---|---|
| `access_token` | Memória (variável JS) ou `sessionStorage` | Curta duração (15 min). Evitar `localStorage` por segurança. |
| `refresh_token` | `localStorage` (ou cookie HttpOnly se disponível) | Longa duração (7 dias). Usar para renovar o `access_token`. |

---

### 2.3. Refresh de Token

Quando o `access_token` expirar (`401 Unauthorized`), renove sem forçar novo login:

```http
POST /api/v1/auth/refresh
```

**Payload:**
```json
{
  "refresh_token": "<refresh_token_armazenado>"
}
```

**Resposta `200 OK`:** mesma estrutura de `TokenResponse` com novos tokens.

---

### 2.4. Identificar o Usuário Logado

Chame este endpoint logo após o login para obter o papel (`role`) e determinar o fluxo de navegação:

```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

---

## 3. Entendendo o Campo `role` e Payloads por Perfil

A resposta de `GET /api/v1/auth/me` é a fonte de verdade para o papel do usuário:

### Usuário Comum (`rider`)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "piloto@rideon.com",
  "role": "rider",
  "status": "active",
  "created_at": "2026-09-03T20:00:00Z"
}
```

### Administrador (`admin`)

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "admin@rideon.com",
  "role": "admin",
  "status": "active",
  "created_at": "2026-09-03T20:00:00Z"
}
```

### ⚠️ Cadastros Legados — `role` ausente ou vazio

Contas criadas antes da implementação do RBAC podem não ter o campo `role` preenchido. O sistema trata esses usuários como **`rider` (usuário comum)** por padrão. No frontend, trate a ausência do campo da mesma forma:

```javascript
// Lógica defensiva para lidar com cadastros legados
function getUserRole(meResponse) {
  const role = meResponse?.role;
  if (!role || role === '') {
    return 'rider'; // fallback seguro — legado = usuário comum
  }
  return role;
}

// Exemplo de uso pós-login
const me = await fetch('/api/v1/auth/me', { headers: authHeaders }).then(r => r.json());
const role = getUserRole(me);

if (role === 'admin') {
  // redirecionar para painel administrativo
} else {
  // redirecionar para área do piloto
}
```

---

## 4. Fluxo Recomendado Pós-Login

```
POST /api/v1/auth/login
        │
        ▼ { access_token, refresh_token }
        │
GET /api/v1/auth/me
        │
        ├── role === 'admin'  →  Painel Admin (acesso a /devices, gestão de hardware)
        │
        └── role === 'rider'  →  App do Piloto
            (ou role ausente)
                │
                ▼
        GET /api/v1/riders/me   ← verificar se perfil existe
                │
                ├── 200 OK  →  Carregar dados do piloto e motocicletas
                │
                └── 404     →  Redirecionar para tela de criação de perfil
```

---

## 5. Perfil do Piloto (Rider)

### Criar Perfil

```http
POST /api/v1/riders
Authorization: Bearer <access_token>
```

```json
{
  "name": "Carlos Silva",
  "date_of_birth": "1992-05-15T00:00:00Z",
  "phone": "+5511999998888"
}
```

**Resposta `201 Created`:**
```json
{
  "id": "d1e2f3a4-b5c6-7890-abcd-ef0123456789",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Carlos Silva",
  "phone": "+5511999998888",
  "date_of_birth": "1992-05-15T00:00:00Z",
  "status": "active",
  "created_at": "2026-09-03T21:00:00Z"
}
```

### Obter Perfil do Usuário Logado

```http
GET /api/v1/riders/me
Authorization: Bearer <access_token>
```

> Preferir este endpoint ao invés de `GET /api/v1/riders/:id` — não precisa de UUIDs na URL e retorna o perfil vinculado ao token automaticamente.

### Atualizar Perfil

```http
PATCH /api/v1/riders/:id
Authorization: Bearer <access_token>
```

```json
{
  "name": "Carlos A. Silva",
  "phone": "+5511999997777"
}
```

> Apenas campos presentes no body serão atualizados (PATCH parcial). A API valida que o `rider_id` pertence ao usuário do token — tentar editar o perfil de outro usuário retorna `403 Forbidden`.

---

## 6. Motocicletas

### Cadastrar

```http
POST /api/v1/motorcycles?rider_id=<rider_id>
Authorization: Bearer <access_token>
```

```json
{
  "brand": "Yamaha",
  "model": "MT-07",
  "year": 2024,
  "color": "Preta",
  "license_plate": "BRA2E19"
}
```

**Resposta `201 Created`:**
```json
{
  "id": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
  "rider_id": "d1e2f3a4-b5c6-7890-abcd-ef0123456789",
  "brand": "Yamaha",
  "model": "MT-07",
  "year": 2024,
  "color": "Preta",
  "license_plate": "BRA2E19",
  "status": "active",
  "created_at": "2026-09-03T21:30:00Z"
}
```

### Listar Motocicletas do Piloto

```http
GET /api/v1/motorcycles?rider_id=<rider_id>
Authorization: Bearer <access_token>
```

### Última Localização da Motocicleta

```http
GET /api/v1/motorcycles/<motorcycle_id>/location
Authorization: Bearer <access_token>
```

**Resposta `200 OK`:**
```json
{
  "motorcycle_id": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
  "timestamp": "2026-09-03T22:30:00Z",
  "position": {
    "latitude": -23.55052,
    "longitude": -46.633308,
    "altitude": 760.5,
    "accuracy": 3.5
  },
  "motion": {
    "speed": 65.4,
    "heading": 180.0,
    "acceleration": 1.2
  },
  "device": {
    "battery": 94,
    "signal": 5
  }
}
```

**`404 Not Found`** caso não haja telemetria ainda:
```json
{
  "error": {
    "code": "TELEMETRY_NOT_FOUND",
    "message": "no telemetry found for motorcycle"
  }
}
```

---

## 7. Localização em Tempo Real (WebSocket)

Conecte-se via WebSocket para receber atualizações de posição em tempo real:

```
ws://<host>:8080/ws?token=<access_token>
```

**Exemplo em JavaScript:**

```javascript
const ws = new WebSocket(`ws://localhost:8080/ws?token=${accessToken}`);

ws.onmessage = (event) => {
  const telemetry = JSON.parse(event.data);
  // { motorcycle_id, timestamp, position: { lat, lng }, motion, device }
  updateMapMarker(telemetry);
};

ws.onclose = () => {
  // Reconectar com back-off exponencial
};
```

---

## 8. Tratamento de Erros

Todos os erros seguem o formato:

```json
{
  "error": {
    "code": "CODIGO_INTERNO",
    "message": "descrição legível"
  }
}
```

### Tabela de Erros Relevantes para o Frontend

| HTTP | `code` | Ação recomendada |
|---|---|---|
| `400` | `INVALID_BODY` | Validar o JSON antes de enviar |
| `400` | `VALIDATION_ERROR` | Exibir mensagem de campo inválido ao usuário |
| `401` | `UNAUTHORIZED` | Token expirado ou ausente → tentar refresh → se falhar, redirecionar para login |
| `403` | `FORBIDDEN` | Usuário sem permissão → exibir mensagem, não redirecionar para login |
| `404` | `*_NOT_FOUND` | Recurso não existe → tratar na UI (ex: "perfil não criado ainda") |
| `409` | `USER_ALREADY_EXISTS` | E-mail já cadastrado no registro |
| `422` | `VALIDATION_ERROR` | Campos obrigatórios faltando ou formato inválido |

### Interceptador de Token Expirado (exemplo Axios)

```javascript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {
          refresh_token: localStorage.getItem('refresh_token'),
        });
        // Atualizar tokens em memória/storage
        setAccessToken(data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        // Reenviar requisição original com novo token
        original.headers['Authorization'] = `Bearer ${data.access_token}`;
        return axios(original);
      } catch {
        // Refresh também falhou — forçar logout
        clearSession();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Referências

- [README.md — Guia Geral da API](README.md)
- [README_ADMIN.md — Guia do Administrador (Dispositivos e RBAC)](README_ADMIN.md)
