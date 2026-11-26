#!/usr/bin/env python3
"""Render the ABIA Identity realm template with environment-specific values."""

import argparse
import json
import os
from pathlib import Path
from string import Template
import tempfile
from urllib.parse import urlsplit


TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "realm" / "abia-realm.json"
KEYCLOAK_ATTRIBUTE_DELIMITER = "##"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=os.getenv("ABIA_IDENTITY_REALM_OUTPUT"))
    parser.add_argument("--client-id", default=os.getenv("ABIA_IDENTITY_OIDC_CLIENT_ID"))
    parser.add_argument("--redirect-uri", default=os.getenv("ABIA_IDENTITY_OIDC_REDIRECT_URI"))
    parser.add_argument(
        "--platform-dev-redirect-uri",
        default=os.getenv("ABIA_IDENTITY_PLATFORM_DEV_REDIRECT_URI", ""),
    )
    parser.add_argument(
        "--post-logout-redirect-uri",
        default=os.getenv("ABIA_IDENTITY_OIDC_POST_LOGOUT_REDIRECT_URI")
        or os.getenv("PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI"),
    )
    parser.add_argument("--ssl-required", choices=("none", "external", "all"), default=os.getenv("ABIA_IDENTITY_REALM_SSL_REQUIRED"))
    parser.add_argument("--smtp-host", default=os.getenv("ABIA_IDENTITY_SMTP_HOST"))
    parser.add_argument("--smtp-port", type=int, default=os.getenv("ABIA_IDENTITY_SMTP_PORT"))
    parser.add_argument("--smtp-from", default=os.getenv("ABIA_IDENTITY_SMTP_FROM"))
    parser.add_argument("--smtp-from-display-name", default=os.getenv("ABIA_IDENTITY_SMTP_FROM_DISPLAY_NAME"))
    parser.add_argument("--smtp-auth", choices=("true", "false"), default=os.getenv("ABIA_IDENTITY_SMTP_AUTH", "false"))
    parser.add_argument("--smtp-username", default=os.getenv("ABIA_IDENTITY_SMTP_USERNAME"))
    parser.add_argument("--smtp-ssl", choices=("true", "false"), default=os.getenv("ABIA_IDENTITY_SMTP_SSL", "false"))
    parser.add_argument("--smtp-starttls", choices=("true", "false"), default=os.getenv("ABIA_IDENTITY_SMTP_STARTTLS", "false"))
    parser.add_argument("--login-help-mailbox-url", default=os.getenv("ABIA_IDENTITY_LOGIN_HELP_MAILBOX_URL"))
    parser.add_argument("--login-help-mailbox-label", default=os.getenv("ABIA_IDENTITY_LOGIN_HELP_MAILBOX_LABEL"))
    parser.add_argument("--login-help-mailbox-message", default=os.getenv("ABIA_IDENTITY_LOGIN_HELP_MAILBOX_MESSAGE"))
    return parser.parse_args()


def is_loopback(hostname: str) -> bool:
    # Keep local HTTP callback acceptance aligned with the browser client. Python's
    # urlsplit().hostname removes the brackets from IPv6 literals, so ::1 is the
    # equivalent of the frontend URL.hostname value [::1].
    return hostname.lower() in {"localhost", "127.0.0.1", "::1"}


def parse_http_url(value: str, setting_name: str):
    if (
        not value
        or value != value.strip()
        or any(ord(char) <= 0x20 or ord(char) == 0x7f for char in value)
        or "\\" in value
        or "*" in value
    ):
        raise SystemExit(f"{setting_name} must be a valid HTTP(S) URL without whitespace, wildcards, or backslashes.")
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        parsed.port
    except ValueError:
        raise SystemExit(f"{setting_name} contains an invalid host or port.") from None
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or not hostname
        or parsed.username
        or parsed.password
    ):
        raise SystemExit(f"{setting_name} must be a valid HTTP(S) URL without credentials.")
    try:
        hostname.encode("idna")
    except UnicodeError:
        raise SystemExit(f"{setting_name} contains an invalid hostname.") from None
    return parsed, hostname


def require_single_line(value: str, setting_name: str, *, allow_empty: bool = False) -> None:
    if (not allow_empty and not value.strip()) or any(ord(char) < 0x20 or ord(char) == 0x7f for char in value):
        raise SystemExit(f"{setting_name} must be a single-line value{'' if allow_empty else ' and cannot be empty'}.")


def main() -> None:
    args = parse_args()

    required_values = {
        "--output / ABIA_IDENTITY_REALM_OUTPUT": args.output,
        "--client-id / ABIA_IDENTITY_OIDC_CLIENT_ID": args.client_id,
        "--redirect-uri / ABIA_IDENTITY_OIDC_REDIRECT_URI": args.redirect_uri,
        "--ssl-required / ABIA_IDENTITY_REALM_SSL_REQUIRED": args.ssl_required,
        "--smtp-host / ABIA_IDENTITY_SMTP_HOST": args.smtp_host,
        "--smtp-port / ABIA_IDENTITY_SMTP_PORT": args.smtp_port,
        "--smtp-from / ABIA_IDENTITY_SMTP_FROM": args.smtp_from,
        "--smtp-from-display-name / ABIA_IDENTITY_SMTP_FROM_DISPLAY_NAME": args.smtp_from_display_name,
    }
    missing_values = [name for name, value in required_values.items() if value is None or (isinstance(value, str) and not value.strip())]
    if missing_values:
        raise SystemExit("Missing required settings (CLI argument or environment variable): " + ", ".join(missing_values))

    args.output = Path(args.output)
    require_single_line(args.client_id, "OIDC client ID")
    if len(args.client_id) > 200:
        raise SystemExit("OIDC client ID must be a non-empty single-line value of at most 200 characters.")
    if args.ssl_required not in {"none", "external", "all"}:
        raise SystemExit("ssl-required must be none, external, or all.")
    if args.smtp_auth not in {"true", "false"}:
        raise SystemExit("SMTP auth must be true or false.")
    if args.smtp_ssl not in {"true", "false"} or args.smtp_starttls not in {"true", "false"}:
        raise SystemExit("SMTP SSL and STARTTLS settings must be true or false.")

    redirect, redirect_host = parse_http_url(args.redirect_uri, "OIDC redirect URI")
    if redirect.path != "/auth/callback":
        raise SystemExit("OIDC redirect URI path must be /auth/callback.")
    if redirect.query or redirect.fragment:
        raise SystemExit("OIDC redirect URI must be an HTTP(S) URL without credentials, query, or fragment.")
    loopback_redirect = is_loopback(redirect_host)
    if redirect.scheme == "http" and not loopback_redirect:
        raise SystemExit("HTTP OIDC redirect URIs are allowed only for loopback hosts.")
    if args.ssl_required == "none" and not loopback_redirect:
        raise SystemExit("ssl-required=none is allowed only for loopback OIDC redirect hosts.")
    if args.ssl_required == "all" and redirect.scheme != "https":
        raise SystemExit("ssl-required=all requires an HTTPS OIDC redirect URI.")

    post_logout_redirect_uri = args.post_logout_redirect_uri or f"{redirect.scheme}://{redirect.netloc}/login"
    post_logout_redirect, _ = parse_http_url(post_logout_redirect_uri, "OIDC post-logout redirect URI")
    if post_logout_redirect.query or post_logout_redirect.fragment:
        raise SystemExit("OIDC post-logout redirect URI must not contain a query or fragment.")
    if (post_logout_redirect.scheme, post_logout_redirect.netloc) != (redirect.scheme, redirect.netloc):
        raise SystemExit("OIDC post-logout redirect URI must use the same origin as the OIDC redirect URI.")

    platform_dev_redirect_uri = ""
    platform_dev_post_logout_redirect_uri = ""
    if args.platform_dev_redirect_uri:
        platform_dev_redirect, platform_dev_host = parse_http_url(
            args.platform_dev_redirect_uri,
            "Platform development redirect URI",
        )
        if (
            platform_dev_redirect.scheme != "http"
            or not is_loopback(platform_dev_host)
            or platform_dev_redirect.path != "/auth/callback"
            or platform_dev_redirect.query
            or platform_dev_redirect.fragment
        ):
            raise SystemExit(
                "Platform development redirect URI must be an exact loopback HTTP URL ending in /auth/callback."
            )
        platform_dev_redirect_uri = args.platform_dev_redirect_uri
        platform_dev_post_logout_redirect_uri = (
            f"{platform_dev_redirect.scheme}://{platform_dev_redirect.netloc}/login"
        )

    if not 1 <= args.smtp_port <= 65535:
        raise SystemExit("SMTP port must be between 1 and 65535.")
    smtp_values = (
        (args.smtp_host, "SMTP host"),
        (args.smtp_from, "SMTP sender address"),
        (args.smtp_from_display_name, "SMTP sender display name"),
    )
    for value, setting_name in smtp_values:
        require_single_line(value, setting_name)
    if args.smtp_ssl == "true" and args.smtp_starttls == "true":
        raise SystemExit("SMTP SSL and STARTTLS cannot both be enabled.")

    smtp_password = os.getenv("ABIA_IDENTITY_SMTP_PASSWORD", "")
    if args.smtp_auth == "true":
        if not args.smtp_username or not smtp_password:
            raise SystemExit("SMTP authentication requires ABIA_IDENTITY_SMTP_USERNAME and ABIA_IDENTITY_SMTP_PASSWORD.")
        require_single_line(args.smtp_username, "SMTP username")
        require_single_line(smtp_password, "SMTP password")
        if args.smtp_ssl != "true" and args.smtp_starttls != "true":
            raise SystemExit("SMTP authentication requires SSL or STARTTLS.")

    mailbox_url = args.login_help_mailbox_url or ""
    mailbox_label = args.login_help_mailbox_label or ""
    mailbox_message = args.login_help_mailbox_message or ""
    if mailbox_url:
        mailbox, mailbox_host = parse_http_url(mailbox_url, "Login help mailbox URL")
        if mailbox.scheme == "http" and not is_loopback(mailbox_host):
            raise SystemExit("HTTP login help mailbox URLs are allowed only for loopback hosts.")
        require_single_line(mailbox_label, "Login help mailbox label")
        require_single_line(mailbox_message, "Login help mailbox message", allow_empty=True)
    elif mailbox_label or mailbox_message:
        raise SystemExit("Login help mailbox label and message require a mailbox URL.")

    values = {
        "REALM_SSL_REQUIRED": args.ssl_required,
        "SMTP_HOST": args.smtp_host,
        "SMTP_PORT": str(args.smtp_port),
        "SMTP_FROM": args.smtp_from,
        "SMTP_FROM_DISPLAY_NAME": args.smtp_from_display_name,
        "SMTP_AUTH": args.smtp_auth,
        "SMTP_USERNAME": args.smtp_username or "",
        "SMTP_PASSWORD": smtp_password,
        "SMTP_SSL": args.smtp_ssl,
        "SMTP_STARTTLS": args.smtp_starttls,
        "OIDC_CLIENT_ID": args.client_id,
        "OIDC_REDIRECT_URI": args.redirect_uri,
        "OIDC_POST_LOGOUT_REDIRECT_URI": KEYCLOAK_ATTRIBUTE_DELIMITER.join(
            dict.fromkeys(
                uri
                for uri in (post_logout_redirect_uri, platform_dev_post_logout_redirect_uri)
                if uri
            )
        ),
        "OIDC_WEB_ORIGIN": f"{redirect.scheme}://{redirect.netloc}",
        "LOGIN_HELP_MAILBOX_URL": mailbox_url,
        "LOGIN_HELP_MAILBOX_LABEL": mailbox_label,
        "LOGIN_HELP_MAILBOX_MESSAGE": mailbox_message,
    }

    try:
        escaped_values = {
            name: json.dumps(value, ensure_ascii=False)[1:-1]
            for name, value in values.items()
        }
        rendered = Template(TEMPLATE_PATH.read_text(encoding="utf-8")).substitute(escaped_values)
        realm = json.loads(rendered)
        if platform_dev_redirect_uri:
            client = next(
                (
                    client
                    for client in realm["clients"]
                    if client.get("clientId") == args.client_id
                ),
                None,
            )
            if client is None:
                raise KeyError(f"OIDC client {args.client_id} was not found in the ABIA realm template.")
            client["redirectUris"] = list(
                dict.fromkeys([*(client.get("redirectUris") or []), platform_dev_redirect_uri])
            )
            platform_dev_origin = (
                f"{platform_dev_redirect.scheme}://{platform_dev_redirect.netloc}"
            )
            client["webOrigins"] = list(
                dict.fromkeys([*(client.get("webOrigins") or []), platform_dev_origin])
            )
        if args.smtp_auth != "true":
            realm["smtpServer"].pop("user", None)
            realm["smtpServer"].pop("password", None)
    except (OSError, KeyError, json.JSONDecodeError) as error:
        raise SystemExit(f"Could not render ABIA Keycloak realm: {error}") from None

    args.output.parent.mkdir(parents=True, exist_ok=True)
    output_mode = 0o600 if args.smtp_auth == "true" else 0o644
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{args.output.name}.", suffix=".tmp", dir=args.output.parent)
    try:
        os.fchmod(descriptor, output_mode)
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(realm, output, separators=(",", ":"))
            output.write("\n")
        os.replace(temporary_name, args.output)
    except BaseException:
        try:
            os.close(descriptor)
        except OSError:
            pass
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


if __name__ == "__main__":
    main()
