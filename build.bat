@echo off
cd /d "c:\Users\LB70XE\OneDrive - ING\Desktop\10xDevs_MVP"
echo Building...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo Build failed with error code %ERRORLEVEL%
  exit /b %ERRORLEVEL%
)
echo Build successful, deploying...
call npx wrangler deploy --yes
