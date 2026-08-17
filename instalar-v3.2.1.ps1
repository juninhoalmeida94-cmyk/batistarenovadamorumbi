$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$index = Join-Path $root "index.html"
$integrationFile = Join-Path $root "pibr-prayer-supabase.js"
$scriptName = "pibr-prayer-supabase.js?v=20260817-v321"

if (-not (Test-Path $index)) {
  Write-Host "ERRO: index.html nao encontrado. Extraia este ZIP na raiz do projeto PIBR M." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $integrationFile)) {
  Write-Host "ERRO: pibr-prayer-supabase.js nao encontrado." -ForegroundColor Red
  exit 1
}

$html = Get-Content -LiteralPath $index -Raw -Encoding UTF8
$backup = Join-Path $root "index.html.backup-v3.2.1"
Copy-Item -LiteralPath $index -Destination $backup -Force

$tag = "  <script src=`"$scriptName`"></script>"

if ($html -match '<script\s+src=["'']pibr-prayer-supabase\.js[^"'']*["'']\s*></script>') {
  $html = [regex]::Replace(
    $html,
    '<script\s+src=["'']pibr-prayer-supabase\.js[^"'']*["'']\s*></script>',
    $tag,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  Write-Host "Integracao existente atualizada para V3.2.1." -ForegroundColor Yellow
} elseif ($html -match '</body>') {
  $html = ([regex]'</body>').Replace($html, ($tag + "`r`n</body>"), 1)
  Write-Host "Integracao V3.2.1 adicionada ao index.html." -ForegroundColor Green
} else {
  Write-Host "ERRO: nao encontrei </body> no index.html. Nenhuma alteracao foi feita." -ForegroundColor Red
  exit 1
}

Set-Content -LiteralPath $index -Value $html -Encoding UTF8

$verify = Get-Content -LiteralPath $index -Raw -Encoding UTF8
if ($verify -notmatch 'pibr-prayer-supabase\.js\?v=20260817-v321') {
  Write-Host "ERRO: a verificacao final falhou. Restaure o backup e me avise." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "PIBR M V3.2.1 instalada e VERIFICADA com sucesso." -ForegroundColor Green
Write-Host "Backup: index.html.backup-v3.2.1"
Write-Host "A planilha Google continua recebendo e o Supabase/painel recebe em paralelo."
Write-Host "Abra o site com Live Server, use Ctrl+F5 e envie UM pedido de teste."
