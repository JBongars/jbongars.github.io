# fake-dnslog-cn

**Author:** Julien Bongars\
**Date:** 2025-09-25 00:29:32
**Path:**

---

Out-of-band DNS callback when the target can resolve names but you cannot see HTTP.

Open [dnslog.cn](http://dnslog.cn/), copy a subdomain, trigger a lookup, refresh the record table.

```bash
curl "http://<unique>.dnslog.cn/"
ping -c 1 "<unique>.dnslog.cn"
nslookup "<unique>.dnslog.cn"
```

## Resources

- [dnslog.cn](http://dnslog.cn/) — public DNS callback
- [Interactsh](https://github.com/projectdiscovery/interactsh) — self-hosted alternative (HTTP/DNS/SMTP)
