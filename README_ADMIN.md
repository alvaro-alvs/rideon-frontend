# 🛡️ RideOn API — Guia do Administrador (Admin Guide)

Este documento descreve o funcionamento do módulo administrativo da **RideOn API**, detalhando o modelo de permissões (**RBAC**), o processo de provisionamento de usuários com privilégios de **Admin**, e o ciclo de vida completo de **cadastro, listagem e consulta de dispositivos rastreadores (Hardware/IoT Devices)**.

---

## 📋 Sumário

- [1. Visão Geral e Modelo de Segurança (RBAC)](#1-visão-geral-e-modelo-de-segurança-rbac)
- [2. Provisionamento do Usuário Admin](#2-provisionamento-do-usuário-admin)
  - [2.1. Via Makefile (Recomendado)](#21-via-makefile-recomendado)
  - [2.2. Via CLI Go Direto](#22-via-cli-go-direto)
  - [2.3. Idempotência e Promoção de Usuários Existentes](#23-idempotência-e-promoção-de-usuários-existentes)
- [3. Autenticação Administrativa](#3-autenticação-administrativa)
  - [3.1. Login e Obtenção do Token JWT](#31-login-e-obtenção-do-token-jwt)
  - [3.2. Validar Papel do Usuário (`GET /api/v1/auth/me`)](#32-validar-papel-do-usuário-get-apiv1authme)
- [4. Gerenciamento de Dispositivos (Endpoints Administrativos)](#4-gerenciamento-de-dispositivos-endpoints-administrativos)
  - [4.1. Cadastrar Dispositivo (`POST /api/v1/devices`)](#41-cadastrar-dispositivo-post-apiv1devices)
  - [4.2. Listar Dispositivos (`GET /api/v1/devices`)](#42-listar-dispositivos-get-apiv1devices)
  - [4.3. Consultar Dispositivo por ID (`GET /api/v1/devices/:id`)](#43-consultar-dispositivo-por-id-get-apiv1devicesid)
  - [4.4. Atualizar / Vincular / Desvincular Dispositivo (`PATCH /api/v1/devices/:id`)](#44-atualizar--vincular--desvincular-dispositivo-patch-apiv1devicesid)
- [5. Tabela de Protocolos e Atributos Suportados](#5-tabela-de-protocolos-e-atributos-suportados)
- [6. Integração com o Broker IoT (`rideon-broker`)](#6-integração-com-o-broker-iot-rideon-broker)
- [7. Script Completo de Demonstração (Bash / cURL)](#7-script-completo-de-demonstração-bash--curl)
- [8. Códigos de Erro e Tratamento de Exceções](#8-códigos-de-erro-e-tratamento-de-exceções)

---

## 1. Visão Geral e Modelo de Segurança (RBAC)

A plataforma RideOn possui controle de acesso granular baseado em papéis (**Role-Based Access Control**):

- **`rider` (Piloto / Usuário Comum)**: Gerencia seu perfil pessoal, suas motocicletas e visualiza a telemetria associada às suas motos.
- **`admin` (Administrador da Plataforma)**: Possui permissões para gerenciar hardware físico (dispositivos rastreadores), realizar provisionamento de equipamentos e vincular unidades rastreadoras às motocicletas.

### Como a Segurança é Aplicada:
1. **Verificação em Tempo Real no Banco de Dados**: O middleware de autorização (`middleware.RequireRole`) extrai o `user_id` do token JWT e **sempre busca o perfil atualizado diretamente no MongoDB**.
2. **Revogação Instantânea**: Se o papel de um usuário for alterado de `admin` para `rider` no banco, o acesso aos endpoints administrativos é bloqueado imediatamente (retornando `403 Forbidden`), sem necessidade de esperar o token JWT expirar.

---

## 2. Provisionamento do Usuário Admin

Usuários registrados via endpoint público `POST /api/v1/auth/register` recebem por padrão o papel de `rider`. Para criar ou promover uma conta para `admin`, utiliza-se a ferramenta de **Seed Administrativo**.

### 2.1. Via Makefile (Recomendado)

Certifique-se de que a infraestrutura (MongoDB) esteja em execução e execute:

```bash
make seed-admin EMAIL=admin@rideon.com PASSWORD=SenhaSegura123
```

### 2.2. Via CLI Go Direto

```bash
# Execução direta informando flags
go run ./cmd/seed --email admin@rideon.com --password SenhaSegura123

# Ou utilizando variáveis de ambiente
RIDEON_ADMIN_EMAIL=admin@rideon.com RIDEON_ADMIN_PASSWORD=SenhaSegura123 go run ./cmd/seed
```

> **Dica**: O comando de seed garante automaticamente a criação dos índices no MongoDB e imprime na saída um token JWT de teste com validade de 15 minutos.

### 2.3. Idempotência e Promoção de Usuários Existentes

Caso o e-mail informado já esteja cadastrado no sistema como `rider`, o script **não duplica** o usuário nem sobrescreve dados de perfil; ele atualiza atomicamente o campo `role` para `"admin"`.

---

## 3. Autenticação Administrativa

### 3.1. Login e Obtenção do Token JWT

O administrador realiza a autenticação enviando suas credenciais:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@rideon.com",
    "password": "SenhaSegura123"
  }'
```

**Resposta esperada (`200 OK`):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "a1b2c3d4e5f6...",
  "token_type": "Bearer"
}
```

Armazene o token em uma variável de ambiente para as próximas requisições:

```bash
export ADMIN_TOKEN="<seu_access_token_aqui>"
```

### 3.2. Validar Papel do Usuário (`GET /api/v1/auth/me`)

Para conferir se o token possui papel de administrador:

```bash
curl -s -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Resposta esperada (`200 OK`):**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "email": "admin@rideon.com",
  "role": "admin",
  "status": "active",
  "created_at": "2026-09-03T20:00:00Z"
}
```

---

## 4. Gerenciamento de Dispositivos (Endpoints Administrativos)

Todos os endpoints abaixo exigem autenticação Bearer com papel `admin`.

### 4.1. Cadastrar Dispositivo (`POST /api/v1/devices`)

Registra uma nova unidade de hardware. A associação com uma motocicleta é **opcional**:
- Se `motorcycle_id` for informado, o dispositivo é cadastrado com status inicial `active` e vinculado ao veículo.
- Se `motorcycle_id` for omitido/nulo, o dispositivo é cadastrado com status inicial `standby` (em estoque/aguardando instalação).

- **Método**: `POST`
- **Rota**: `/api/v1/devices`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer $ADMIN_TOKEN`

#### Payload de Requisição (Exemplo Standby / Sem Veículo):

```json
{
  "serial_number": "8765432100000009",
  "protocol": "gt06",
  "firmware_version": "v1.2.0"
}
```

#### Payload de Requisição (Exemplo Vinculado Diretamente):

```json
{
  "motorcycle_id": "26b7f0bd-4d22-4d96-b83c-cd71d7ea1b90",
  "serial_number": "8765432100000009",
  "protocol": "gt06",
  "firmware_version": "v1.2.0"
}
```

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `motorcycle_id` | `string (UUID)` | Não | Identificador único da motocicleta (opcional). Se omitido, o dispositivo fica em `standby`. |
| `serial_number` | `string` | **Sim** | Número de série físico ou IMEI do rastreador. Deve ser único em todo o sistema. |
| `protocol` | `string` | **Sim** | Protocolo de comunicação utilizado pelo hardware (ex: `gt06`, `mqtt`, `teltonika`). |
| `firmware_version` | `string` | Não | Versão instalada do firmware (opcional). |
| `status` | `string` | Não | Status explícito (`active`, `standby`, `inactive`, `provisioned`). Se omitido, padrão é `standby` (sem moto) ou `active` (com moto). |

#### Exemplo cURL (Cadastro em Standby):

```bash
curl -s -X POST http://localhost:8080/api/v1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "serial_number": "8765432100000009",
    "protocol": "gt06",
    "firmware_version": "v1.2.0"
  }'
```

#### Resposta de Sucesso (`201 Created`):

```json
{
  "id": "c6a2b8e3-0c45-4299-923f-e737c355a4fb",
  "serial_number": "8765432100000009",
  "protocol": "gt06",
  "firmware_version": "v1.2.0",
  "status": "standby",
  "last_seen_at": null,
  "created_at": "2026-09-30T00:00:00Z"
}
```

---

### 4.2. Listar Dispositivos (`GET /api/v1/devices`)

Recupera a lista de todos os dispositivos rastreadores ou filtra por uma motocicleta específica.

- **Método**: `GET`
- **Rota**: `/api/v1/devices` ou `/api/v1/devices?motorcycle_id={UUID}`
- **Headers**:
  - `Authorization: Bearer $ADMIN_TOKEN`
- **Query Parameters**:
  - `motorcycle_id` (*Opcional*, UUID): Filtra pelos dispositivos vinculados a essa motocicleta. Se omitido, retorna todos os dispositivos do sistema (incluindo os em `standby`).

#### Exemplo cURL:

```bash
# Listar todos os dispositivos
curl -s -X GET "http://localhost:8080/api/v1/devices" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Listar dispositivos de uma motocicleta específica
curl -s -X GET "http://localhost:8080/api/v1/devices?motorcycle_id=26b7f0bd-4d22-4d96-b83c-cd71d7ea1b90" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 4.3. Consultar Dispositivo por ID (`GET /api/v1/devices/:id`)

Retorna as informações completas de um dispositivo individual pelo seu identificador único (`device_id`).

- **Método**: `GET`
- **Rota**: `/api/v1/devices/:id`
- **Headers**:
  - `Authorization: Bearer $ADMIN_TOKEN`
- **Path Parameters**:
  - `id` (UUID): Identificador do dispositivo.

#### Exemplo cURL:

```bash
curl -s -X GET http://localhost:8080/api/v1/devices/c6a2b8e3-0c45-4299-923f-e737c355a4fb \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 4.4. Atualizar / Vincular / Desvincular Dispositivo (`PATCH /api/v1/devices/:id`)

Permite vincular um rastreador em standby a uma motocicleta, desvincular um equipamento em uso (retornando a standby) ou atualizar firmware/protocolo/status.

- **Método**: `PATCH` (ou `PUT`)
- **Rota**: `/api/v1/devices/:id`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer $ADMIN_TOKEN`

#### Exemplo 1: Vincular a uma motocicleta (Ativação):

```bash
curl -s -X PATCH http://localhost:8080/api/v1/devices/c6a2b8e3-0c45-4299-923f-e737c355a4fb \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "motorcycle_id": "26b7f0bd-4d22-4d96-b83c-cd71d7ea1b90"
  }'
```

#### Exemplo 2: Desvincular de motocicleta (Retornar para Standby):

```bash
curl -s -X PATCH http://localhost:8080/api/v1/devices/c6a2b8e3-0c45-4299-923f-e737c355a4fb \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "unlink": true
  }'
```

---

## 5. Tabela de Protocolos e Atributos Suportados

O domínio de dispositivos é agnóstico ao protocolo de transmissão. Os valores aceitos no campo `protocol` são:

| Protocolo | Identificador no Sistema | Cenário de Uso |
| :--- | :--- | :--- |
| **GT06** | `gt06` | Rastreadores veiculares comerciais populares (ex: Concox, Coban, Accurate) via TCP. |
| **Teltonika** | `teltonika` | Rastreadores industriais e frotistas via protocolo codec 8/8E. |
| **Queclink** | `queclink` | Módulos rastreadores @Track (ex: GV55, GL300). |
| **MQTT** | `mqtt` | Dispositivos IoT customizados baseados em ESP32 ou Raspberry Pi. |
| **HTTP** | `http` | Gateways REST diretos ou simuladores de bancada. |
| **Smartphone** | `smartphone` | App móvel RideOn funcionando como rastreador por software (GPS nativo). |
| **Custom** | `custom` | Protocolos proprietários sob demanda. |

---

## 6. Integração com o Broker IoT (`rideon-broker`)

Existe um acoplamento lógico chave entre o `rideon-api` e o serviço de recepção de pacotes `rideon-broker`:

1. Ao cadastrar o dispositivo na API, o campo **`serial_number`** deve conter exatamente o **IMEI** transmitido pelo hardware GPS.
2. Quando o rastreador conecta via TCP na porta `5023` do `rideon-broker`, o broker grava o pacote bruto na coleção `telemetry` indexado por esse `imei`.
3. A rota `/api/v1/motorcycles/:id/location` da `rideon-api` resolve o dispositivo ativo da motocicleta e busca a última coordenada gravada no banco pelo broker usando esse mesmo identificador.

---

## 7. Script Completo de Demonstração (Bash / cURL)

Copie e execute o script abaixo para validar o fluxo completo no seu ambiente:

```bash
#!/usr/bin/env bash
set -e

API_URL="http://localhost:8080"
ADMIN_EMAIL="admin@rideon.com"
ADMIN_PASS="SenhaSegura123"

echo "=== 1. Criando/Garantindo Admin no Banco ==="
go run ./cmd/seed --email "$ADMIN_EMAIL" --password "$ADMIN_PASS"

echo -e "\n=== 2. Realizando Login como Admin ==="
LOGIN_RES=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RES" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "Token Admin obtido: ${ADMIN_TOKEN:0:20}..."

echo -e "\n=== 3. Validando Papel (/auth/me) ==="
curl -s -X GET "$API_URL/api/v1/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo -e "\n=== 4. Criando Perfil de Piloto e Moto de Teste ==="
RIDER_RES=$(curl -s -X POST "$API_URL/api/v1/riders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Admin Rider","date_of_birth":"1990-01-01T00:00:00Z","phone":"+5511999990000"}')
RIDER_ID=$(echo "$RIDER_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

MOTO_RES=$(curl -s -X POST "$API_URL/api/v1/motorcycles?rider_id=$RIDER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"brand":"BMW","model":"R 1250 GS","year":2024,"color":"Azul","license_plate":"ADM2026"}')
MOTO_ID=$(echo "$MOTO_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Motocicleta criada com ID: $MOTO_ID"

SERIAL_TEST="IMEI-$(date +%s)"
echo -e "\n=== 5. Cadastrando Dispositivo (POST /api/v1/devices) ==="
DEV_RES=$(curl -s -X POST "$API_URL/api/v1/devices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"motorcycle_id\": \"$MOTO_ID\",
    \"serial_number\": \"$SERIAL_TEST\",
    \"protocol\": \"gt06\",
    \"firmware_version\": \"v2.1.0\"
  }")
echo "$DEV_RES" | jq .
DEV_ID=$(echo "$DEV_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo -e "\n=== 6. Consultando Dispositivo por ID (GET /api/v1/devices/:id) ==="
curl -s -X GET "$API_URL/api/v1/devices/$DEV_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo -e "\n=== 7. Listando Dispositivos da Motocicleta (GET /api/v1/devices?motorcycle_id=...) ==="
curl -s -X GET "$API_URL/api/v1/devices?motorcycle_id=$MOTO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo -e "\n✅ Fluxo Administrativo validado com sucesso!"
```

---

## 8. Códigos de Erro e Tratamento de Exceções

| Código HTTP | Código Interno | Motivo / Solução |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_BODY` | O JSON enviado no corpo da requisição está malformado. |
| `400 Bad Request` | `INVALID_ID` | O `:id` informado na rota não é um UUID válido. |
| `400 Bad Request` | `MISSING_MOTORCYCLE_ID` | O parâmetro `?motorcycle_id=` não foi enviado ou está vazio na rota de listagem. |
| `401 Unauthorized` | `UNAUTHORIZED` | Token JWT ausente, expirado ou inválido. |
| `403 Forbidden` | `FORBIDDEN` | Usuário autenticado não possui papel de `admin` (ex: usuário `rider`). |
| `404 Not Found` | `DEVICE_NOT_FOUND` | Dispositivo com o ID especificado não existe no banco de dados. |
| `409 Conflict` | `DEVICE_SERIAL_CONFLICT` | Já existe outro dispositivo cadastrado com este mesmo `serial_number`. |
| `422 Unprocessable` | `VALIDATION_ERROR` | Campos obrigatórios ausentes ou com formato inválido. |
