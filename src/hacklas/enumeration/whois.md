# whois

**Author:** Julien Bongars\
**Date:** 2025-12-14 23:05:08
**Path:**

---

Query registration data for a domain or IP (registrar, dates, name servers, contacts when not redacted).

```bash
whois inlanefreight.com
```

```txt
Domain Name: inlanefreight.com
Registry Domain ID: 2420436757_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.registrar.amazon
Registrar URL: https://registrar.amazon.com
Updated Date: 2023-07-03T01:11:15Z
Creation Date: 2019-08-05T22:43:09Z
```

Typical fields: domain, registrar, registrant / admin / tech contacts, creation and expiry, name servers.

```bash
whois example.com
whois 8.8.8.8
whois -h whois.nic.xyz example.xyz
```

## Resources

- [rfc1036/whois](https://github.com/rfc1036/whois) — client used by most Linux distros
- [cheat.sh/whois](https://cheat.sh/whois) — extra flags (`-h`, `-p`, `-H`)
