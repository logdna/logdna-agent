$packageParameters = $env:chocolateyPackageParameters

IF(!($packageParameters) -or !($packageParameters.Contains("/NoServiceUninstall")))
{
    nssm.exe stop logdna-agent
    nssm.exe remove logdna-agent confirm
}

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\logdna-agent"

IF(Test-Path $registryPath)
{
    Remove-Item -Path $registryPath -Force -Recurse
}
