[Setup]
AppId={{B7E4C1A2-5D3F-4E8A-9C61-2F0A7D9E4B15}
AppName=CWS POS
AppVersion=1.0.0
AppPublisher=CodeWithSky
DefaultDirName={autopf}\CWS POS
DefaultGroupName=CWS POS
DisableProgramGroupPage=yes
OutputDir=installer
OutputBaseFilename=CWS-POS-Setup
SetupIconFile=windows\runner\resources\app_icon.ico
UninstallDisplayIcon={app}\pos.exe
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
InfoAfterFile=README.txt

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"

[Files]
Source: "build\windows\x64\runner\Release\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
Source: "README.txt"; DestDir: "{app}"

[Icons]
Name: "{group}\CWS POS"; Filename: "{app}\pos.exe"
Name: "{autodesktop}\CWS POS"; Filename: "{app}\pos.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\pos.exe"; Description: "Launch CWS POS"; Flags: nowait postinstall skipifsilent