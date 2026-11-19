# Школьный турнир: запуск с Google

Ученик устанавливает версию **0.2.0** или новее, вводит адрес турнира в профиле и входит с Google. Сервер сохраняет баллы после каждого ответа. В таблице виден псевдоним. Приватные ключи для этих шагов пересылать не нужно.

### 1. Создай проект Supabase

На [supabase.com/dashboard](https://supabase.com/dashboard) выбери **New project**. В окне **Connect** или в настройках проекта скопируй **Project URL** (`https://….supabase.co`) и **Publishable key** (`sb_publishable_…`). В **Authentication → Sign In / Providers → Google** скопируй **Callback URL**. Обычно он заканчивается на `/auth/v1/callback`.

### 2. Дай Google адрес Supabase

В [Google Cloud Console](https://console.cloud.google.com/) создай проект. Открой **Google Auth Platform → Get started**. Введи название приложения, почту для связи, выбери аудиторию **External**. Для проверки в режиме **Testing** добавь свои адреса в **Audience → Test users**; перед рассылкой добавь адреса участников класса, если Google ограничивает доступ тестировщиками.

В **Clients → Create client → Web application** вставь **Callback URL Supabase** в **Authorized redirect URIs**. Нажми **Create**. В карточке Google в Supabase включи провайдера, вставь **Client ID** и **Client secret**, сохрани. Пароли Google ученики вводят только на странице Google. Для школьных управляемых аккаунтов может потребоваться разрешение администратора школы.

### 3. Создай сервер Railway

На [railway.com/new](https://railway.com/new) выбери **Deploy from GitHub repo** → `gnatukroma99-hash/Ukr-social_project` → ветка `main`. Dockerfile уже в корне. Добавь к сервису **Volume** (меню сервиса или `New → Volume`) и задай **Mount path** `/data`. Используй один экземпляр сервера.

В **Service → Settings → Networking → Generate Domain** создай домен, целевой порт **4387**. Скопируй адрес целиком, например `https://ИМЯ.up.railway.app`. В **Variables → Raw Editor** вставь и замени примеры своими значениями:

```dotenv
CLUB_MODE=tournament
HOST=0.0.0.0
PORT=4387
DB_PATH=/data/svoie.sqlite
PUBLIC_ORIGIN=https://ИМЯ.up.railway.app
SUPABASE_URL=https://ПРОЕКТ.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_ТВОЙ_КЛЮЧ
TOURNAMENT_START=2026-11-18T00:00:00+02:00
TOURNAMENT_END=2026-11-25T00:00:00+02:00
```

Нажми **Deploy** для применения изменений. В Supabase открой **Authentication → URL Configuration → Redirect URLs → Add URL**. Добавь точный адрес `https://ИМЯ.up.railway.app/auth/finish`. Адрес в Google ведёт в Supabase, адрес в Supabase возвращает игрока на Railway. Если будешь менять домен Railway, обнови оба поля `PUBLIC_ORIGIN` и `Redirect URLs`.

### 4. Проверь перед рассылкой

1. Открой `https://ИМЯ.up.railway.app/api/health`. Должно быть `"mode":"tournament"`. Если видишь `club`, проверь `CLUB_MODE` и нажми Redeploy. Для приглашения ученикам нужен только адрес **без** `/api/health`.
2. Установи [последнюю версию](https://github.com/gnatukroma99-hash/Ukr-social_project/releases/latest). На Android также доступен [APK из репозитория](../downloads/Povazhaite-Svoie-Android.apk).
3. До первого личного квеста открой **Профіль → Приєднатися до клубу**. Вставь адрес Railway и придумай псевдоним. Нажми **Приєднатися → Увійти через Google**. После входа скопируй одноразовый код со страницы Railway в окно приложения на том же устройстве.
4. Выполни одно задание и открой **Рейтинг**. Войди на другом устройстве с тем же Google-аккаунтом: прогресс и строка в таблице должны совпасть. Если всё верно, отправь классу ссылку на сборку и адрес Railway. Тестовая попытка на боевом сервере считается в зачёт.

Результаты фиксируются **в ночь со вторника 24 ноября на среду 25 ноября 2026 года**, в 00:00 по Киеву. Сервер перестаёт принимать ответы; итоговую таблицу можно открыть в приложении. Если сервер спал, при первом обращении он восстановит итоги по сохранённому времени ответов. Google Sheets и рассылка писем с результатами не используются.

**Если нужен ещё и вход по почте:** настрой [собственный SMTP в Supabase](https://supabase.com/docs/guides/auth/auth-smtp), включи Email provider, добавь `{{ .Token }}` в шаблон письма входа и подтверждения регистрации и задай в Railway `ALLOW_EMAIL_OTP=true`. Для входа только через Google эти шаги не нужны.
