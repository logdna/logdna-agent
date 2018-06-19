Set-PSDebug -Strict
$LogName = $args[0]
$curr = (Get-WinEvent -FilterHashtable @{LogName=@($LogName)} -MaxEvents 1 2> $null).RecordId
if ([string]::IsNullOrEmpty($curr))
{
	$curr = -1
}
while ($true)
{
    start-sleep -Seconds 1
    $next = (Get-WinEvent -FilterHashtable @{LogName=@($LogName)} -MaxEvents 1 2> $null).RecordId
    if ([string]::IsNullOrEmpty($next))
    {
    	$next = -1
    }
    if ($next -gt $curr) {
        $data = Get-WinEvent -FilterHashtable @{LogName=@($LogName)} -MaxEvents ($next - $curr + 1000) 2> $null | where {$_.RecordId -gt $curr}
        $curr = $data[-1].RecordId
        $data | ConvertTo-Json
    }
}
