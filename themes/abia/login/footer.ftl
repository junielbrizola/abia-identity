<#macro content>
	<#assign mailboxUrl = (realm.getAttribute("abia.login.help.mailbox.url")!"")?trim>
	<#assign mailboxUrlLower = mailboxUrl?lower_case>
	<#assign mailboxUrlIsHttps = mailboxUrlLower?starts_with("https://")>
	<#assign mailboxUrlIsHttp = mailboxUrlLower?starts_with("http://")>
	<#assign mailboxUrlIsMailto = mailboxUrlLower?starts_with("mailto:")>
	<#assign mailboxUrlSchemeAllowed = mailboxUrlIsHttps || mailboxUrlIsHttp || mailboxUrlIsMailto>
	<#assign mailboxLabel = (realm.getAttribute("abia.login.help.mailbox.label")!"")?trim>
	<#assign mailboxMessage = (realm.getAttribute("abia.login.help.mailbox.message")!"")?trim>
	<div class="abia-login-help" role="note">
		<strong>${msg("abiaLoginHelpTitle")}</strong>
		<#if realm.resetPasswordAllowed>
			<p>${msg("abiaLoginHelpResetPassword")}</p>
			<#if mailboxUrlSchemeAllowed && mailboxLabel?has_content>
					<p class="abia-login-mailbox-note"><#if mailboxMessage?has_content>${mailboxMessage?html} </#if><a href="${mailboxUrl?html}" target="_blank" rel="noopener noreferrer">${mailboxLabel?html}</a></p>
			</#if>
		<#else>
			<p>${msg("abiaLoginHelpContactAdmin")}</p>
		</#if>
	</div>
</#macro>
