@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================================
echo  Manutencao Interativa - limpeza (sem perguntas)
echo  Move arquivos antigos/duplicados para _para_excluir. Nada e apagado.
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0reorganizar.ps1"
echo.
echo Concluido. Log em ferramentas\reorganizar_log.txt
timeout /t 20
