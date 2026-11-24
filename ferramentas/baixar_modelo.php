<?php
// Baixa modelos 3D abertos para assets/modelos3d/fonte/ (só localhost + código). ?qual=206 | 222 | 430
header('Content-Type: text/plain; charset=utf-8');
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || ($_GET['ok'] ?? '') !== 'MI-MODELO-20261120') { http_response_code(403); exit('negado'); }
set_time_limit(900);
$FONTES = [
  '206' => ['Bell-206-JetRanger.zip', 'https://mirrors.ibiblio.org/flightgear/ftp/Aircraft-2020/Bell-206-JetRanger.zip', 'FlightGear (GPL v2)'],
  '222' => ['Bell-222X.zip', 'https://mirrors.ibiblio.org/flightgear/ftp/Aircraft-2020/Bell-222X.zip', 'FlightGear (GPL v2)'],
  '430' => ['Bell-430-FGUK.zip', 'https://drive.usercontent.google.com/download?id=0BwipCEeezJP1ajNHS2pVQzVRR28&resourcekey=0-TWvSQ8ofQCoHLB3wRUEf3w&export=download&confirm=t', 'FGUK hangar (licença a confirmar no pacote)'],
];
$q = $_GET['qual'] ?? '206'; if (!isset($FONTES[$q])) { http_response_code(400); exit('modelo desconhecido'); }
[$arq, $url, $lic] = $FONTES[$q];
$dest = realpath(__DIR__ . '/..') . '/assets/modelos3d/fonte'; @mkdir($dest, 0777, true);
$fp = fopen("$dest/$arq", 'wb');
$c = curl_init($url);
curl_setopt_array($c, [CURLOPT_FILE => $fp, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 850, CURLOPT_USERAGENT => 'ManutencaoInterativa/1.0',
  CURLOPT_SSL_OPTIONS => defined('CURLSSLOPT_NATIVE_CA') ? CURLSSLOPT_NATIVE_CA : 16]);
$ok = curl_exec($c); $cod = curl_getinfo($c, CURLINFO_HTTP_CODE); $err = curl_error($c); curl_close($c); fclose($fp);
$tam = filesize("$dest/$arq"); $cab = file_get_contents("$dest/$arq", false, null, 0, 4);
file_put_contents("$dest/FONTE.txt", "$arq – $lic – $url – baixado em " . date('Y-m-d H:i') . "\n", FILE_APPEND);
echo $ok && $cod == 200 ? "ok $arq " . round($tam / 1048576, 1) . ' MB' . ($cab === "PK\x03\x04" ? ' (zip)' : ' (NÃO é zip: ' . bin2hex($cab) . ')') : "falhou http $cod $err";
