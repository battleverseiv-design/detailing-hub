@echo off
setlocal enabledelayedexpansion
title Detailing Studio Launcher

cd /d "%~dp0"

echo ========================================================
echo   CHISTIY BORT - DETAILING STUDIO MVP
echo ========================================================
echo.

if not exist "node_modules" (
  echo [1/3] Installing dependencies...
  call npm install
)

if not exist "prisma\dev.db" (
  echo [2/3] Setting up database...
  call npx prisma db push
  call node scripts/seed.mjs
)

echo [3/3] Starting Next.js server on port 3000...
echo Studio URL: http://localhost:3000
echo Admin URL:  http://localhost:3000/admin (password: admin12345)
echo.

call npm run dev

pause
