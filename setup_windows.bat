@echo off
setlocal

echo ========================================
echo Nelamar Stock - Windows ilk kurulum
echo ========================================
echo.

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=py -3
) else (
    set PYTHON_CMD=python
)

%PYTHON_CMD% --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo HATA: Python bulunamadi.
    echo Lutfen Python 3.11 veya daha yeni bir surum kurun ve tekrar deneyin.
    echo Python kurulumunda "Add Python to PATH" secenegini isaretleyin.
    pause
    exit /b 1
)

echo [1/5] Sanal ortam hazirlaniyor...
if not exist .venv (
    %PYTHON_CMD% -m venv .venv
    if %ERRORLEVEL% NEQ 0 goto error
) else (
    echo .venv zaten var, bu adim atlandi.
)

echo [2/5] Sanal ortam aktif ediliyor...
call .venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 goto error

echo [3/5] Paketler yukleniyor...
python -m pip install --upgrade pip
if %ERRORLEVEL% NEQ 0 goto error
python -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 goto error

echo [4/5] .env dosyasi kontrol ediliyor...
if not exist .env (
    copy .env.example .env >nul
    echo .env dosyasi .env.example dosyasindan olusturuldu.
    echo Lutfen .env icindeki DJANGO_SECRET_KEY degerini daha sonra guclu bir degerle degistirin.
) else (
    echo .env zaten var, bu adim atlandi.
)

echo [5/5] Veritabani hazirlaniyor...
python manage.py migrate
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo ========================================
echo Kurulum tamamlandi.
echo ========================================
echo.
echo SIRADAKI ADIM: Admin kullanici olusturun.
echo Admin hesabi olmadan programa giris yapamazsiniz.
echo Komut: python manage.py createsuperuser
echo.
echo Ornek:
echo     Username: admin
echo     Email address: admin@example.local
echo     Password: guclu-bir-sifre-yazin
echo.
set /p CREATE_ADMIN=Simdi admin kullanici olusturma komutunu baslatmak ister misiniz? (E/H):
if /I "%CREATE_ADMIN%"=="E" (
    python manage.py createsuperuser
) else (
    echo Admin kullaniciyi daha sonra olusturmak icin su komutu calistirin:
    echo     python manage.py createsuperuser
)
echo.
echo Admin kullaniciyi olusturduktan sonra programi acmak icin:
echo     start_windows.bat
echo.
echo Not: Gercek sirket verisi, gercek Excel, gercek musteri bilgisi veya gercek Google Photos linki eklemeyin.
echo.
pause
exit /b 0

:error
echo.
echo HATA: Kurulum sirasinda bir sorun olustu. Yukaridaki hata mesajini kontrol edin.
pause
exit /b 1
