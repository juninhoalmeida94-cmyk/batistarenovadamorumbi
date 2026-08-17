$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $root "script.js"
$backup = Join-Path $root "script.js.backup-v3.2.2"
$snippetFile = Join-Path $root "ORACAO-SUPABASE-V3.2.2.js"

if (-not (Test-Path $script)) {
  Write-Host "ERRO: script.js nao encontrado. Extraia este ZIP na raiz da PIBR M." -ForegroundColor Red
  exit 1
}

Copy-Item -LiteralPath $script -Destination $backup -Force

$current = Get-Content -LiteralPath $script -Raw -Encoding UTF8
$snippet = Get-Content -LiteralPath $snippetFile -Raw -Encoding UTF8

$pattern = '(?s)/\* === PIBR ORAÇÃO -> SUPABASE V3\.2\.2 START === \*/.*?/\* === PIBR ORAÇÃO -> SUPABASE V3\.2\.2 END === \*/'
$current = [regex]::Replace($current, $pattern, '').TrimEnd()

Set-Content -LiteralPath $script -Value ($current + "`r`n`r`n" + $snippet + "`r`n") -Encoding UTF8

$verify = Get-Content -LiteralPath $script -Raw -Encoding UTF8
if ($verify -notmatch 'PIBR V3\.2\.2') {
  Write-Host "ERRO: verificacao falhou. Backup criado em script.js.backup-v3.2.2" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "CORRECAO V3.2.2 INSTALADA COM SUCESSO." -ForegroundColor Green
Write-Host "A integracao foi adicionada diretamente ao script.js." -ForegroundColor Green
Write-Host "Google Forms continua funcionando como backup." -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora: abra o site pelo Live Server, pressione Ctrl+F5 e envie um NOVO pedido."