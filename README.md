# Passkey demo (Expo + SimpleWebAuthn)

## Коротко о принципе passkey

Passkey (WebAuthn) — это вход без пароля. При регистрации устройство
создаёт пару ключей: закрытый ключ остаётся на устройстве, а публичный
ключ сохраняется на сервере. При входе сервер отдаёт случайный
`challenge`, устройство подписывает его закрытым ключом, а сервер
проверяет подпись публичным ключом. Так сервер подтверждает, что
пользователь владеет ключом, не передавая пароль по сети.

Это демо использует **Expo Passkey** на клиенте и **SimpleWebAuthn** на сервере:

- бэкенд на Express + `@simplewebauthn/server`
- фронтенд на Expo (React Native + web) + `expo-passkey`

## Структура проекта

- `backend/` — Node.js сервер (Express + SimpleWebAuthn)
- `frontend-v3-rn/` — актуальный Expo app (Expo Router, web/iOS/Android)

Прочие папки (`frontend/`, `frontend-v2-rn/`, `backend-v2-rn/`) — предыдущие итерации и не являются основным путём запуска.

## Фронтенд (Expo, `frontend-v3-rn`)

Файлы:

- `frontend-v3-rn/app/index.tsx` — UI и вызовы клиента
- `frontend-v3-rn/lib/authClient/*` — клиент `better-auth` + `expo-passkey`
- `frontend-v3-rn/lib/const.ts` — базовые константы и env
- `frontend-v3-rn/app.json` — `scheme` и настройки Expo

Как работает:

- Пользователь вводит `Username` — он используется как `userId`.
- **Register** вызывает `authClient.registerPasskey()`.
- **Login** вызывает `authClient.authenticateWithPasskey()`.
- **Check support** проверяет поддержку passkey на устройстве.

### Какие API дергаются под капотом

Клиент собран через `better-auth` + плагин `expo-passkey`.
Базовый URL берётся из `EXPO_PUBLIC_API_BASE_URL` (по умолчанию `http://localhost:3000`), а префикс API — это `API_BASE_PATH = /api/passkey`.

Также перед каждым запросом добавляется заголовок `x-user-id`, если в приложении задан текущий пользователь (см. `setCurrentUserIdForHeaders()` в `frontend-v3-rn/lib/const.ts`).

#### `authClient.registerPasskey()` (регистрация passkey)

1. Получить challenge для регистрации

- `POST /api/passkey/expo-passkey/challenge`
- headers: `x-user-id: <userId>`
- body (минимум):
  - `type: "registration"`
  - опционально `registrationOptions` (часть WebAuthn options, например `authenticatorSelection`, `timeout`, `attestation`)
- ответ:
  - `{ challenge: string }`

2. Создать credential на устройстве

- Далее плагин `expo-passkey` вызывает нативный/браузерный WebAuthn (создание credential) используя:
  - `challenge` из шага 1
  - `rpId` (в приложении это `EXPO_PUBLIC_RP_ID`)
  - параметры вроде `authenticatorSelection`, `userVerification` и т.п.

3. Завершить регистрацию на сервере

- `POST /api/passkey/expo-passkey/register`
- headers: `x-user-id: <userId>`
- body:
  - `credential: <WebAuthn Registration Response>`
  - опционально `platform`, `metadata`
- ответ:
  - `{ success: true, rpName: string, rpId: string }`

На бэкенде это проверяется через `@simplewebauthn/server.verifyRegistrationResponse()`:

- `expectedChallenge` берётся из ранее выданного challenge (TTL ~ 5 минут)
- `expectedOrigin` берётся из `PASSKEY_ORIGINS`
- `expectedRPID` берётся из `PASSKEY_RP_ID`

#### `authClient.authenticateWithPasskey()` (аутентификация / подтверждение)

1. Получить challenge для входа

- `POST /api/passkey/expo-passkey/challenge`
- headers: `x-user-id: <userId>` (опционально; если не задан, сервер использует режим "auto-discovery")
- body (минимум):
  - `type: "authentication"` (или любое значение, отличное от `registration`)
- ответ:
  - `{ challenge: string }`

2. Получить assertion на устройстве

- Плагин `expo-passkey` вызывает нативный/браузерный WebAuthn (assertion) используя:
  - `challenge` из шага 1
  - `rpId`

3. Отправить assertion на сервер

- `POST /api/passkey/expo-passkey/authenticate`
- body:
  - `credential: <WebAuthn Authentication Response>`
- ответ (в демо):
  - `{ token: string, user: { id: string, email: string, emailVerified: boolean } }`

На бэкенде это проверяется через `@simplewebauthn/server.verifyAuthenticationResponse()`:

- passkey находится по `credential.id`
- `expectedChallenge` берётся из ранее выданного challenge
- `expectedOrigin` и `expectedRPID` проверяются аналогично регистрации

Переменные окружения для фронта:

- `EXPO_PUBLIC_API_BASE_URL` — базовый URL API, например `http://localhost:3000`
- `EXPO_PUBLIC_RP_ID` — RP ID (обычно домен), в dev по умолчанию `localhost`

Где задавать:

- для Expo удобно завести `frontend-v3-rn/.env` и положить туда значения

## Бэкенд (SimpleWebAuthn, `backend`)

Файл:

- `backend/server.js` — SimpleWebAuthn и обработка `/api/passkey/*`

Эндпоинты:

- `POST /api/passkey/expo-passkey/challenge`
- `POST /api/passkey/expo-passkey/register`
- `POST /api/passkey/expo-passkey/authenticate`

Переменные окружения бэка:

- `PORT` — порт сервера (по умолчанию `3000`)
- `SERVICE_URL` — базовый URL сервера (по умолчанию `http://localhost:${PORT}`)
- `PASSKEY_RP_ID` — RP ID (например, `localhost` в dev)
- `PASSKEY_RP_NAME` — имя RP
- `PASSKEY_ORIGINS` — список origin (через запятую) для проверки `expectedOrigin`

По умолчанию сервер разрешает `http://localhost:19006`, `http://localhost:8081`, а также схемы `exp://` и `passkey-demo://`.
Для актуального нативного приложения (см. `frontend-v3-rn/app.json`) схема — `frontrn`, поэтому при необходимости добавь `frontrn://` в `PASSKEY_ORIGINS`.

## Запуск

Бэкенд:

```
cd backend
npm install
npm run dev
```

Фронтенд (Expo):

```
cd frontend-v3-rn
npm install
npm run start
```

Web режим:

```
cd frontend-v3-rn
npm run web
```

## Примечания

- Для **web** нужен HTTPS (WebAuthn требует secure context), кроме `http://localhost`.
- Для **iOS/Android** обычно нужны `associatedDomains` / `assetlinks.json` и корректные `PASSKEY_ORIGINS`.
- Данные хранятся в памяти (без БД), при перезапуске всё очищается.
