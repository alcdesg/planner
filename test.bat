@echo off
title Testes do Organizador Semanal
cls
echo ======================================================
echo  Executando Suite de Testes do Organizador Semanal
echo ======================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [Node.js detectado] Executando testes no terminal...
    echo.
    node tests/run_tests.js
) else (
    echo [Node.js nao instalado no PATH]
    echo Abrindo suite de testes automatizados diretamente no seu navegador...
    echo.
    start test.html
    echo Testes abertos no navegador com sucesso!
)

echo.
echo Pressione qualquer tecla para sair...
pause >nul
