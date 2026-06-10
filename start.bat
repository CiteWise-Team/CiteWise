@echo off
setlocal

pushd "%~dp0"

echo Starting CiteWise (merged app)...
echo   Backend  -> http://localhost:8081
echo   Frontend -> http://localhost:5173
echo.

start "CiteWise API (port 8081)"      cmd /k "cd /d api  && npm run dev"
start "CiteWise Web (port 5173)"      cmd /k "cd /d web  && npm run dev"

popd
endlocal
