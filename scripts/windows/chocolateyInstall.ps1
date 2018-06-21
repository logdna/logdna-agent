$packageParameters = $env:chocolateyPackageParameters
$winTailURL = 'https://raw.githubusercontent.com/logdna/logdna-agent/master/scripts/windows/winTail.ps1'

IF(!($packageParameters))
{
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\tmp)){
        New-Item -ItemType directory -Path $env:ALLUSERSPROFILE\tmp
    }
    if(Test-Path -Path $env:ALLUSERSPROFILE\tmp\winTail.ps1){
        Remove-Item $env:ALLUSERSPROFILE\tmp\winTail.ps1
    }
    Invoke-WebRequest -Uri $winTailURL -OutFile $env:ALLUSERSPROFILE\tmp\winTail.ps1
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\logs)){
        New-Item -ItemType directory -Path $env:ALLUSERSPROFILE\logs
    }
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\logdna)){
        New-Item -ItemType directory -Path $env:ALLUSERSPROFILE\logdna
    }
    cmd.exe /c "nssm.exe install logdna-agent $env:ChocolateyInstall\bin\logdna-agent.exe & exit /b 0"
    fsutil file createnew $env:ALLUSERSPROFILE\logs\logdna-agent.log 0
    cmd.exe /c "nssm.exe set logdna-agent AppStdout $env:ALLUSERSPROFILE\logs\logdna-agent.log & exit /b 0"
    cmd.exe /c "nssm.exe set logdna-agent AppStderr $env:ALLUSERSPROFILE\logs\logdna-agent.log & exit /b 0"
}

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\logdna-agent\Parameters"

IF(!(Test-Path $registryPath))
{
    New-Item -Path $registryPath -Force
}

New-ItemProperty -Path $registryPath -Name 'AppStopMethodSkip' -Value 0xe -PropertyType DWORD -Force
