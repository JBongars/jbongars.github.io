---
note_tags:
  - php
  - recon
  - web
  - phpinfo
  - fingerprint
  - version
---
# PHP enumeration

**Author:** Julien Bongars\
**Date:** 2026-02-12 14:11:10
**Path:**

---

## Feroxbuster

Enumerate PHP paths with `-X php`. See [feroxbuster](./web/domain-path-feroxbuster.md).

## Functions

```php
<!-- Get all the info from php -->
<?php phpinfo(); ?>
```

Full dump notes: [phpinfo](./php/phpinfo.md).

## Dangerous Functions

The list lives in [dangerous-functions.md](../infiltration/deserialisation-injection-insecure-deserialisation/php/dangerous-functions.md).

## Resources

- [feroxbuster](./web/domain-path-feroxbuster.md) — recursive dirbust, `-X php`
- [phpinfo](./php/phpinfo.md) — reading a phpinfo() dump
- [dangerous-functions](../infiltration/deserialisation-injection-insecure-deserialisation/php/dangerous-functions.md) — disable_functions leftovers
