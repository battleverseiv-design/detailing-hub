@echo off
setlocal enabledelayedexpansion
title DetailingHub - Production Server
cd /d "%~dp0"

echo ========================================================
echo   DETAILINGHUB - Production Operating System
echo ========================================================
echo.

rem Проверяем порт 3000, если занят старым процессом - освобождаем
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo [!] Порт 3000 занят процессом %%a. Завершаем старый процесс...
    taskkill /F /PID %%a >nul 2>&1
)

if not exist ".next" (
    echo [*] Production-сборка не найдена. Собираем проект...
    call npm run build
)

echo [*] Открываем DetailingHub в браузере...
start http://localhost:3000

echo [*] Сервер запускается на http://localhost:3000 ...
echo [i] Кабинет владельца: http://localhost:3000/admin (Пароль: admin12345)
echo.

call npm start

pause
