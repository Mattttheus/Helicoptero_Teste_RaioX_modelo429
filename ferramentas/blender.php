<?php
// Dispara o Blender sem janela para gerar fotos realistas (Cycles) de um modelo .glb. Só localhost + código.
// ?acao=render&modelo=heli_206   → assets/renders/heli_206_*.png  ·  ?acao=status  → log e arquivos prontos
const CODIGO = 'MI-BLENDER-20261120';
header('Content-Type: text/plain; charset=utf-8');
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || ($_GET['ok'] ?? '') !== CODIGO) { http_response_code(403); exit('negado'); }
$raiz = realpath(__DIR__ . '/..'); $saida = "$raiz/assets/renders"; @mkdir($saida, 0777, true); $log = "$saida/blender_log.txt";
function achar_blender() {
  $c = glob('C:/Program Files/Blender Foundation/Blender*/blender.exe') ?: [];
  $c = array_merge($c, glob(getenv('LOCALAPPDATA') . '/Programs/Blender Foundation/Blender*/blender.exe') ?: [], glob('C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe') ?: []);
  foreach (['C:', 'D:', 'E:'] as $u) $c = array_merge($c, glob("$u/Users/*/AppData/Local/Programs/Blender Foundation/Blender*/blender.exe") ?: [], glob("$u/Program Files/Blender Foundation/Blender*/blender.exe") ?: [], glob("$u/Blender*/blender.exe") ?: [], glob("$u/Program Files/WindowsApps/BlenderFoundation.Blender*/Blender/blender.exe") ?: [], glob("$u/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe") ?: []);
  foreach (['HKLM\\SOFTWARE\\BlenderFoundation', 'HKCU\\SOFTWARE\\BlenderFoundation', 'HKLM\\SOFTWARE\\WOW6432Node\\BlenderFoundation'] as $k)
    if (preg_match_all('/Install_Dir\s+REG_SZ\s+(.+)/i', (string)shell_exec('reg query "' . $k . '" /s 2>NUL'), $mm)) foreach ($mm[1] as $d) $c[] = rtrim(trim($d), '\\/') . '/blender.exe';
  foreach (explode("\n", (string)shell_exec('powershell -NoProfile -Command "(Get-AppxPackage -AllUsers *Blender*).InstallLocation" 2>NUL')) as $l) if (trim($l)) foreach (['/Blender/blender.exe', '/blender.exe'] as $sx) $c[] = trim($l) . $sx;
  foreach (explode("\n", (string)shell_exec('where blender 2>NUL')) as $l) if (trim($l)) $c[] = trim($l);
  if (is_file(__DIR__ . '/blender_caminho.txt')) $c[] = trim(file_get_contents(__DIR__ . '/blender_caminho.txt'));
  $c = array_values(array_filter(array_unique($c), 'is_file')); rsort($c); return $c[0] ?? null;
}
$acao = $_GET['acao'] ?? 'status';
function blender_rodando() { return stripos((string)shell_exec('tasklist /FI "IMAGENAME eq blender.exe" /NH 2>NUL'), 'blender.exe') !== false; }
if (in_array($acao, ['render', 'fila', 'refinar', 'tudo', 'lote'], true) && blender_rodando() && empty($_GET['forcar'])) exit('aguarde: já existe um Blender rodando (um por vez para não travar o computador)');
if ($acao === 'rodando') exit(blender_rodando() ? 'sim' : 'nao');
if ($acao === 'parar_fila') { // encerra só o Blender da fila (os renders avulsos continuam); a fila nova retoma das vistas que faltam
  $ps = "Get-CimInstance Win32_Process | Where-Object { \$_.Name -eq 'blender.exe' } | Where-Object { \$_.CommandLine -match ' fila ' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force; \$_.ProcessId }";
  $pids = trim((string)shell_exec('powershell -NoProfile -Command ' . escapeshellarg($ps) . ' 2>&1'));
  foreach (glob("$saida/.ocupado_*") ?: [] as $t) if (in_array(trim((string)@file_get_contents($t)), preg_split('/\s+/', $pids), true)) @unlink($t); // trava do processo encerrado
  exit('parado: ' . $pids);
}
if ($acao === 'processos') { // lista os Blenders rodando e o que cada um faz
  $ps = "Get-CimInstance Win32_Process | Where-Object { \$_.Name -eq 'blender.exe' } | ForEach-Object { '' + \$_.ProcessId + ' ' + ((\$_.CommandLine -split ' -- ')[1]) }";
  exit(trim((string)shell_exec('powershell -NoProfile -Command ' . escapeshellarg($ps) . ' 2>&1')) ?: 'nenhum');
}
if ($acao === 'procurar') { // varre o disco atrás do blender.exe e guarda o caminho achado
  set_time_limit(600); $ach = [];
  foreach (['C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\Users', 'C:\\ProgramData', 'D:\\', 'C:\\'] as $r) {
    if (!is_dir($r)) continue;
    foreach (explode("\n", (string)shell_exec('where /R "' . $r . '" blender.exe 2>NUL')) as $l) if (trim($l) && is_file(trim($l))) $ach[] = trim($l);
    if ($ach) break;
  }
  if ($ach) file_put_contents(__DIR__ . '/blender_caminho.txt', $ach[0]);
  exit($ach ? implode("\n", array_unique($ach)) : 'blender.exe não encontrado no disco');
}
if ($acao === 'onde') exit((achar_blender() ?: 'Blender não encontrado') . "\nusuário do PHP: " . get_current_user() . ' / ' . getenv('USERNAME') . "\natalhos:\n" . implode("\n", array_merge(glob('C:/ProgramData/Microsoft/Windows/Start Menu/Programs/Blender*/*') ?: [], glob('C:/ProgramData/Microsoft/Windows/Start Menu/Programs/Blender*') ?: [], glob('C:/Users/*/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Blender*') ?: [], glob('C:/Users/*/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/*/Blender*') ?: [])));
if ($acao === 'refinar') { // refina no Blender os modelos do sistema sem modelo real (casca suavizada + materiais PBR)
  $b = achar_blender(); if (!$b) { http_response_code(500); exit('Blender não encontrado'); }
  $ids = array_filter(array_map(fn($x) => preg_replace('/[^a-z0-9]/i', '', $x), explode(',', $_GET['ids'] ?? '505,429,407')));
  $cmd = 'start "" /B ' . escapeshellarg($b) . ' -b --factory-startup -t 4 -P ' . escapeshellarg("$raiz/ferramentas/blender_refinar.py") . ' -- ' . escapeshellarg($raiz) . ' ' . implode(' ', $ids) . ' > ' . escapeshellarg("$saida/blender_refino_log.txt") . ' 2>&1';
  pclose(popen($cmd, 'r'));
  exit('refino iniciado: ' . implode(', ', $ids));
}
if ($acao === 'refino') { $f = "$saida/blender_refino_log.txt"; exit(is_file($f) ? implode('', array_values(preg_grep('/REFINADO|SEM ARQUIVO|CONCLUIDO|Error|Traceback|rror:/', file($f)))) . "\n…" . implode('', array_slice(file($f), -3)) : 'sem log'); }
if ($acao === 'realce') { // tratamento fotográfico das imagens já prontas (leve: 2 núcleos; pode rodar junto com a fila)
  $b = achar_blender(); if (!$b) { http_response_code(500); exit('Blender não encontrado'); }
  $cmd = 'start "" /B /LOW ' . escapeshellarg($b) . ' -b --factory-startup -t 2 -P ' . escapeshellarg("$raiz/ferramentas/blender_realce.py") . ' -- ' . escapeshellarg($saida) . (empty($_GET['forcar']) ? '' : ' forcar') . ' > ' . escapeshellarg("$saida/blender_realce_log.txt") . ' 2>&1';
  pclose(popen($cmd, 'r')); exit('realce iniciado');
}
if ($acao === 'realce_log') { $f = "$saida/blender_realce_log.txt"; exit(is_file($f) ? implode('', array_values(preg_grep('/REALCE|JA FEITO|rror|Traceback/', file($f)))) . "\n…" . implode('', array_slice(file($f), -3)) : 'sem log'); }
if ($acao === 'tudo') { // refaz as fotos de ?refazer=heli_206,... e depois roda a fila inteira – tudo num processo só, em sequência
  $b = achar_blender(); if (!$b) { http_response_code(500); exit('Blender não encontrado'); }
  $amostras = max(16, min(512, (int)($_GET['amostras'] ?? 64))); $larg = max(640, min(3840, (int)($_GET['largura'] ?? 1600)));
  $partes = [];
  foreach (array_filter(array_map(fn($x) => preg_replace('/[^a-z0-9_]/i', '', $x), explode(',', $_GET['refazer'] ?? ''))) as $m)
    if (is_file("$raiz/assets/modelos3d/$m.glb")) $partes[] = escapeshellarg($b) . ' -b --factory-startup -t 4 -P ' . escapeshellarg("$raiz/ferramentas/blender_render.py") . ' -- ' . escapeshellarg("$raiz/assets/modelos3d/$m.glb") . ' ' . escapeshellarg("$raiz/assets/hdri/ambiente.hdr") . ' ' . escapeshellarg($saida) . ' ' . escapeshellarg($m) . " $amostras $larg";
  $partes[] = escapeshellarg($b) . ' -b --factory-startup -t 4 -P ' . escapeshellarg("$raiz/ferramentas/blender_render.py") . ' -- fila ' . escapeshellarg("$raiz/assets/modelos3d;$raiz/assets/modelos3d/gerados") . ' ' . escapeshellarg("$raiz/assets/hdri/ambiente.hdr") . ' ' . escapeshellarg($saida) . " $amostras $larg";
  $bat = "$saida/rodar_tudo.bat"; file_put_contents($bat, "@echo off\r\n" . implode(" > \"$saida\\blender_fila_log.txt\" 2>&1\r\n", $partes) . " > \"$saida\\blender_fila_log.txt\" 2>&1\r\n");
  pclose(popen('start "" /B /LOW cmd /c ' . escapeshellarg($bat), 'r'));
  exit('sequência iniciada: ' . count($partes) . ' etapas');
}
if ($acao === 'fila') { // renderiza todos os .glb (reais e gerados do código), um após o outro, em segundo plano
  $b = achar_blender(); if (!$b) { http_response_code(500); exit('Blender não encontrado'); }
  $amostras = max(16, min(512, (int)($_GET['amostras'] ?? 64))); $larg = max(640, min(3840, (int)($_GET['largura'] ?? 1600)));
  $pastas = "$raiz/assets/modelos3d;$raiz/assets/modelos3d/gerados";
  $cmd = 'start "" /B /LOW ' . escapeshellarg($b) . ' -b --factory-startup -t 4 -P ' . escapeshellarg("$raiz/ferramentas/blender_render.py") . ' -- fila '
    . escapeshellarg($pastas) . ' ' . escapeshellarg("$raiz/assets/hdri/ambiente.hdr") . ' ' . escapeshellarg($saida) . " $amostras $larg > " . escapeshellarg("$saida/blender_fila_log.txt") . ' 2>&1';
  pclose(popen($cmd, 'r'));
  exit("fila iniciada ($amostras amostras, {$larg}px) com $b");
}
if ($acao === 'converter') { // converte ferramentas/pacotes/<arq> (fbx/obj/glb/stl) em assets/modelos3d/<saida>.glb no Blender (nomeia as peças do rotor)
  $b = achar_blender(); if (!$b) { http_response_code(500); exit('Blender não encontrado'); }
  $arq = basename($_GET['arq'] ?? ''); $sai = preg_replace('/[^a-z0-9_]/i', '', $_GET['saida'] ?? '');
  $ent = __DIR__ . '/pacotes/' . $arq;
  if (!preg_match('/\.(fbx|obj|glb|gltf|stl)$/i', $arq) || !is_file($ent) || !$sai) { http_response_code(400); exit('arquivo ou saída inválidos'); }
  $cred = substr(preg_replace('/[^\w .,()@:\/\-–]/u', '', $_GET['credito'] ?? ''), 0, 200);
  $log = "$saida/blender_converter_log.txt";
  $cmd = escapeshellarg($b) . ' -b --factory-startup -t 4 -P ' . escapeshellarg(__DIR__ . '/blender_converter.py') . ' -- ' . escapeshellarg($ent) . ' ' . escapeshellarg("$raiz/assets/modelos3d/$sai.glb") . ' ' . escapeshellarg($cred) . ' > ' . escapeshellarg($log) . ' 2>&1';
  shell_exec($cmd); // conversão curta: espera terminar
  $l = is_file($log) ? file($log) : [];
  exit(implode('', array_values(preg_grep('/CONVERTIDO|NOMES|Error|Traceback|não suportado/', $l))) ?: 'sem saída (veja blender_converter_log.txt)');
}
if ($acao === 'lote') { // vários modelos em sequência num Blender à parte (ex.: do fim da lista para o começo, enquanto a fila vem do começo)
  $b = achar_blender(); if (!$b) { http_response_code(500); exit('Blender não encontrado'); }
  $amostras = max(16, min(512, (int)($_GET['amostras'] ?? 64))); $larg = max(640, min(3840, (int)($_GET['largura'] ?? 1600)));
  $partes = []; $nomes = [];
  foreach (array_filter(array_map(fn($x) => preg_replace('/[^a-z0-9_\-]/i', '', $x), explode(',', $_GET['modelos'] ?? ''))) as $m) {
    $glb = is_file("$raiz/assets/modelos3d/$m.glb") ? "$raiz/assets/modelos3d/$m.glb" : (is_file("$raiz/assets/modelos3d/gerados/$m.glb") ? "$raiz/assets/modelos3d/gerados/$m.glb" : null);
    if (!$glb) continue; $nomes[] = $m;
    $partes[] = escapeshellarg($b) . ' -b --factory-startup -t 4 -P ' . escapeshellarg("$raiz/ferramentas/blender_render.py") . ' -- ' . escapeshellarg($glb) . ' ' . escapeshellarg("$raiz/assets/hdri/ambiente.hdr") . ' ' . escapeshellarg($saida) . ' ' . escapeshellarg($m) . " $amostras $larg faltam > \"$saida\\blender_log_$m.txt\" 2>&1";
  }
  if (!$partes) exit('nenhum modelo encontrado');
  $bat = "$saida/rodar_lote.bat"; file_put_contents($bat, "@echo off\r\n" . implode("\r\n", $partes) . "\r\n");
  pclose(popen('start "" /B /LOW cmd /c ' . escapeshellarg($bat), 'r'));
  exit('lote iniciado: ' . implode(', ', $nomes));
}
if ($acao === 'render') {
  $b = achar_blender(); if (!$b) { http_response_code(500); exit('Blender não encontrado'); }
  $m = preg_replace('/[^a-z0-9_]/i', '', $_GET['modelo'] ?? 'heli_206');
  $glb = "$raiz/assets/modelos3d/$m.glb"; if (!is_file($glb)) { http_response_code(404); exit("sem $m.glb"); }
  $amostras = max(16, min(512, (int)($_GET['amostras'] ?? 96))); $larg = max(640, min(3840, (int)($_GET['largura'] ?? 1920)));
  $cmd = 'start "" /B /LOW ' . escapeshellarg($b) . ' -b --factory-startup -t 4 -P ' . escapeshellarg("$raiz/ferramentas/blender_render.py") . ' -- '
    . escapeshellarg($glb) . ' ' . escapeshellarg("$raiz/assets/hdri/ambiente.hdr") . ' ' . escapeshellarg($saida) . ' ' . escapeshellarg($m) . " $amostras $larg" . (empty($_GET['faltam']) ? '' : ' faltam') . " > " . escapeshellarg("$saida/blender_log_$m.txt") . ' 2>&1';
  pclose(popen($cmd, 'r'));
  exit("render iniciado: $m ($amostras amostras, {$larg}px) com $b");
}
$ok = array_map(fn($f) => basename($f) . ' ' . round(filesize($f) / 1024) . ' KB', glob("$saida/*.png") ?: []);
$l = is_file($log) ? implode('', array_slice(file($log), -12)) : 'sem log';
foreach (glob("$saida/blender_log_*.txt") ?: [] as $f) $l .= "\n[" . basename($f, '.txt') . "]\n" . implode('', array_values(preg_grep('/RENDER OK|OCUPADO|ERRO|Error|Traceback/', file($f)))) . implode('', array_slice(file($f), -1));
$fl = "$saida/blender_fila_log.txt"; if (is_file($fl)) $l .= "\n[fila]\n" . implode('', array_values(preg_grep('/^(INICIO|JA FEITO|OCUPADO|ERRO|FILA|RENDER OK)/', file($fl)))) . implode('', array_slice(file($fl), -2));
echo "prontos:\n" . implode("\n", $ok) . "\n\nlog:\n$l";
