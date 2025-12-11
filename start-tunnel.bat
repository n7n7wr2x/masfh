@echo off
echo Starting Public Tunnel...
echo This will try to reserve: https://fahad-salla-store.loca.lt
echo.
echo If this URL works, use it for all your Salla/Meta webhooks.
echo.
call npx localtunnel --port 3000 --subdomain fahad-salla-store
pause
