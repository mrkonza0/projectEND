@echo off
chcp 65001 > nul
echo.
echo  ================================================
echo   URU Research - Backend API Setup
echo   Laravel 9  +  PHP 8.0  +  MariaDB (XAMPP)
echo  ================================================
echo.

REM -- Check PHP --
where php >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ไม่พบ PHP  ->  เปิด XAMPP แล้วลองใหม่
    pause & exit /b 1
)

REM -- Check Composer --
where composer >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ไม่พบ Composer  ->  https://getcomposer.org/Composer-Setup.exe
    pause & exit /b 1
)

REM -- Already installed? --
if exist "backend" (
    echo [WARNING] พบโฟลเดอร์ backend อยู่แล้ว
    set /p OVR=ลบและสร้างใหม่? (y/n):
    if /i not "%OVR%"=="y" ( echo ยกเลิก & pause & exit /b 0 )
    rmdir /s /q backend
)

echo.
echo [1/7] สร้าง Laravel 9 project  (อาจใช้เวลา 1-2 นาที)...
composer create-project laravel/laravel:^9.0 backend --prefer-dist --no-interaction -q
if %ERRORLEVEL% neq 0 (
    echo [ERROR] สร้าง Laravel ไม่สำเร็จ ตรวจสอบ internet
    pause & exit /b 1
)

cd backend

echo [2/7] ติดตั้ง Sanctum...
composer require laravel/sanctum --no-interaction -q
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider" --force -q

echo [3/7] Copy ไฟล์ API...
xcopy /E /Y "..\backend-src\app"      "app\"      >nul
xcopy /E /Y "..\backend-src\database" "database\" >nul
xcopy /E /Y "..\backend-src\routes"   "routes\"   >nul
xcopy /E /Y "..\backend-src\config"   "config\"   >nul

echo [4/7] สร้าง Application Key...
copy ".env.example" ".env" >nul
php artisan key:generate -q

echo.
echo  ================================================
echo   ตั้งค่า Database  (ทำตามขั้นตอนนี้)
echo  ================================================
echo.
echo   1. เปิด phpMyAdmin:  http://localhost/phpmyadmin
echo   2. คลิก "New"  สร้าง database ชื่อ:  uru_research
echo   3. เปิดไฟล์ backend\.env  แก้บรรทัด:
echo.
echo        DB_DATABASE=uru_research
echo        DB_USERNAME=root
echo        DB_PASSWORD=          (ว่างเปล่า ถ้าไม่ได้ตั้งรหัส XAMPP)
echo.
echo  ================================================
echo.
set /p RDY=กด Enter เมื่อทำเสร็จแล้ว...

echo.
echo [5/7] รัน Migrations...
php artisan migrate --force
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Migration ล้มเหลว
    echo  -> ตรวจสอบว่า XAMPP MySQL กำลัง run อยู่
    echo  -> ตรวจสอบ backend\.env ว่าตั้งค่าถูกต้อง
    echo  -> ตรวจสอบว่าสร้าง database ชื่อ uru_research แล้ว
    pause & exit /b 1
)

echo [6/7] ใส่ข้อมูลตัวอย่าง...
php artisan db:seed --force -q

echo [7/7] เสร็จ!
echo.
echo  ================================================
echo   พร้อมใช้งาน!
echo  ================================================
echo   รัน server:  cd backend  แล้ว  php artisan serve
echo   URL:         http://127.0.0.1:8000
echo.
echo   Login ทดสอบ:
echo     Email:    admin@uru.ac.th
echo     Password: password
echo  ================================================
echo.

set /p SRV=รัน server เลยเดี๋ยวนี้? (y/n):
if /i "%SRV%"=="y" (
    echo.
    echo กำลังรัน...  กด Ctrl+C เพื่อหยุด
    echo.
    php artisan serve
)
cd ..
