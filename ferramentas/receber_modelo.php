<?php
// HeliSense 3D – recebe, na rede local, um modelo 3D que o próprio usuário baixou logado no site do autor
// (Sketchfab / Creality Cloud) e grava em ferramentas/pacotes/. Só extensões de modelo 3D; nada sai do computador.
$origens = ['https://sketchfab.com', 'https://www.crealitycloud.com', 'https://crealitycloud.com'];
$o = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($o, $origens, true)) {
  header("Access-Control-Allow-Origin: $o");
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Private-Network: true');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
header('Content-Type: text/plain; charset=utf-8');
if (($_GET['ok'] ?? '') !== 'HS-MODELO-20261121') { http_response_code(403); exit('codigo invalido'); }
$nome = basename($_GET['arq'] ?? '');
if (!preg_match('/^[\w.-]{1,80}\.(glb|gltf|zip|fbx|obj|stl|3mf)$/i', $nome)) { http_response_code(400); exit('nome invalido'); }
$dados = file_get_contents('php://input');
if (strlen($dados) < 100 || strlen($dados) > 300 * 1024 * 1024) { http_response_code(400); exit('tamanho invalido'); }
$dir = __DIR__ . '/pacotes'; if (!is_dir($dir)) mkdir($dir, 0775, true);
file_put_contents("$dir/$nome", $dados);
echo "RECEBIDO $nome " . strlen($dados) . " bytes";
