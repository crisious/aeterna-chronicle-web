@echo off
REM === Aeterna Windows symlink to junction setup ===
REM
REM Linux/macOS git symlinks become text files on Windows.
REM Vite/integration tests fail to follow them, causing 12 missing-asset
REM errors in tests/integration/asset-integrity.test.ts.
REM
REM This script removes those text files and replaces them with NTFS
REM junctions (no admin required), idempotent (skip if already junction).
REM
REM Usage:
REM   scripts\setup-windows-symlinks.cmd
REM
REM Verify:
REM   npx vitest run tests/integration/asset-integrity.test.ts

setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
pushd "%REPO_ROOT%" >nul

echo === Aeterna Windows symlink to junction setup ===
echo repo: %CD%
echo.

call :ensure_junction "client\public\assets\generated"      "%REPO_ROOT%\assets\generated"
call :ensure_junction "client\public\assets\resources"      "%REPO_ROOT%\unity-client\Assets\Resources"

echo.
echo === Done. ===
echo verify: npx vitest run tests/integration/asset-integrity.test.ts

popd >nul
exit /b 0


REM --- helper: ensure_junction ---
REM   %~1 = link path (repo-relative)
REM   %~2 = target (relative to link's parent)
:ensure_junction
set "LINK=%~1"
set "TARGET=%~2"

if exist "%LINK%" (
  fsutil reparsepoint query "%LINK%" >nul 2>&1
  if !errorlevel! equ 0 (
    echo   [skip] %LINK% already a junction
    exit /b 0
  )
  if exist "%LINK%\*" (
    echo   [warn] %LINK% is a real directory - manual cleanup required, skipping
    exit /b 0
  )
  del /f /q "%LINK%" >nul 2>&1
)

for %%P in ("%LINK%") do (
  if not exist "%%~dpP" mkdir "%%~dpP" >nul 2>&1
)

mklink /J "%LINK%" "%TARGET%" >nul 2>&1
if !errorlevel! equ 0 (
  echo   [ok]   %LINK%  -^>  %TARGET%
) else (
  echo   [fail] %LINK% ^(target "%TARGET%" missing or permission issue^)
)
exit /b 0
