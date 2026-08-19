# php-enumeration

**Author:** Julien Bongars\
**Date:** 2026-02-12 14:11:10
**Path:**

---

PHP-specific enum: extensions with ferox, `phpinfo`, dangerous function list.

## Feroxbuster

Enumerate PHP with `-X php`.

## Functions

```php
<!-- Get all the info from php -->
<?php phpinfo(); ?>

<!-- Get a list of all dangerous functions -->
<?php



?>
```

## Dangerous functions

See [dangerous-functions](../infiltration/deserialisation-injection-insecure-deserialisation/php/dangerous-functions.md).

## Resources

- [PHP phpinfo](https://www.php.net/manual/en/function.phpinfo.php) — config dump
- [HackTricks — PHP](https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-web/php.html) — wrappers and dangerous funcs
