Set-PSDebug -Strict
$file = "\logs\windows-events.log"
if(!(Test-Path -Path $env:ALLUSERSPROFILE$file)){
    New-Item -ItemType file -Path $env:ALLUSERSPROFILE$file -Force 2> $null
}
$LogName = $args[0]
$curr = (Get-WinEvent -log $LogName -max 1 2> $null).RecordId
if ([string]::IsNullOrEmpty($curr))
{
	$curr = -1
}
while ($true)
{
    start-sleep -Seconds 1
    $next = (Get-WinEvent -log $LogName -max 1 2> $null).RecordId
    if ([string]::IsNullOrEmpty($next))
    {
    	$next = -1
    }
    if ($next -gt $curr) {
        $data = Get-WinEvent -log $LogName -max ($next - $curr + 1000) 2> $null | where {$_.RecordId -gt $curr} | ConvertTo-Json
        $data
        $data | out-file $env:ALLUSERSPROFILE$file
        $curr = $data[-1].RecordId
    }
}
