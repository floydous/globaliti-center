' Launcher aplikasi mandiri Globaliti Center tanpa jendela terminal/konsol
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir

distIndex = scriptDir & "\dist\index.html"
If Not fso.FileExists(distIndex) Then
    ' Build aplikasi terlebih dahulu bila folder dist belum dibuat
    WshShell.Run "cmd.exe /c npm run build && npx electron .", 0, False
Else
    ' Jalankan electron langsung di latar belakang secara hening (0 = SW_HIDE)
    WshShell.Run "cmd.exe /c npx electron .", 0, False
End If

Set WshShell = Nothing
Set fso = Nothing
