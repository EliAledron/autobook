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

REM Clear OneDrive ReparsePoint attributes on synced assets so Gradle snapshotter succeeds
powershell -NoProfile -Command "Get-ChildItem -Path 'android\app\src\main\assets' -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { if ($_.Attributes -match 'ReparsePoint') { [System.IO.File]::WriteAllBytes($_.FullName, [System.IO.File]::ReadAllBytes($_.FullName)) } }"

echo [3/3] Compiling Android APK...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo =================================================================
echo APK built successfully!
echo Output: android\app\build\outputs\apk\debug\app-debug.apk
echo =================================================================
