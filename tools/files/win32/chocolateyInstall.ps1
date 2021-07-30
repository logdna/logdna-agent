$packageParameters = $env:chocolateyPackageParameters

IF(!($packageParameters))
{
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\logs)){
        New-Item -ItemType directory -Path $env:ALLUSERSPROFILE\logs -Force
    }
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\logs\logdna-agent.log)){
        New-Item -ItemType file -Path $env:ALLUSERSPROFILE\logs\logdna-agent.log -Force
    }
    if(!(Test-Path -Path $env:ALLUSERSPROFILE\logdna)){
        New-Item -ItemType directory -Path $env:ALLUSERSPROFILE\logdna -Force
    }

    cmd.exe /c "nssm.exe install logdna-agent $env:ChocolateyInstall\bin\logdna-agent.exe & exit /b 0"
    cmd.exe /c "nssm.exe set logdna-agent AppStdout $env:ALLUSERSPROFILE\logs\logdna-agent.log & exit /b 0"
    cmd.exe /c "nssm.exe set logdna-agent AppStderr $env:ALLUSERSPROFILE\logs\logdna-agent.log & exit /b 0"
}

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\logdna-agent\Parameters"

IF(!(Test-Path $registryPath))
{
    New-Item -Path $registryPath -Force
}

New-ItemProperty -Path $registryPath -Name 'AppStopMethodSkip' -Value 0xe -PropertyType DWORD -Force
