@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo ========================================
echo    COMPILAS? - Setup Git + GitHub
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERRO: Git nao encontrado.
  echo Instala em: https://git-scm.com
  pause
  exit /b 1
)

where curl >nul 2>&1
if errorlevel 1 (
  echo ERRO: curl nao encontrado.
  pause
  exit /b 1
)

REM Repo local
if not exist ".git" (
  git init
)

git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
  set "INITIAL_COMMIT=1"
) else (
  set "INITIAL_COMMIT=0"
)

git add .
git diff --cached --quiet
if errorlevel 1 (
  if "!INITIAL_COMMIT!"=="1" (
    git commit -m "feat: initial commit - COMPILAS?"
  ) else (
    git commit -m "chore: atualizar ficheiros"
  )
) else (
  echo Sem alteracoes para commit.
)

echo.
set /p GITHUB_USER="GitHub username: "
if "%GITHUB_USER%"=="" (
  echo ERRO: username vazio.
  pause
  exit /b 1
)

set /p REPO_NAME="Nome do repositorio [compilas]: "
if "%REPO_NAME%"=="" set "REPO_NAME=compilas"

set /p REPO_VISIBILITY="Visibilidade [public/private] (default: public): "
if /i "%REPO_VISIBILITY%"=="private" (
  set "REPO_PRIVATE=true"
) else (
  set "REPO_PRIVATE=false"
)

echo.
for /f "delims=" %%i in ('powershell -NoProfile -Command "$p=Read-Host ''GitHub Token (classic, repo)'' -AsSecureString; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); [Runtime.InteropServices.Marshal]::PtrToStringAuto($b)"') do set "GITHUB_TOKEN=%%i"

if "%GITHUB_TOKEN%"=="" (
  echo ERRO: token vazio.
  pause
  exit /b 1
)

echo.
echo A validar token...
for /f %%S in ('curl -s -o NUL -w "%%{http_code}" -H "Authorization: Bearer %GITHUB_TOKEN%" https://api.github.com/user') do set "AUTH_STATUS=%%S"
if not "!AUTH_STATUS!"=="200" (
  echo ERRO: token invalido. HTTP !AUTH_STATUS!
  pause
  exit /b 1
)

echo Token OK.
echo.

echo A criar repositorio no GitHub...
for /f %%S in ('curl -s -o resp.json -w "%%{http_code}" ^
  -X POST ^
  -H "Authorization: Bearer %GITHUB_TOKEN%" ^
  -H "Accept: application/vnd.github+json" ^
  -H "X-GitHub-Api-Version: 2022-11-28" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"%REPO_NAME%\",\"description\":\"COMPILAS? O Jogo do T - Tetris neon\",\"private\":%REPO_PRIVATE%}" ^
  https://api.github.com/user/repos') do set "CREATE_STATUS=%%S"

if "!CREATE_STATUS!"=="201" (
  echo Repositorio criado.
) else if "!CREATE_STATUS!"=="422" (
  echo Repositorio ja existe. A continuar...
) else (
  echo ERRO ao criar repositorio. HTTP !CREATE_STATUS!
  type resp.json
  del /q resp.json >nul 2>&1
  pause
  exit /b 1
)

del /q resp.json >nul 2>&1

echo.
echo A configurar remote...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git
git branch -M main

for /f "delims=" %%i in ('powershell -NoProfile -Command "$u=$env:GITHUB_USER; $t=$env:GITHUB_TOKEN; [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(\"$u`:$t\"))"') do set "GITHUB_AUTH=%%i"

echo A fazer push...
git -c http.https://github.com/.extraheader="AUTHORIZATION: basic !GITHUB_AUTH!" push -u origin main
if errorlevel 1 (
  set "GITHUB_AUTH="
  set "GITHUB_TOKEN="
  echo ERRO no push.
  pause
  exit /b 1
)

set "GITHUB_AUTH="
set "GITHUB_TOKEN="

echo.
echo ========================================
echo  Publicado em:
echo  https://github.com/%GITHUB_USER%/%REPO_NAME%
echo ========================================
echo.
pause
