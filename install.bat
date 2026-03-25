@echo off
setlocal

echo "🐍 Installing Denner CLI..."

:: Define installation directory
set "BIN_DIR=%USERPROFILE%\.denner\bin"
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

:: Define target executable path
set "DEST=%BIN_DIR%\denner.exe"
:: Ensure we use the exact name expected in the GitHub Release
set "URL=https://github.com/rits1019c1/denner/releases/latest/download/denner-win-x64.exe"

echo "🔄 Downloading denner-win-x64.exe from GitHub..."
curl -fsSL -o "%DEST%" "%URL%"

if %ERRORLEVEL% neq 0 (
    echo "❌ Failed to download the Denner executable. Please make sure you are connected to the Internet or the URL is correct."
    exit /b 1
)

echo "🔗 Adding %BIN_DIR% to PATH..."
:: Check if BIN_DIR is already in PATH
echo %PATH% | findstr /I /C:"%BIN_DIR%" >nul
if errorlevel 1 (
    setx PATH "%PATH%;%BIN_DIR%"
    echo "⚠️  PATH updated. Please restart your terminal/command prompt to apply changes."
) else (
    echo "✅ Denner is already in your PATH."
)

echo.
echo "✨ ----------------------------------------- ✨"
echo "✅ Denner CLI has been successfully installed!"
echo "✨ ----------------------------------------- ✨"
echo.
echo "Try it out:"
echo "  > denner run my_script.den"
echo "  > denner update"
echo.

endlocal
pause
