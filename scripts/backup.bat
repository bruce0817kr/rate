@echo off
REM DB Backup Script for rate_db (Windows)
REM Usage: backup.bat [backup_dir]

set BACKUP_DIR=%1
if "%BACKUP_DIR%"=="" set BACKUP_DIR=.\backups
if "%POSTGRES_CONTAINER%"=="" set POSTGRES_CONTAINER=rate-postgres
if "%RATE_DB_USERNAME%"=="" set RATE_DB_USERNAME=rate_user
if "%RATE_DB_NAME%"=="" set RATE_DB_NAME=rate_db

set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\%RATE_DB_NAME%_%TIMESTAMP%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Starting database backup...
echo Backup directory: %BACKUP_DIR%
echo Backup file: %BACKUP_FILE%

docker exec %POSTGRES_CONTAINER% pg_dump -U %RATE_DB_USERNAME% -d %RATE_DB_NAME% > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo Backup completed successfully!
    echo File size:
    dir "%BACKUP_FILE%" | find "rate_db"
    
    echo.
    echo Cleaning up old backups ^(keeping last 10^)...
    powershell -Command "Get-ChildItem '%BACKUP_DIR%\%RATE_DB_NAME%_*.sql' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 | Remove-Item -Force"
    
    echo.
    echo Current backups:
    dir /b "%BACKUP_DIR%\%RATE_DB_NAME%_*.sql"
) else (
    echo Backup failed!
    del "%BACKUP_FILE%" 2>nul
    exit /b 1
)
