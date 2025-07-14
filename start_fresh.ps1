$frontendPort = 3000
$backendPort = 5000

Write-Host "Checking for running frontend (port $frontendPort) and backend (port $backendPort) processes..."

# Kill frontend
$frontendProc = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($frontendProc) {
    Write-Host "Killing frontend process on port $frontendPort..."
    Stop-Process -Id $frontendProc -Force
}

# Kill backend
$backendProc = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($backendProc) {
    Write-Host "Killing backend process on port $backendPort..."
    Stop-Process -Id $backendProc -Force
}

# Start backend as a module
Write-Host "Starting backend..."
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m backend.app"
Start-Sleep -Seconds 3

# Start frontend using npm.cmd for Windows
Write-Host "Starting frontend..."
Start-Process -NoNewWindow -WorkingDirectory "frontend" -FilePath "npm.cmd" -ArgumentList "start"
Start-Sleep -Seconds 10

# Validate backend
$backendReady = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:$backendPort/api/jobs" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $backendReady = $true
        Write-Host "Backend is up!"
        break
    }
    catch {}
    Start-Sleep -Seconds 2
}
if (-not $backendReady) { Write-Host "Backend did not start!"; exit 1 }

# Validate frontend
$frontendReady = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:$frontendPort" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $frontendReady = $true
        Write-Host "Frontend is up!"
        break
    }
    catch {}
    Start-Sleep -Seconds 2
}
if (-not $frontendReady) { Write-Host "Frontend did not start!"; exit 1 }

Write-Host "All services are up and running! 🚀"