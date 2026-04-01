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

set "GITHUB_USER=siruben"
set "REPO_NAME=Compilas"
set "REPO_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%"
set "PAGES_URL=https://%GITHUB_USER%.github.io/%REPO_NAME%/"
set "PAGES_SETTINGS_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%/settings/pages"

REM valida ficheiros obrigatorios
for %%F in (index.html style.css game.js) do (
  if not exist "%%F" (
    echo ERRO: %%F nao encontrado.
    pause
    exit /b 1
  )
)

REM repo local
if not exist ".git" (
  echo A inicializar repositorio local...
  git init
)

REM commit inicial ou incremental
git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
  set "COMMIT_MSG=feat: initial commit - COMPILAS? O Jogo do T"
) else (
  set "COMMIT_MSG=chore: atualizar ficheiros"
)

git add .
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "!COMMIT_MSG!"
  echo Commit feito: !COMMIT_MSG!
) else (
  echo Sem alteracoes para commit.
)

echo.
echo Destino: %GITHUB_USER%/%REPO_NAME%
echo.

REM configura remote
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
  git remote remove origin >nul 2>&1
)
git remote add origin %REPO_URL%.git
git branch -M main

REM push com retry manual
echo A fazer push para GitHub...
echo (Se aparecer janela de login, autentica com as tuas credenciais GitHub)
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo ERRO no push. Possiveis causas:
  echo  1) Repositorio nao existe no GitHub
  echo     ^> Cria em: https://github.com/new
  echo     ^> Nome: %REPO_NAME%  Publico: sim  Vazio: sim
  echo  2) Autenticacao falhou
  echo     ^> Vai a: https://github.com/settings/tokens
  echo     ^> Cria token classic com permissao "repo"
  echo     ^> Usa o token como password no login Git
  echo.
  start "" "https://github.com/new"
  pause
  echo A tentar push novamente...
  git push -u origin main
  if errorlevel 1 (
    echo ERRO: push falhou de novo. Verifica ligacao e credenciais.
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo  SUCESSO!
echo.
echo  Repositorio:
echo  %REPO_URL%
echo.
echo  GitHub Pages (quando ativo):
echo  %PAGES_URL%
echo ========================================
echo.
echo Para ativar GitHub Pages:
echo  1) Abrir Settings ^> Pages  (a abrir agora)
echo  2) Source: Deploy from a branch
echo  3) Branch: main / root
echo  4) Save e aguardar 1-3 minutos
echo.

start "" "%PAGES_SETTINGS_URL%"
echo.
set /p OPEN_SITE="Abrir o site agora? (s/n): "
if /i "!OPEN_SITE!"=="s" start "" "%PAGES_URL%"

echo.
pause
