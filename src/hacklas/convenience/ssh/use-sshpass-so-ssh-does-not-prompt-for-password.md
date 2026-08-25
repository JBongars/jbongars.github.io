# use-sshpass-so-ssh-does-not-prompt-for-password

**Author:** Julien Bongars\
**Date:** 2025-10-01 15:45:30
**Path:**

---

## Command

```bash
PASSWORD=123
USERNAME=foo

sshpass "$PASSWORD" ssh "${USERNAME}@server.net"
```
