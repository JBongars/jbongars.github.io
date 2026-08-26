---
note_tags:
  - sshpass
  - automation
  - linux
---
# use-sshpass-so-ssh-does-not-prompt-for-password

**Author:** Julien Bongars\
**Date:** 2025-10-01 15:45:30
**Path:**

---

## Command

```bash
PASSWORD=123
USERNAME=foo

sshpass -p "$PASSWORD" ssh "${USERNAME}@server.net"
```

## Resources

- [sshpass](https://linux.die.net/man/1/sshpass) — man page
- [cheat.sh/sshpass](https://cheat.sh/sshpass) — extra flags
