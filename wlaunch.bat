@echo off

REM Launch PowerShell and execute the commands to kill processes
powershell -Command "netstat -ano | findstr ':5556 :3000 :3001 :5000 :5001 :5002' | ForEach-Object { ($_ -split '\s+')[5] } | Select-Object -Unique | ForEach-Object { taskkill /PID $_ /F }"

REM Launch the first terminal for Proxy Setup
start wt new-tab -p "Ubuntu" --title "Proxy" wsl -e bash -c "cd src && npm install && cd proxy && npm start"

REM Launch the second terminal for Client on Port 3000
start wt new-tab -p "Ubuntu" --title "Client on Port 3000" wsl -e bash -c "cd src/client && npm start 3000"

REM Launch the third terminal for Client on Port 3001
start wt new-tab -p "Ubuntu" --title "Client on Port 3001" wsl -e bash -c "cd src/client && npm start 3001"

REM Launch the fourth terminal for Server on Port 5000
start wt new-tab -p "Ubuntu" --title "Server" wsl -e bash -c "cd src/server && npm start 5000"

REM Launch the fifth terminal for Server on Port 5001
start wt new-tab -p "Ubuntu" --title "Server" wsl -e bash -c "cd src/server && npm start 5001"

REM Launch the sixth terminal for Server on Port 5002
start wt new-tab -p "Ubuntu" --title "Server" wsl -e bash -c "cd src/server && npm start 5002"