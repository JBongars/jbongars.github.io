# use-sshpass-so-ssh-does-not-prompt-for-password

**Author:** Julien Bongars\
**Date:** 2025-10-01 15:45:30
**Path:**

---

Feed `ssh` a password from a variable so it does not prompt (scripts, `nxc`-style sprays).

```bash
PASSWORD=123
USERNAME=foo

sshpass "$PASSWORD" ssh "${USERNAME}@server.net"
```

## Resources

- [sshpass](https://sourceforge.net/projects/sshpass/) — non-interactive SSH password
- [cheat.sh/sshpass](https://cheat.sh/sshpass) — `-p` vs env
