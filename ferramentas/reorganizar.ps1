<#
  Manutenção Interativa – reorganização das pastas (Clean Architecture)
  Move os arquivos pesados e as duplicatas para a nova estrutura. NÃO apaga nada:
  o que sobra vai para _para_excluir\ para você conferir e apagar depois.

  Uso (de preferência pelo reorganizar.bat, com duplo clique):
    powershell -ExecutionPolicy Bypass -File ferramentas\reorganizar.ps1 -Simular   (só mostra o que faria)
    powershell -ExecutionPolicy Bypass -File ferramentas\reorganizar.ps1            (executa)
#>
param([switch]$Simular)
$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Raiz
$Lixo = Join-Path $Raiz '_para_excluir'
$Log  = Join-Path $PSScriptRoot 'reorganizar_log.txt'
$Modelos = '206B','206L4','230','407','407GXi','429','430','505'
$script:n = 0

function Registrar($msg) { Write-Host $msg; if (-not $Simular) { Add-Content -LiteralPath $Log -Value $msg -Encoding UTF8 } }
function Garantir($pasta) { if (-not $Simular -and -not (Test-Path -LiteralPath $pasta)) { New-Item -ItemType Directory -Path $pasta -Force | Out-Null } }
function Mover($origem, $destino) {
  if (-not (Test-Path -LiteralPath $origem)) { return }
  if (Test-Path -LiteralPath $destino) { Registrar "  [já existe, mantido] $destino"; return }
  Registrar "  mover  $($origem.Replace($Raiz + '\', ''))  ->  $($destino.Replace($Raiz + '\', ''))"
  $script:n++
  if (-not $Simular) { Garantir (Split-Path -Parent $destino); Move-Item -LiteralPath $origem -Destination $destino }
}
function Iguais($a, $b) {
  if (-not ((Test-Path -LiteralPath $a) -and (Test-Path -LiteralPath $b))) { return $false }
  if ((Get-Item -LiteralPath $a).Length -ne (Get-Item -LiteralPath $b).Length) { return $false }
  return (Get-FileHash -LiteralPath $a -Algorithm MD5).Hash -eq (Get-FileHash -LiteralPath $b -Algorithm MD5).Hash
}

if ($Simular) { Write-Host "=== SIMULAÇÃO: nada será movido ===" -ForegroundColor Yellow } else { Registrar "=== Reorganização em $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===" }

# 0) A nova estrutura de código precisa existir antes de tirar o código antigo do lugar
$novos = 'src\infraestrutura\carregar.js','src\apresentacao\controladores\manual.js','src\dominio\frota\catalogo.js','assets\css\style.css'
foreach ($f in $novos) { if (-not (Test-Path -LiteralPath $f)) { Write-Host "Falta $f – a nova estrutura não está completa. Nada foi feito." -ForegroundColor Red; exit 1 } }

# 1) Código antigo da raiz (já copiado para src\ e assets\)
Registrar "`n[1] Código antigo da raiz -> _para_excluir\codigo_antigo"
foreach ($f in 'app.js','carregar.js','comandos.js','mapa.js','modelo.js','motor.js','motor3d.js','motores.js','simulacao.js','style.css','modelos') {
  Mover (Join-Path $Raiz $f) (Join-Path $Lixo "codigo_antigo\$f")
}

# 2) Figuras: figuras_<modelo>\figuras -> dados\<modelo>\figuras (lugar único dos dados de cada aeronave)
Registrar "`n[2] Figuras -> dados\<modelo>\figuras"
foreach ($m in $Modelos) {
  $orig = Join-Path $Raiz "figuras_$m\figuras"; $dest = Join-Path $Raiz "dados\$m\figuras"
  if (-not (Test-Path -LiteralPath $orig)) { continue }
  if (-not (Test-Path -LiteralPath $dest)) { Mover $orig $dest }
  else {
    Registrar "  juntar figuras_$m\figuras em dados\$m\figuras"
    Get-ChildItem -LiteralPath $orig -File | ForEach-Object {
      $alvo = Join-Path $dest $_.Name
      if (-not (Test-Path -LiteralPath $alvo)) { $script:n++; if (-not $Simular) { Move-Item -LiteralPath $_.FullName -Destination $alvo } }
    }
  }
  $pastaVelha = Join-Path $Raiz "figuras_$m"
  if (-not $Simular -and (Test-Path -LiteralPath $pastaVelha)) {
    if (-not (Get-ChildItem -LiteralPath $pastaVelha -Recurse -File)) { Remove-Item -LiteralPath $pastaVelha -Recurse }
    else { Mover $pastaVelha (Join-Path $Lixo "sobras\figuras_$m") }
  }
}

# 3) .zip das figuras (já extraídas) -> _para_excluir\zips
Registrar "`n[3] Pacotes .zip já extraídos -> _para_excluir\zips"
foreach ($m in $Modelos) {
  $zip = Join-Path $Raiz "figuras_$m.zip"
  $extraido = (Test-Path -LiteralPath (Join-Path $Raiz "dados\$m\figuras")) -or (Test-Path -LiteralPath (Join-Path $Raiz "figuras_$m\figuras"))
  if ($extraido) { Mover $zip (Join-Path $Lixo "zips\figuras_$m.zip") }
}

# 4) Duplicatas dos textos e índices (conferidas byte a byte) -> _para_excluir\duplicatas
Registrar "`n[4] Duplicatas conferidas por hash -> _para_excluir\duplicatas"
foreach ($m in $Modelos) {
  $oficial = Join-Path $Raiz "dados\$m\textos.json"
  foreach ($cand in "textos_$m.json", "interno\textos_$m.json") {
    $c = Join-Path $Raiz $cand
    if (Iguais $c $oficial) { Mover $c (Join-Path $Lixo ("duplicatas\" + $cand.Replace('\', '_'))) }
    elseif (Test-Path -LiteralPath $c) { Registrar "  [diferente de dados\$m\textos.json, mantido] $cand" }
  }
}
$idxRaiz = Join-Path $Raiz 'indice_manuais_bell (1).json'; $idxInt = Join-Path $Raiz 'interno\indice_manuais_bell.json'
if (Iguais $idxRaiz $idxInt) { Mover $idxRaiz (Join-Path $Lixo 'duplicatas\indice_manuais_bell (1).json') }
# pasta interno\ (formato antigo, substituído por dados\<modelo>\)
Mover (Join-Path $Raiz 'interno') (Join-Path $Lixo 'interno_formato_antigo')

# 5) Imagens e documentos soltos -> docs\referencias (não versionado)
Registrar "`n[5] Imagens e documentos soltos -> docs\referencias"
Get-ChildItem -LiteralPath $Raiz -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|avif|webp|pdf)$' } | ForEach-Object {
  Mover $_.FullName (Join-Path $Raiz "docs\referencias\$($_.Name)")
}
Mover (Join-Path $Raiz 'Bell 505') (Join-Path $Raiz 'docs\referencias\bell505')
Mover (Join-Path $Raiz 'TABEL.txt') (Join-Path $Lixo 'sobras\TABEL.txt')   # conteúdo está em docs\tabela_motorizacao.txt

# 6) Pastas antigas de src (antes da organização DDD/MVC) -> _para_excluir\src_antigo
Registrar "`n[6] Estrutura antiga de src -> _para_excluir\src_antigo"
foreach ($f in 'src\dominio\catalogo.js','src\dominio\atlas.js','src\dominio\comum','src\dominio\aeronaves','src\apresentacao\paginas','src\apresentacao\3d','src\apresentacao\atlas_visor.js') {
  Mover (Join-Path $Raiz $f) (Join-Path $Lixo ("src_antigo\" + $f.Replace('\', '_')))
}

Registrar "`nTotal de itens movidos: $script:n"
if ($Simular) { Write-Host "Simulação concluída. Rode sem -Simular para executar." -ForegroundColor Yellow }
else { Registrar "Concluído. Teste o site (http://localhost/Bell%20429/) e, se tudo estiver certo, apague a pasta _para_excluir." }
