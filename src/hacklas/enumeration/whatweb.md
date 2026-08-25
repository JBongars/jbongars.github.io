# whatweb

**Author:** Julien Bongars\
**Date:** 2025-09-30 02:36:14
**Path:**

---

replaces webappanalyzer which may not be accurate.

## Installation

```bash
sudo apt-get update
# required to ensure psych works correctly
sudo apt-get install libyaml-dev

git clone https://github.com/urbanadventurer/WhatWeb.git ~/whatweb && cd ~/whatweb
sudo make install

whatweb # should be in your shell environment
```

## Usage

```bash
whatweb <website-or-ip>
```

### With cookie and useragent

```bash
./whatweb http://hacknet.htb/profile \
  --cookie "csrftoken=zmTOWVjBHk3Xr2tLdSHgsa0dutqfehDs; sessionid=wyaqqs6uwihjvx0u5nq9tros32jzyjfc" \
  --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \
  --header "Referer: http://hacknet.htb/login" \
  --aggression 3 \
  --verbose
```

## Sample report

```bash
┌─[eu-dedivip-1]─[10.10.14.146]─[julien23@htb-nbfbjjrw2v]─[~/WhatWeb]
└──╼ [★]$ ./whatweb http://hacknet.htb/profile \
  --cookie "csrftoken=zmTOWVjBHk3Xr2tLdSHgsa0dutqfehDs; sessionid=wyaqqs6uwihjvx0u5nq9tros32jzyjfc" \
  --user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \
  --header "Referer: http://hacknet.htb/login" \
  --aggression 3 \
  --verbose
WhatWeb report for http://hacknet.htb/profile
Status    : 200 OK
Title     : HackNet - Profile
IP        : 10.129.232.4
Country   : RESERVED, ZZ

Summary   : Cookies[csrftoken,sessionid], Django, HTML5, HTTPServer[nginx/1.22.1], HttpOnly[sessionid], JQuery[3.7.1], nginx[1.22.1], Script, UncommonHeaders[x-content-type-options,referrer-policy,cross-origin-opener-policy], X-Frame-Options[DENY]

Detected Plugins:
[ Cookies ]
	Display the names of cookies in the HTTP headers. The
	values are not returned to save on space.

	String       : csrftoken
	String       : sessionid

[ Django ]
	Django is a high-level Python Web framework that encourages
	rapid development and clean, pragmatic design.

	Website     : https://www.djangoproject.com/

[ HTML5 ]
	HTML version 5, detected by the doctype declaration


[ HTTPServer ]
	HTTP server header string. This plugin also attempts to
	identify the operating system from the server header.

	String       : nginx/1.22.1 (from server string)

[ HttpOnly ]
	If the HttpOnly flag is included in the HTTP set-cookie
	response header and the browser supports it then the cookie
	cannot be accessed through client side script - More Info:
	http://en.wikipedia.org/wiki/HTTP_cookie

	String       : sessionid

[ JQuery ]
	A fast, concise, JavaScript that simplifies how to traverse
	HTML documents, handle events, perform animations, and add
	AJAX.

	Version      : 3.7.1
	Website     : http://jquery.com/

[ Script ]
	This plugin detects instances of script HTML elements and
	returns the script language/type.


[ UncommonHeaders ]
	Uncommon HTTP server headers. The blacklist includes all
	the standard headers and many non standard but common ones.
	Interesting but fairly common headers should have their own
	plugins, eg. x-powered-by, server and x-aspnet-version.
	Info about headers can be found at www.http-stats.com

	String       : x-content-type-options,referrer-policy,cross-origin-opener-policy (from headers)

[ X-Frame-Options ]
	This plugin retrieves the X-Frame-Options value from the
	HTTP header. - More Info:
	http://msdn.microsoft.com/en-us/library/cc288472%28VS.85%29.
	aspx

	String       : DENY

[ nginx ]
	Nginx (Engine-X) is a free, open-source, high-performance
	HTTP server and reverse proxy, as well as an IMAP/POP3
	proxy server.

	Version      : 1.22.1
	Website     : http://nginx.net/

HTTP Headers:
	HTTP/1.1 200 OK
	Server: nginx/1.22.1
	Date: Tue, 30 Sep 2025 01:45:15 GMT
	Content-Type: text/html; charset=utf-8
	Transfer-Encoding: chunked
	Connection: close
	X-Frame-Options: DENY
	Vary: Cookie
	X-Content-Type-Options: nosniff
	Referrer-Policy: same-origin
	Cross-Origin-Opener-Policy: same-origin
	Set-Cookie: csrftoken=zmTOWVjBHk3Xr2tLdSHgsa0dutqfehDs; expires=Tue, 29 Sep 2026 01:45:15 GMT; Max-Age=31449600; Path=/; SameSite=Lax
	Set-Cookie: sessionid=wyaqqs6uwihjvx0u5nq9tros32jzyjfc; expires=Tue, 14 Oct 2025 01:45:15 GMT; HttpOnly; Max-Age=1209600; Path=/; SameSite=Lax
	Content-Encoding: gzip
```

## Usage

```bash
.$$$     $.                                   .$$$     $.
$$$$     $$. .$$$  $$$ .$$$$$$.  .$$$$$$$$$$. $$$$     $$. .$$$$$$$. .$$$$$$.
$ $$     $$$ $ $$  $$$ $ $$$$$$. $$$$$ $$$$$$ $ $$     $$$ $ $$   $$ $ $$$$$$.
$ `$     $$$ $ `$  $$$ $ `$  $$$ $$' $ `$ `$$ $ `$     $$$ $ `$      $ `$  $$$'
$. $     $$$ $. $$$$$$ $. $$$$$$ `$  $. $  :' $. $     $$$ $. $$$$   $. $$$$$.
$::$  .  $$$ $::$  $$$ $::$  $$$     $::$     $::$  .  $$$ $::$      $::$  $$$$
$;;$ $$$ $$$ $;;$  $$$ $;;$  $$$     $;;$     $;;$ $$$ $$$ $;;$      $;;$  $$$$
$$$$$$ $$$$$ $$$$  $$$ $$$$  $$$     $$$$     $$$$$$ $$$$$ $$$$$$$$$ $$$$$$$$$'


WhatWeb - Next generation web scanner version 0.6.2.
Developed by Andrew Horton (urbanadventurer) and Brendan Coles (bcoles).
Homepage: https://morningstarsecurity.com/research/whatweb

Usage: whatweb [options] <URLs>

TARGET SELECTION:
  <TARGETs>			Enter URLs, hostnames, IP addresses, filenames or
  				IP ranges in CIDR, x.x.x-x, or x.x.x.x-x.x.x.x
  				format.
  --input-file=FILE, -i		Read targets from a file. You can pipe
				hostnames or URLs directly with -i /dev/stdin.

TARGET MODIFICATION:
  --url-prefix			Add a prefix to target URLs.
  --url-suffix			Add a suffix to target URLs.
  --url-pattern			Insert the targets into a URL.
				e.g. example.com/%insert%/robots.txt

AGGRESSION:
The aggression level controls the trade-off between speed/stealth and
reliability.
  --aggression, -a=LEVEL	Set the aggression level. Default: 1.
  1. Stealthy			Makes one HTTP request per target and also
  				follows redirects.
  3. Aggressive			If a level 1 plugin is matched, additional
  				requests will be made.
  4. Heavy			Makes a lot of HTTP requests per target. URLs
  				from all plugins are attempted.

HTTP OPTIONS:
  --user-agent, -U=AGENT	Identify as AGENT instead of WhatWeb/0.6.2.
  --header, -H			Add an HTTP header. eg "Foo:Bar". Specifying a
				default header will replace it. Specifying an
				empty value, e.g. "User-Agent:" will remove it.
  --follow-redirect=WHEN	Control when to follow redirects. WHEN may be
				`never', `http-only', `meta-only', `same-site',
				or `always'. Default: always.
  --max-redirects=NUM		Maximum number of redirects. Default: 10.

AUTHENTICATION:
  --user, -u=<user:password>	HTTP basic authentication.
  --cookie, -c=COOKIES		Use cookies, e.g. 'name=value; name2=value2'.
  --cookie-jar=FILE		Read cookies from a file.

PROXY:
  --proxy			<hostname[:port]> Set proxy hostname and port.
				Default: 8080.
  --proxy-user			<username:password> Set proxy user and password.

PLUGINS:
  --list-plugins, -l		List all plugins.
  --info-plugins, -I=[SEARCH]	List all plugins with detailed information.
				Optionally search with keywords in a comma
				delimited list.
  --search-plugins=STRING	Search plugins for a keyword.
  --plugins, -p=LIST		Select plugins. LIST is a comma delimited set
				of selected plugins. Default is all.
				Each element can be a directory, file or plugin
				name and can optionally have a modifier, +/-.
				Examples: +/tmp/moo.rb,+/tmp/foo.rb
				title,md5,+./plugins-disabled/
				./plugins-disabled,-md5
				-p + is a shortcut for -p +plugins-disabled.
  --grep, -g=STRING|REGEXP	Search for STRING or a Regular Expression. Shows
				only the results that match.
				Examples: --grep "hello"
				--grep "/he[l]*o/"
  --custom-plugin=DEFINITION	Define a custom plugin named Custom-Plugin,
				Examples: ":text=>'powered by abc'"
				":version=>/powered[ ]?by ab[0-9]/"
				":ghdb=>'intitle:abc \"powered by abc\"'"
				":md5=>'8666257030b94d3bdb46e05945f60b42'"
				"{:text=>'powered by abc'}"
  --dorks=PLUGIN		List Google dorks for the selected plugin.

OUTPUT:
  --verbose, -v			Verbose output includes plugin descriptions.
				Use twice for debugging.
  --colour,--color=WHEN		control whether colour is used. WHEN may be
				`never', `always', or `auto'.
  --quiet, -q			Do not display brief logging to STDOUT.
  --no-errors			Suppress error messages.

LOGGING:
  --log-brief=FILE		Log brief, one-line output.
  --log-verbose=FILE		Log verbose output.
  --log-errors=FILE		Log errors.
  --log-xml=FILE		Log XML format.
  --log-json=FILE		Log JSON format.
  --log-sql=FILE		Log SQL INSERT statements.
  --log-sql-create=FILE		Create SQL database tables.
  --log-json-verbose=FILE	Log JSON Verbose format.
  --log-magictree=FILE		Log MagicTree XML format.
  --log-object=FILE		Log Ruby object inspection format.
  --log-mongo-database		Name of the MongoDB database.
  --log-mongo-collection	Name of the MongoDB collection.
				Default: whatweb.
  --log-mongo-host		MongoDB hostname or IP address.
				Default: 0.0.0.0.
  --log-mongo-username		MongoDB username. Default: nil.
  --log-mongo-password		MongoDB password. Default: nil.
  --log-elastic-index		Name of the index to store results. Default: whatweb
  --log-elastic-host		Host:port of the elastic http interface. Default: 127.0.0.1:9200

PERFORMANCE & STABILITY:
  --max-threads, -t		Number of simultaneous threads. Default: 25.
  --open-timeout		Time in seconds. Default: 15.
  --read-timeout		Time in seconds. Default: 30.
  --wait=SECONDS		Wait SECONDS between connections.
				This is useful when using a single thread.

HELP & MISCELLANEOUS:
  --short-help			Short usage help.
  --help, -h			Complete usage help.
  --debug			Raise errors in plugins.
  --version			Display version information.

EXAMPLE USAGE:
* Scan example.com.
  ./whatweb example.com

* Scan reddit.com slashdot.org with verbose plugin descriptions.
  ./whatweb -v reddit.com slashdot.org

* An aggressive scan of wired.com detects the exact version of WordPress.
  ./whatweb -a 3 www.wired.com

* Scan the local network quickly and suppress errors.
  whatweb --no-errors 192.168.0.0/24

* Scan the local network for https websites.
  whatweb --no-errors --url-prefix https:// 192.168.0.0/24

* Scan for crossdomain policies in the Alexa Top 1000.
  ./whatweb -i plugin-development/alexa-top-100.txt \
  --url-suffix /crossdomain.xml -p crossdomain_xml
```
