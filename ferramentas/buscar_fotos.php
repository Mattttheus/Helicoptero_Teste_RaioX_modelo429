<?php
// Busca fotos reais de cada helicóptero e motor no Wikimedia Commons, SÓ com licença livre (domínio público, CC0, CC BY, CC BY-SA),
// e guarda em assets/fotos/<chave>/ com autor, licença e link de origem (creditos.json). Só localhost + código.
header('Content-Type: text/plain; charset=utf-8');
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || ($_GET['ok'] ?? '') !== 'MI-FOTOS-20261120') { http_response_code(403); exit('negado'); }
set_time_limit(1200);
const ALVOS = [
  'heli_505' => ['"Bell 505"', '"Jet Ranger X"'], 'heli_429' => ['"Bell 429"'], 'heli_206' => ['"Bell 206B"', '"Bell 206" JetRanger'],
  'heli_407' => ['"Bell 407"'], 'heli_206L4' => ['"Bell 206L-4"', '"LongRanger IV"', '"Bell 206L" LongRanger'], 'heli_230' => ['"Bell 230"'], 'heli_430' => ['"Bell 430"'],
  'motor_arrius-2r' => ['Turbomeca Arrius', 'Safran Arrius', '"Arrius 2"', 'Arrius turboshaft'], 'motor_pw207d1' => ['PW200 engine', '"PW207"', '"PW206"', 'Pratt Whitney Canada PW200'], 'motor_250-c20j' => ['"250-C20"', 'Allison 250 engine', 'Allison T63 engine'],
  'motor_m250-c47' => ['"250-C47"', '"Rolls-Royce M250"', '"Allison 250"', 'Allison T63 engine'], 'motor_250-c30p' => ['"250-C30"', '"Allison 250"', '"Rolls-Royce 250"'],
  'motor_250-c30g2' => ['"250-C30"', '"Allison 250"', 'Allison Model 250 turboshaft'], 'motor_250-c40b' => ['"250-C40"', '"Allison 250"', '"Rolls-Royce 250"', 'Allison T63 engine'],
];
const MAX = 6;
// o título do arquivo precisa casar com o filtro do alvo (evita fotos de outra coisa com o mesmo nome)
const ENG = '/(engine|moteur|motor|turboshaft|turboprop|turbine|triebwerk)/i';
const FILTRO = [
  'heli_505' => ['/\b505\b|jet ?ranger ?x/i'], 'heli_429' => ['/\b429\b|globalranger/i'], 'heli_206' => ['/206 ?b|jet ?ranger|\b206\b(?!l)/i'],
  'heli_407' => ['/\b407/i'], 'heli_206L4' => ['/206 ?l-?4|long ?ranger iv/i'], 'heli_230' => ['/\b230\b|\b222\b/i'], 'heli_430' => ['/\b430\b/i'],
  'motor_arrius-2r' => ['/turbomeca arrius|safran arrius|arrius ?[12][a-z0-9]*\\b(?! ?\\()/i', '!/g[öo]ran|bust|roma|bishop|circuits|claveries|blason|libellus/i'], 'motor_pw207d1' => ['/pw ?20[0-9]|pw200|ec ?135 p2\\+? .*tour de sky 2014-08-10 06/i', '!/f100|pw ?20[0-9]{2}|helicopter|hubschrauber|h[ée]licopt|explorer|agusta/i'],
  'motor_250-c20j' => ['/250|t63/i', ENG, '!/accident|crash|wreck|glacier|épave|epave/i'], 'motor_m250-c47' => ['/250|t63/i', ENG, '!/accident|crash|wreck|glacier|épave|epave/i'], 'motor_250-c30p' => ['/250|t63/i', ENG, '!/accident|crash|wreck|glacier|épave|epave/i'],
  'motor_250-c30g2' => ['/250|t63/i', ENG, '!/accident|crash|wreck|glacier|épave|epave/i'], 'motor_250-c40b' => ['/250|t63/i', ENG, '!/accident|crash|wreck|glacier|épave|epave/i'],
];
const NOTA = ['heli_230' => 'Bell 222 = aeronave-base do Bell 230 (mesma família)', 'motor_250-c20j' => 'Família Rolls-Royce/Allison 250', 'motor_m250-c47' => 'Família Rolls-Royce/Allison 250',
  'motor_250-c30p' => 'Família Rolls-Royce/Allison 250', 'motor_250-c30g2' => 'Família Rolls-Royce/Allison 250', 'motor_250-c40b' => 'Família Rolls-Royce/Allison 250', 'motor_pw207d1' => 'Família Pratt & Whitney Canada PW200 (PW206B no EC135)', 'motor_arrius-2r' => 'Família Turbomeca/Safran Arrius'];
function passa($chave, $titulo) {
  foreach (FILTRO[$chave] ?? [] as $f) { $neg = $f[0] === '!'; $ok = preg_match($neg ? substr($f, 1) : $f, $titulo); if ($neg ? $ok : !$ok) return false; }
  return true;
}
function http($url) {
  $c = curl_init($url);
  curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60,
    CURLOPT_USERAGENT => 'ManutencaoInterativa/1.0 (uso interno; contato local)', CURLOPT_SSL_OPTIONS => defined('CURLSSLOPT_NATIVE_CA') ? CURLSSLOPT_NATIVE_CA : 16]);
  $r = curl_exec($c); $cod = curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c); return $cod == 200 ? $r : null;
}
function livre($lic) { return (bool)preg_match('/^(cc0|public domain|pd|cc by(-sa)? [0-9.]+|cc by(-sa)?$|cc-by(-sa)?-[0-9.]+)/i', trim($lic)); }
$so = $_GET['so'] ?? '';
$raiz = realpath(__DIR__ . '/..') . '/assets/fotos';
$res = [];
foreach (ALVOS as $chave => $buscas) {
  if ($so && $so !== $chave) continue;
  $dir = "$raiz/$chave"; @mkdir($dir, 0777, true);
  $cred = is_file("$dir/creditos.json") ? (json_decode(file_get_contents("$dir/creditos.json"), true) ?: []) : [];
  // revisão: o que não passa no filtro vai para assets/fotos/_descartadas (nada é apagado)
  $mantidas = [];
  foreach ($cred as $c) {
    if (passa($chave, $c['titulo'])) { $c['nota'] = NOTA[$chave] ?? ''; $mantidas[] = $c; continue; }
    @mkdir("$raiz/_descartadas", 0777, true); if (is_file("$dir/{$c['arquivo']}")) { $dest = "$raiz/_descartadas/{$chave}_{$c['arquivo']}"; if (is_file($dest)) $dest = "$raiz/_descartadas/{$chave}_" . date('His') . "_{$c['arquivo']}"; @rename("$dir/{$c['arquivo']}", $dest); }
  }
  $cred = $mantidas;
  $vistos = array_column($cred, 'titulo');
  foreach ($buscas as $q) {
    if (count($cred) >= MAX) break;
    $api = 'https://commons.wikimedia.org/w/api.php?' . http_build_query(['action' => 'query', 'format' => 'json', 'generator' => 'search', 'gsrnamespace' => 6,
      'gsrsearch' => "$q filetype:bitmap", 'gsrlimit' => 25, 'prop' => 'imageinfo', 'iiprop' => 'url|extmetadata|size', 'iiurlwidth' => 1600]);
    $j = json_decode((string)http($api), true);
    foreach (($j['query']['pages'] ?? []) as $p) {
      if (count($cred) >= MAX) break;
      $ii = $p['imageinfo'][0] ?? null; if (!$ii || in_array($p['title'], $vistos)) continue;
      if (($ii['width'] ?? 0) < 800 || !passa($chave, $p['title'])) continue;
      $m = $ii['extmetadata'] ?? []; $lic = strip_tags($m['LicenseShortName']['value'] ?? '');
      if (!livre($lic)) continue;
      $img = http($ii['thumburl'] ?? $ii['url']); if (!$img || strlen($img) < 20000) continue;
      $k = 1; while (is_file(sprintf("$dir/%02d.jpg", $k))) $k++; $n = sprintf('%02d.jpg', $k); file_put_contents("$dir/$n", $img);
      $cred[] = ['arquivo' => $n, 'titulo' => $p['title'], 'autor' => trim(strip_tags($m['Artist']['value'] ?? 'desconhecido')), 'licenca' => $lic,
        'link_licenca' => $m['LicenseUrl']['value'] ?? '', 'origem' => $ii['descriptionurl'] ?? '', 'nota' => NOTA[$chave] ?? '', 'descricao' => trim(mb_substr(strip_tags($m['ImageDescription']['value'] ?? ''), 0, 200))];
      $vistos[] = $p['title'];
    }
  }
  file_put_contents("$dir/creditos.json", json_encode($cred, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
  $res[] = "$chave: " . count($cred) . ' fotos';
}
echo implode("\n", $res);
