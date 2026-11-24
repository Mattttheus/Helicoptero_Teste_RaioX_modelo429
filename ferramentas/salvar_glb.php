<?php
// Recebe um .glb exportado pelo navegador (ferramentas/exportar_modelos.html) e grava em assets/modelos3d/gerados/. Só localhost + código.
header('Content-Type: text/plain; charset=utf-8');
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || ($_GET['ok'] ?? '') !== 'MI-BLENDER-20261120') { http_response_code(403); exit('negado'); }
$nome = preg_replace('/[^a-z0-9_\-]/i', '', $_GET['nome'] ?? '');
if ($nome === '') { http_response_code(400); exit('nome inválido'); }
$dados = file_get_contents('php://input');
if (strlen($dados) < 100 || strlen($dados) > 80 * 1048576 || substr($dados, 0, 4) !== 'glTF') { http_response_code(400); exit('arquivo inválido'); }
$dir = realpath(__DIR__ . '/..') . '/assets/modelos3d/gerados'; @mkdir($dir, 0777, true);
file_put_contents("$dir/$nome.glb", $dados);
echo "ok $nome.glb " . round(strlen($dados) / 1048576, 2) . ' MB';
