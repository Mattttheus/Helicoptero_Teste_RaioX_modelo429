<?php
// Rotina noturna local: registra o resultado dos testes e gera cópia de segurança versionada do projeto.
// Só aceita chamadas desta máquina (localhost) com o código. Nada é enviado para fora (sem GitHub, sem nuvem).
// Destino: C:\wamp64.1\backups\ManutencaoInterativa (fora do www – não fica acessível pelo navegador).
const CODIGO = 'MI-NOITE-20261120';
const MANTER = 14; // quantas cópias guardar (as mais antigas são apagadas automaticamente – só arquivos desta pasta de cópias)
header('Content-Type: text/plain; charset=utf-8');
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || ($_GET['ok'] ?? '') !== CODIGO) { http_response_code(403); exit('negado'); }
$raiz = realpath(__DIR__ . '/..');
$destino = dirname(dirname($raiz)) . DIRECTORY_SEPARATOR . 'backups' . DIRECTORY_SEPARATOR . 'ManutencaoInterativa';
if (!is_dir($destino)) @mkdir($destino, 0777, true);
$agora = date('Y-m-d_H-i');
$acao = $_GET['acao'] ?? '';

if ($acao === 'registrar') {
  $d = json_decode(file_get_contents('php://input'), true) ?: [];
  $linha = sprintf("%s | %d ok · %d falhas · %d avisos%s\n", date('Y-m-d H:i'), $d['ok'] ?? 0, $d['falha'] ?? 0, $d['aviso'] ?? 0,
    empty($d['problemas']) ? '' : "\n    - " . implode("\n    - ", array_map(fn($p) => str_replace(["\r", "\n"], ' ', substr((string)$p, 0, 300)), $d['problemas'])));
  file_put_contents("$destino/testes_registro.txt", $linha, FILE_APPEND | LOCK_EX);
  exit('registro gravado');
}

if ($acao === 'backup') {
  if (!class_exists('ZipArchive')) { http_response_code(500); exit('backup: extensão zip do PHP desligada (WAMP → PHP → extensões → php_zip)'); }
  set_time_limit(3600); ignore_user_abort(true);
  $trava = fopen("$destino/.backup.lock", 'c');
  if (!flock($trava, LOCK_EX | LOCK_NB)) exit('backup: já existe uma cópia em andamento');
  // restos de cópias interrompidas (arquivos temporários projeto_*.zip.xxxx desta pasta, com mais de 2 h)
  foreach (glob("$destino/projeto_*.zip.*") ?: [] as $tmp) if (filemtime($tmp) < time() - 7200) @unlink($tmp);
  $and = "$destino/backup_andamento.txt"; file_put_contents($and, date('H:i:s') . " início\n");
  $arq = "$destino/projeto_$agora.zip";
  $z = new ZipArchive();
  if ($z->open($arq, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) { http_response_code(500); exit('backup: não abriu o zip'); }
  $n = 0;
  $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($raiz, FilesystemIterator::SKIP_DOTS));
  foreach ($it as $f) {
    if (!$f->isFile()) continue;
    $rel = str_replace('\\', '/', substr($f->getPathname(), strlen($raiz) + 1));
    if (preg_match('#(^|/)(\.git|node_modules|_para_excluir)/#', $rel)) continue;
    $z->addFile($f->getPathname(), $rel);
    if (preg_match('/\.(webp|png|jpg|jpeg|glb|hdr|zip|pdf)$/i', $rel)) $z->setCompressionName($rel, ZipArchive::CM_STORE); // já comprimidos
    $n++;
    if ($n % 500 === 0) file_put_contents($and, date('H:i:s') . " $n arquivos lidos\n", FILE_APPEND);
  }
  file_put_contents($and, date('H:i:s') . " gravando zip ($n arquivos)\n", FILE_APPEND);
  $z->close();
  file_put_contents($and, date('H:i:s') . " concluído\n", FILE_APPEND);
  // rotação: mantém só as MANTER cópias mais recentes (apenas arquivos projeto_*.zip desta pasta)
  $todos = glob("$destino/projeto_*.zip"); rsort($todos);
  foreach (array_slice($todos, MANTER) as $velho) @unlink($velho);
  file_put_contents("$destino/testes_registro.txt", date('Y-m-d H:i') . " | cópia: " . basename($arq) . " ($n arquivos, " . round(filesize($arq) / 1048576, 1) . " MB)\n", FILE_APPEND | LOCK_EX);
  exit('cópia ' . basename($arq) . " ($n arquivos, " . round(filesize($arq) / 1048576, 1) . ' MB)');
}

if ($acao === 'ver') { $r = "$destino/testes_registro.txt"; $a = "$destino/backup_andamento.txt"; $zips = array_map(fn($f) => basename($f) . ' ' . round(filesize($f) / 1048576, 1) . ' MB', glob("$destino/*.zip*") ?: []);
  exit((is_file($r) ? implode('', array_slice(file($r), -60)) : "sem registro ainda\n") . (is_file($a) ? "\n[andamento]\n" . file_get_contents($a) : '') . "\n[arquivos]\n" . implode("\n", $zips) . "\nPHP " . PHP_VERSION . ' zip=' . (class_exists('ZipArchive') ? 'sim' : 'não')); }
http_response_code(400); echo 'ação inválida';
