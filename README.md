# Passkey demo

## Коротко о принципе passkey

Passkey (WebAuthn) — это вход без пароля. При регистрации устройство
создаёт пару ключей: закрытый ключ остаётся на устройстве, а публичный
ключ сохраняется на сервере. При входе сервер отдаёт случайный
`challenge`, устройство подписывает его закрытым ключом, а сервер
проверяет подпись публичным ключом. Так сервер подтверждает, что
пользователь владеет ключом, не передавая пароль по сети.

Небольшое демо WebAuthn (passkeys) с Node.js‑беком и фронтом на Vite.

## Структура проекта

- `backend/` — Node.js сервер (Express + `@simplewebauthn/server`)
- `frontend/` — статичный фронт на Vite с авто‑перезагрузкой

## Фронтенд

Файлы:
- `frontend/index.html` — простая разметка с полем username и кнопками
- `frontend/src/main.js` — логика запросов, запуск регистрации/аутентификации
- `frontend/src/style.css` — минимальные стили

Как работает:
- При регистрации фронт вызывает `POST /register/options`, получает
  `PublicKeyCredentialCreationOptions` (в них приходит `challenge` от сервера),
  затем запускает
  `startRegistration()` из `@simplewebauthn/browser` — это обёртка над
  `navigator.credentials.create()`. Внутри этого шага устройство генерирует
  пару ключей и подписывает данные регистрации. Результат (attestation,
  включая публичный ключ) отправляется на
  `POST /register/verify`.
- При аутентификации по username — вызывает `POST /auth/options`, получает
  `PublicKeyCredentialRequestOptions` (в них тоже есть `challenge`), затем запускает
  `startAuthentication()` из `@simplewebauthn/browser` — это обёртка над
  `navigator.credentials.get()`. Устройство подписывает `challenge` закрытым
  ключом. Результат (assertion) отправляется на
  `POST /auth/verify`.
- Для usernameless‑логина есть отдельная кнопка — запрашивает
  `/auth/options` без username, затем отправляет результат на `/auth/verify`.
- Статус и ошибки выводятся в лог на странице.

## Бэкенд

Файлы:
- `backend/server.js` — все эндпоинты и логика WebAuthn

Как работает:
- `POST /register/options` — генерирует registration options (RP ID `localhost`),
  включая `challenge`, `rp`, `user`, `pubKeyCredParams`, `authenticatorSelection`.
- `POST /register/verify` — проверяет attestation и сохраняет credential:
  `credentialID` (base64url), `credentialPublicKey`, `counter`, `transports`.
- `POST /auth/options` — генерирует auth options (`challenge`, `rpId`,
  `allowCredentials`):
  - с username — `allowCredentials` ограничен пользователем
  - без username — usernameless flow
- `POST /auth/verify` — проверяет assertion: сверяет `challenge`, `origin`,
  `rpId`, затем проверяет подпись публичным ключом и обновляет `counter`.
- Все данные хранятся в памяти (Map), при перезапуске всё очищается.

## Запуск

Бэкенд:
```
cd /Users/pavel/YouHodler/passkey-demo/backend
npm install
npm run dev
```

Фронтенд:
```
cd /Users/pavel/YouHodler/passkey-demo/frontend
npm install
npm run dev
```

Открыть `http://localhost:5173`.

## Примечания

- Работает на `localhost` (для WebAuthn это secure context).
- Данные в памяти, без БД.
