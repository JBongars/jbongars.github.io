# vi

Author: Julien Bongars
Date: 2025-09-23 16:26:01
Path: /opt/development/cybersec/hacklas/notes/escalation/linux/vi.md

---

Refer to GTFOBins

The key is you have to point vim to a file that is owned by root and run as sudo. Then it will open as root to enable you to edit the file

sudo /bin/vi /etc/foo/some-conf-i-am-allowed-to-edit.md

and it should work
