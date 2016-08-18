$packageParameters = $env:chocolateyPackageParameters

IF(!($packageParameters))
{
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\logs)){
        New-Item -ItemType directory -Path $env:ALLUSERSPROFILE\logs
    }
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\logdna)){
        New-Item -ItemType directory -Path $env:ALLUSERSPROFILE\logdna
    }
    nssm.exe install logdna-agent $env:ChocolateyInstall\bin\logdna-agent.exe
    nssm.exe set logdna-agent AppStdout $env:ALLUSERSPROFILE\logs\logdna-agent.log
    cmd.exe /c "nssm start logdna-agent & exit /b 0"
}

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\logdna-agent\Parameters"

IF(!(Test-Path $registryPath))
{
    New-Item -Path $registryPath -Force
}

New-ItemProperty -Path $registryPath -Name 'AppStopMethodSkip' -Value 0xe -PropertyType DWORD -Force
