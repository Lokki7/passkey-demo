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
- `frontend/` — Expo приложение (web/iOS/Android)

## Фронтенд (Expo)

Файлы:
- `frontend/App.js` — UI и вызовы Expo Passkey
- `frontend/app.json` — схема приложения (`scheme`) и базовые настройки
- `frontend/babel.config.js` — конфиг Babel для Expo

Как работает:
- Есть две кнопки: **“Зарегистрировать passkey”** и
  **“Подтвердить операцию (2FA)”**.
- Регистрация вызывает `authClient.registerPasskey()`.
- Подтверждение операции вызывает `authClient.authenticateWithPasskey()`.

Переменные окружения для фронта:
- `EXPO_PUBLIC_API_BASE_URL` — базовый URL API, например
  `http://localhost:3000`
- `EXPO_PUBLIC_RP_ID` — RP ID (обычно домен)

## Бэкенд (SimpleWebAuthn)

Файл:
- `backend/server.js` — SimpleWebAuthn и обработка `/api/passkey/*`

Эндпоинты:
- `POST /api/passkey/expo-passkey/challenge`
- `POST /api/passkey/expo-passkey/register`
- `POST /api/passkey/expo-passkey/authenticate`

Переменные окружения бэка:
- `PASSKEY_RP_ID` — RP ID (например, `localhost` в dev)
- `PASSKEY_RP_NAME` — имя RP
- `PASSKEY_ORIGINS` — список origin, через запятую
- `SERVICE_URL` — базовый URL сервера (по умолчанию `http://localhost:3000`)

## Запуск

Бэкенд:
```
cd /Users/pavel/YouHodler/passkey-demo/backend
npm install
npm run dev
```

Фронтенд (Expo):
```
cd /Users/pavel/YouHodler/passkey-demo/frontend
npm install
npm start
```

## Примечания

- Для **web** нужен HTTPS (WebAuthn требует secure context).
- Для **iOS/Android** нужны `associatedDomains` / `assetlinks.json`
  и корректные `PASSKEY_ORIGINS`.
- Данные хранятся в памяти (без БД), при перезапуске всё очищается.
