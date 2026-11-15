<?php
/* Bell 429 – entrada de telemetria IoT (demonstração, uso na rede local pelo WAMP).
   GET  api/telemetria.php            -> últimas leituras em JSON
   POST api/telemetria.php            -> corpo JSON {"leituras": {"temp_trans": 92.4, "chip_trans": 0}}
   O acesso já é limitado à rede 192.168.1.x pelo Apache. Para exigir uma chave nos envios,
   preencha CHAVE abaixo e mande o cabeçalho  X-Chave: <valor>  no POST. */
const CHAVE = '';
const ARQUIVO = __DIR__ . '/dados/telemetria.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function responder(int $codigo, array $corpo): void {
    http_response_code($codigo);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
    exit;
}
function ler(): array {
    if (!is_file(ARQUIVO)) return ['leituras' => new stdClass()];
    $d = json_decode((string) file_get_contents(ARQUIVO), true);
    return is_array($d) && isset($d['leituras']) ? $d : ['leituras' => []];
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
    $d = ler();
    $d['agora'] = time();
    responder(200, $d);
}

if ($metodo !== 'POST') responder(405, ['erro' => 'Use GET ou POST.']);
if (CHAVE !== '' && !hash_equals(CHAVE, $_SERVER['HTTP_X_CHAVE'] ?? '')) responder(401, ['erro' => 'Chave inválida.']);

$bruto = file_get_contents('php://input', false, null, 0, 20000);
$dados = json_decode((string) $bruto, true);
if (!is_array($dados)) responder(400, ['erro' => 'Corpo deve ser JSON.']);
$novas = $dados['leituras'] ?? $dados;
if (!is_array($novas)) responder(400, ['erro' => 'Campo "leituras" inválido.']);

$atual = ler();
$leituras = is_array($atual['leituras']) ? $atual['leituras'] : [];
$aceitas = 0;
foreach ($novas as $id => $valor) {
    if (!is_string($id) || !preg_match('/^[a-z0-9_]{1,40}$/', $id) || !is_numeric($valor)) continue;
    $leituras[$id] = ['v' => (float) $valor, 't' => time()];
    $aceitas++;
}
if (!$aceitas) responder(400, ['erro' => 'Nenhuma leitura válida (id em minúsculas/números/_ e valor numérico).']);
if (count($leituras) > 200) responder(400, ['erro' => 'Sensores demais.']);

if (!is_dir(dirname(ARQUIVO))) mkdir(dirname(ARQUIVO), 0775, true);
file_put_contents(ARQUIVO, json_encode(['leituras' => $leituras], JSON_UNESCAPED_UNICODE), LOCK_EX);
responder(200, ['ok' => true, 'aceitas' => $aceitas]);
