@echo off
setlocal
if not defined JAVA_HOME (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    )
)
echo [1/3] Building Vite web assets...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo [2/3] Syncing with Capacitor Android...
call npx cap sync android
if %errorlevel% neq 0 exit /b %errorlevel%

REM Clear OneDrive ReparsePoint attributes on synced assets
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0clean-assets.ps1"

REM Clean intermediates to avoid Windows/OneDrive file locks
if exist "android\app\build\intermediates" (
    rmdir /s /q "android\app\build\intermediates" >nul 2>&1
)

echo [3/3] Compiling Android APK...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo =================================================================
echo APK built successfully!
echo Output: android\app\build\outputs\apk\debug\app-debug.apk
echo =================================================================
