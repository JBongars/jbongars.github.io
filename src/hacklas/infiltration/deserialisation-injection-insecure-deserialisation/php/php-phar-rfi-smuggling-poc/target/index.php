<?php
	if ($_GET['page'] != "index.php"){
		include($_GET['page'] ?? "home.php");
	} else {
		include("home.php");
	}
?>
