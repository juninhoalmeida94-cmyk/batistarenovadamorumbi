$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $root "script.js"
$blockFile = Join-Path $root "INTEGRACAO-PUBLICA-V3.3.js"

if (!(Test-Path $script)) {
  Write-Host "ERRO: script.js nao encontrado. Extraia o ZIP na raiz da PIBR M." -ForegroundColor Red
  exit 1
}

Copy-Item $script "$script.backup-v3.3" -Force
$current = Get-Content $script -Raw -Encoding UTF8
$block = Get-Content $blockFile -Raw -Encoding UTF8

$pattern = '(?s)/\* === PIBR V3\.3 — CÉLULAS \+ GALERIA SUPABASE START === \*/.*?/\* === PIBR V3\.3 — CÉLULAS \+ GALERIA SUPABASE END === \*/'
$current = [regex]::Replace($current, $pattern, '').TrimEnd()
Set-Content $script ($current + "`r`n`r`n" + $block + "`r`n") -Encoding UTF8

$verify = Get-Content $script -Raw -Encoding UTF8
if ($verify -notmatch 'PIBR V3\.3') {
  Write-Host "ERRO: verificacao falhou. Backup: script.js.backup-v3.3" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "PIBR M V3.3 INSTALADA COM SUCESSO." -ForegroundColor Green
Write-Host "Interessados em Celula + Galeria do Painel ativados." -ForegroundColor Cyan
Write-Host "Backup criado: script.js.backup-v3.3" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Agora abra o site e o painel pelo Live Server e pressione Ctrl+F5."