---
note_tags:
  - recon
  - web
  - fingerprint
  - disclosure
  - config
---
# phpinfo

**Author:** Julien Bongars\
**Date:** 2026-08-26
**Path:**

---

> **EDITOR NOTE**
>
> This page was created 100% with AI as a disclosure.

`phpinfo()` dumps the PHP build, loaded modules, `disable_functions`, `open_basedir`, `allow_url_include`, document root, and often credentials in `$_ENV` / `$_SERVER`.

## Trigger

```php
<?php phpinfo(); ?>
```

Common URLs: `/phpinfo.php`, `/info.php`, `/test.php`, `/i.php`. Also any LFI/RFI or upload that evaluates PHP.

```bash
curl -s http://target.htb/phpinfo.php | grep -Ei 'disable_functions|open_basedir|allow_url_include|document_root|Loaded Configuration'
```

## What to note

- `disable_functions` — which exec wrappers are blocked (`system`, `passthru`, `proc_open`, `putenv`, …)
- `open_basedir` / `safe_mode` leftovers
- `allow_url_fopen` / `allow_url_include` — RFI
- `disable_classes`
- `Loaded Configuration File` — path to `php.ini`
- `DOCUMENT_ROOT`, `SCRIPT_FILENAME` — LFI/webroot
- `$_ENV` / `$_SERVER` — secrets, AWS keys, DB DSNs

## Resources

- [phpinfo()](https://www.php.net/manual/en/function.phpinfo.php) — official function
- [PHP enumeration](../php-enumeration.md) — feroxbuster `-X php` and function list
- [dangerous-functions](../../infiltration/deserialisation-injection-insecure-deserialisation/php/dangerous-functions.md) — what still runs after disable_functions
