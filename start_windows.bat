@echo off
setlocal

echo ========================================
echo Nelamar Stock baslatiliyor
echo ========================================
echo.

if not exist .venv\Scripts\activate.bat (
    echo HATA: Sanal ortam bulunamadi.
    echo Once setup_windows.bat dosyasini calistirin.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo HATA: Sanal ortam aktif edilemedi.
    pause
    exit /b 1
)

echo Django gelistirme sunucusu sadece lokal adres uzerinde acilacak:
echo http://127.0.0.1:8000/
echo.
echo Kapatmak icin bu pencerede CTRL+C yapin.
echo.
python manage.py runserver 127.0.0.1:8000
