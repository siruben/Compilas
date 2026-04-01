Write-Host "A criar repositorio Git..." -ForegroundColor Cyan

# Inicia o repositorio
git init

# Configura ficheiros
git add .

# Primeiro commit
git commit -m "feat: primeiro commit - COMPILAS? O Jogo do T"

Write-Host ""
Write-Host "Repositorio local criado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "A abrir GitHub para criar repositorio remoto..." -ForegroundColor Yellow
Start-Process "https://github.com/new"

Write-Host ""
Write-Host "Depois de criares o repositorio no GitHub, corre:" -ForegroundColor Cyan
Write-Host '  git remote add origin https://github.com/SEU_USER/compilas.git' -ForegroundColor White
Write-Host '  git branch -M main' -ForegroundColor White
Write-Host '  git push -u origin main' -ForegroundColor White
Write-Host ""
Read-Host "Pressiona ENTER para sair"
