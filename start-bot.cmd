@echo off
cd /d "%~dp0"
if not exist ".env" (
  copy ".env.example" ".env"
  echo.
  echo Created .env. Put your Discord bot token in it, then run start-bot.cmd again.
  notepad ".env"
  pause
  exit /b
)
npm install
npm start
pause
