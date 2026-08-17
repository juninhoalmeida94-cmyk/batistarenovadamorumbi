$ErrorActionPreference="Stop"
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$index=Join-Path $root "index.html"
$script=Join-Path $root "script.js"

if(!(Test-Path $index)){Write-Host "ERRO: index.html nao encontrado." -ForegroundColor Red; exit 1}
if(!(Test-Path $script)){Write-Host "ERRO: script.js nao encontrado." -ForegroundColor Red; exit 1}

Copy-Item $index "$index.backup-v3.2.3" -Force
Copy-Item $script "$script.backup-v3.2.3" -Force

$html=Get-Content $index -Raw -Encoding UTF8
$html=[regex]::Replace($html,'(?is)\s*<script\b[^>]*src=["''][^"'']*pibr-prayer-supabase\.js[^"'']*["''][^>]*>\s*</script>\s*',"`r`n")
Set-Content $index $html -Encoding UTF8

$js=Get-Content $script -Raw -Encoding UTF8
$pattern='(?s)/\* === PIBR ORAÇÃO -> SUPABASE V3\.2\.2 START === \*/.*?/\* === PIBR ORAÇÃO -> SUPABASE V3\.2\.2 END === \*/'
$m=[regex]::Matches($js,$pattern)
if($m.Count -gt 1){
  $keep=$m[0].Value
  $js=[regex]::Replace($js,$pattern,'')
  Set-Content $script ($js.TrimEnd()+"`r`n`r`n"+$keep+"`r`n") -Encoding UTF8
}

Write-Host ""
Write-Host "PIBR M V3.2.3 - DUPLICACAO CORRIGIDA." -ForegroundColor Green
Write-Host "Abra pelo Live Server, Ctrl+F5 e envie UM novo pedido." -ForegroundColor Cyan