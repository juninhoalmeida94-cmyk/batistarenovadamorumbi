$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$index = Join-Path $root "index.html"
$scriptName = "pibr-prayer-supabase.js?v=20260817-v32"

if (-not (Test-Path $index)) {
  Write-Host "ERRO: index.html nao encontrado. Extraia este pacote na raiz do projeto PIBR M." -ForegroundColor Red
  exit 1
}

$html = Get-Content -LiteralPath $index -Raw -Encoding UTF8
if ($html -match "pibr-prayer-supabase\.js") {
  Write-Host "Integracao do pedido de oracao ja instalada." -ForegroundColor Green
  exit 0
}

$backup = Join-Path $root "index.html.backup-v3.2"
Copy-Item -LiteralPath $index -Destination $backup -Force
$tag = "  <script src=`"$scriptName`"></script>`r`n"

if ($html -notmatch "</body>") {
  Write-Host "ERRO: nao encontrei </body> no index.html. Nenhuma alteracao foi feita." -ForegroundColor Red
  exit 1
}

$html = $html -replace "</body>", ($tag + "</body>")
Set-Content -LiteralPath $index -Value $html -Encoding UTF8
Write-Host "PIBR M V3.2 instalada com sucesso." -ForegroundColor Green
Write-Host "Backup criado: index.html.backup-v3.2"
Write-Host "Agora abra o site pelo Live Server e teste um pedido de oracao."
