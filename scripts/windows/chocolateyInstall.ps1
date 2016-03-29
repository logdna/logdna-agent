$packageParameters = $env:chocolateyPackageParameters

IF(!($packageParameters) -or !($packageParameters.Contains("/NoServiceInstall")))
{
    nssm.exe install logdna-agent $env:ChocolateyInstall\bin\logdna-agent.exe
}

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\logdna-agent\Parameters"

IF(!(Test-Path $registryPath))
{
    New-Item -Path $registryPath -Force
}

New-ItemProperty -Path $registryPath -Name 'AppStopMethodSkip' -Value 0xe -PropertyType DWORD -Force
