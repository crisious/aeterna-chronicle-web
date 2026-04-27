# qa-runner.ps1 — Claude Code 자동 QA
$repo = "C:\fork\aeterna-chronicle-web2"
Set-Location $repo

Write-Host "=== Aeterna Chronicle QA ===" -ForegroundColor Cyan

# 1. TypeScript
Write-Host "[1/3] TypeScript Check..." -ForegroundColor Yellow
$sErr = (& npx tsc --noEmit --project server\tsconfig.json 2>&1 | Select-String "error TS" | Measure-Object).Count
$cErr = (& npx tsc --noEmit --project client\tsconfig.json 2>&1 | Select-String "error TS" | Measure-Object).Count
Write-Host "  Server: $sErr | Client: $cErr"

# 2. Claude Code AI QA (bypassPermissions로 파일 접근 허용)
Write-Host "[2/3] Claude Code QA..." -ForegroundColor Yellow
$qaResult = & claude --permission-mode bypassPermissions --print "You are QA for Aeterna Chronicle (Fastify+Phaser.js RPG) at C:\fork\aeterna-chronicle-web2. Read server/src and client/src. Report in Korean: 1) Critical bugs 2) Security issues 3) Runtime crash risks. Max 10 items." 2>&1 | Out-String

# 3. 결과
Write-Host "[3/3] Result" -ForegroundColor Green
Write-Host "TS: Server=$sErr Client=$cErr"
Write-Host $qaResult
