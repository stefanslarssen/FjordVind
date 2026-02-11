@echo off
setlocal

echo Setting up build environment...

REM Visual Studio Build Tools paths
set "VSTOOLS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207"
set "WINSDK=C:\Program Files (x86)\Windows Kits\10"
set "WINSDKVER=10.0.26100.0"

REM Set environment variables
set "PATH=%VSTOOLS%\bin\HostX64\x64;%USERPROFILE%\.cargo\bin;%PATH%"
set "LIB=%VSTOOLS%\lib\x64;%WINSDK%\Lib\%WINSDKVER%\um\x64;%WINSDK%\Lib\%WINSDKVER%\ucrt\x64"
set "INCLUDE=%VSTOOLS%\include;%WINSDK%\Include\%WINSDKVER%\ucrt;%WINSDK%\Include\%WINSDKVER%\um;%WINSDK%\Include\%WINSDKVER%\shared"

REM Change to project directory
cd /d "C:\Users\Stefa\Prosjekt folder\lusevokteren-web"

REM Clean previous build
echo Cleaning previous build...
rmdir /s /q src-tauri\target 2>nul

echo Building Tauri app...
npm run tauri build

echo.
echo Build complete!
pause
