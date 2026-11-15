# DetailingHub — Руководство по развёртыванию (Netlify & Production VPS)

Проект построен на **Next.js 15 (App Router)**, **Prisma ORM**, **Tailwind CSS** и **TypeScript**.

---

## Важное архитектурное замечание (Serverless vs Persistent Storage)

По умолчанию проект сконфигурирован на локальную файловую базу данных **SQLite** (`prisma/dev.db`) и сохранение фотографий приёмки на диск (`uploads/` через `/api/photos/[id]`). 

> ⚠️ **Особенность Netlify и Vercel (Serverless):**  
> В serverless-инфраструктуре Netlify файловая система эфемерна (сбрасывается между вызовами функций). Если оставить локальный SQLite без внешнего хранилища, созданные заказы и загруженные фото будут теряться при перезапусках контейнеров.

---

## Вариант 1. Деплой на Netlify (Serverless)

Для стабильной работы на Netlify требуется подключить внешнюю базу данных:

1. **База данных (PostgreSQL):**
   * Создайте бесплатную базу на [Neon.tech](https://neon.tech), [Supabase](https://supabase.com) или [Railway](https://railway.app).
   * В `prisma/schema.prisma` смените провайдер с `"sqlite"` на `"postgresql"`:
     ```prisma
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
     }
     ```
   * В панели Netlify (*Site configuration → Environment variables*) добавьте переменную `DATABASE_URL` со строкой подключения к вашей БД.

2. **Загрузка проекта на Netlify через GitHub:**
   * Загрузите проект в репозиторий GitHub.
   * В Netlify нажмите **"Import from Git"** → выберите репозиторий.
   * Netlify автоматически подтянет параметры из `netlify.toml`:
     * **Build command:** `prisma generate && next build`
     * **Publish directory:** `.next`
     * **Plugin:** `@netlify/plugin-nextjs`
   * Нажмите **Deploy**.

---

## Вариант 2. Рекомендуемый деплой на VPS / Docker (с сохранением SQLite)

Если вы хотите запустить проект «из коробки» со встроенной SQLite без подключения сторонних баз:

### Запуск через Node.js / PM2 на сервере (Ubuntu / Debian):
```bash
# 1. Клонируйте проект и установите зависимости
npm install

# 2. Инициализируйте базу данных и сид
npx prisma db push
node scripts/seed.mjs

# 3. Соберите проект
npm run build

# 4. Запустите через PM2 (с автоперезапуском 24/7)
npm install -g pm2
pm2 start npm --name "detailinghub" -- start
```
При таком развёртывании SQLite (`prisma/dev.db`) и все фотографии приёмки (`uploads/`) хранятся на постоянном диске сервера и гарантированно не удаляются.
