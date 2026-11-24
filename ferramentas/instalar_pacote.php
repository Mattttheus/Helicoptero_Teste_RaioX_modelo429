<?php
// HeliSense 3D – instala um pacote de atualização (.zip) na pasta do projeto (rede local / WAMP).
// Uso: ferramentas/instalar_pacote.php?ok=HS-PACOTE-20261121&arq=helisense_atualizacao.zip
// O .zip fica em ferramentas/pacotes/. Só extrai dentro da pasta do projeto; recusa caminhos com "..", absolutos ou pastas protegidas.
header('Content-Type: text/plain; charset=utf-8');
if (($_GET['ok'] ?? '') !== 'HS-PACOTE-20261121') { http_response_code(403); exit('código inválido'); }
$raiz = realpath(__DIR__ . '/..');
$arq = basename($_GET['arq'] ?? '');
$zipPath = __DIR__ . '/pacotes/' . $arq;
if (!preg_match('/^[\w.-]+\.zip$/', $arq) || !is_file($zipPath)) { http_response_code(404); exit('pacote não encontrado'); }
$z = new ZipArchive();
if ($z->open($zipPath) !== true) { http_response_code(500); exit('zip inválido'); }
$ok = 0; $recusados = [];
for ($i = 0; $i < $z->numFiles; $i++) {
  $nome = str_replace('\\', '/', $z->getNameIndex($i));
  if (substr($nome, -1) === '/') continue;
  if (strpos($nome, '..') !== false || $nome[0] === '/' || preg_match('#^(dados|manuais|interno|backups)/#i', $nome) || preg_match('/:/', $nome)) { $recusados[] = $nome; continue; }
  $dest = $raiz . '/' . $nome;
  if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0775, true);
  $conteudo = $z->getFromIndex($i);
  if ($conteudo === false || file_put_contents($dest, $conteudo) === false) { $recusados[] = $nome; continue; }
  $ok++;
}
$z->close();
echo "instalados: $ok" . ($recusados ? "\nrecusados: " . implode(', ', $recusados) : '');
