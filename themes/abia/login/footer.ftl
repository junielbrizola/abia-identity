<#macro content>
	<#assign mailboxUrl = (realm.getAttribute("abia.login.help.mailbox.url")!"")?trim>
	<#assign mailboxLabel = (realm.getAttribute("abia.login.help.mailbox.label")!"")?trim>
	<#assign mailboxMessage = (realm.getAttribute("abia.login.help.mailbox.message")!"")?trim>
	<div class="abia-login-help" role="note">
		<strong>Precisa de acesso?</strong>
		<#if realm.resetPasswordAllowed>
			<p>O cadastro é administrado pelo responsável do espaço. Para recuperar sua senha, use “Esqueceu a senha?” acima; o link será enviado ao e-mail cadastrado.</p>
			<#if mailboxUrl?has_content && mailboxLabel?has_content>
				<p class="abia-login-mailbox-note"><#if mailboxMessage?has_content>${mailboxMessage?html} </#if><a href="${mailboxUrl?html}" target="_blank" rel="noopener noreferrer">${mailboxLabel?html}</a></p>
			</#if>
		<#else>
			<p>O cadastro e a recuperação da conta são administrados pela organização. Entre em contato com o administrador do seu espaço de trabalho.</p>
		</#if>
	</div>
</#macro>
