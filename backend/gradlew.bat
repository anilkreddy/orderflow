@echo off
setlocal

set SCRIPT_DIR=%~dp0
set GRADLE_VERSION=9.5.0
set DIST_NAME=gradle-%GRADLE_VERSION%-bin
set DIST_URL=https://services.gradle.org/distributions/%DIST_NAME%.zip
set CACHE_DIR=%USERPROFILE%\.gradle\wrapper\dists\%DIST_NAME%
set INSTALL_DIR=%CACHE_DIR%\gradle-%GRADLE_VERSION%
set ZIP_PATH=%CACHE_DIR%\%DIST_NAME%.zip

if not exist "%INSTALL_DIR%\bin\gradle.bat" (
  if not exist "%CACHE_DIR%" mkdir "%CACHE_DIR%"
  if not exist "%ZIP_PATH%" (
    powershell -Command "Invoke-WebRequest -Uri '%DIST_URL%' -OutFile '%ZIP_PATH%'"
  )
  if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
  powershell -Command "Expand-Archive -LiteralPath '%ZIP_PATH%' -DestinationPath '%CACHE_DIR%' -Force"
)

call "%INSTALL_DIR%\bin\gradle.bat" -p "%SCRIPT_DIR%" %*
