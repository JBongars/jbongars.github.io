# non-interactive-terminal-but-i-have-root-password

**Author:** Julien Bongars\
**Date:** 2025-09-26 13:50:18
**Path:**

---

### Alternative Escalation Methods

**Try Different su Variations**

```bash
su -
/bin/su -
sudo su -
sudo -i
```

**Direct SSH (if root creds work)**

```bash
ssh root@localhost
ssh root@127.0.0.1
```

**Check sudo permissions**

```bash
sudo -l
```

### Environment Setup After TTY Upgrade

```bash
# Set proper environment
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export TERM=xterm-256color
export SHELL=/bin/bash
export HOME=/root

# Clear screen
clear
```

### Language-Specific PTY Spawning

```bash
# Python
python -c 'import pty; pty.spawn("/bin/bash")'
python3 -c 'import pty; pty.spawn("/bin/bash")'

# Perl
perl -e 'exec "/bin/bash";'

# Ruby
ruby -e 'exec "/bin/bash"'

# Lua
lua -e "os.execute('/bin/bash')"

# AWK
awk 'BEGIN {system("/bin/bash")}'

# Find
find . -exec /bin/bash \; -quit

# Vim/Vi
vim -c ':!/bin/bash'
# Then type: :!/bin/bash

# More
more /etc/passwd
# Then type: !/bin/bash

# Less
less /etc/passwd
# Then type: !/bin/bash
```

### Troubleshooting

**If Python isn't available:**

```bash
which python
which python3
which python2
```

**Check available shells:**

```bash
cat /etc/shells
```

**Manual TTY check:**

```bash
tty
echo $TERM
```

**If still getting terminal errors:**

```bash
# Try forcing pseudo-terminal
su -s /bin/bash
```

### Quick Test Commands

**Test if TTY upgrade worked:**

```bash
su -
nano /etc/passwd  # Should work if TTY is proper
top                # Should display properly
```

**One-liner for quick PTY:**

```bash
python3 -c 'import pty; pty.spawn("/bin/bash")' 2>/dev/null || python -c 'import pty; pty.spawn("/bin/bash")' 2>/dev/null || script /dev/null
```

see: notes/convenience/reverse-shell/convert-to-interactive-shell.md
