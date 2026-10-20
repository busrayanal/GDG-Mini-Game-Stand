@echo off
rem GDG Mini Oyun Standi - tam ekran (kiosk) modunda baslatir. Cikis: Alt+F4
set "PAGE=%~dp0index.html"
set "PAGE=%PAGE:\=/%"
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --autoplay-policy=no-user-gesture-required "file:///%PAGE%"
) else (
  start "" msedge --kiosk "file:///%PAGE%" --edge-kiosk-type=fullscreen --no-first-run
)
