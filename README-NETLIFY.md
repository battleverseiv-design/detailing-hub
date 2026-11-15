# DetailingHub — Инструкция по деплою на Netlify

Проект полностью настроен для сборки и работы на платформе **Netlify** (Next.js 15 App Router + Prisma + Tailwind CSS).

---

### Вариант 1. Автоматический деплой через GitHub (Рекомендуемый)

1. Распакуйте архив и загрузите проект в новый репозиторий на **GitHub** (или GitLab/Bitbucket).
2. Зайдите на [Netlify](https://app.netlify.com/) → нажмите **"Add new site"** → **"Import an existing project"**.
3. Выберите ваш GitHub-репозиторий с проектом.
4. Netlify автоматически подтянет настройки из файла `netlify.toml`:
   - **Build command:** `prisma generate && next build`
   - **Publish directory:** `.next`
   - **Plugin:** `@netlify/plugin-nextjs`
5. Нажмите **"Deploy site"**. Через 1-2 минуты сайт будет опубликован на бесплатном HTTPS-домене `*.netlify.app`.

---

### Вариант 2. Быстрый деплой через терминал (Netlify CLI)

В папке с проектом выполните команду:
```bash
npx netlify deploy --build --prod
```
Терминал попросит авторизоваться в Netlify и сразу соберёт и опубликует сайт.
