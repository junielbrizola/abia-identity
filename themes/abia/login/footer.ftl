<#macro content>
	<div class="abia-login-help" role="note">
		<strong>Precisa de acesso?</strong>
		<#if realm.resetPasswordAllowed>
			<p>O cadastro é administrado pelo responsável do espaço. Para recuperar sua senha, use “Esqueceu a senha?” acima; o link será enviado ao e-mail cadastrado.</p>
			<p class="abia-local-mail-note">Neste ambiente local, as mensagens ficam na <a href="http://localhost:8025/" target="_blank" rel="noopener noreferrer">caixa de e-mail de testes</a>.</p>
		<#else>
			<p>O cadastro e a recuperação da conta são administrados pela organização. Entre em contato com o administrador do seu espaço de trabalho.</p>
		</#if>
	</div>
</#macro>
