#!/usr/bin/env python3
"""Render ABIA's Keycloak realm template with environment-specific values."""

import argparse
import json
import os
from pathlib import Path
from string import Template
from urllib.parse import urlsplit


TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "realm" / "abia-realm.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--client-id", required=True)
    parser.add_argument("--redirect-uri", required=True)
    parser.add_argument("--ssl-required", choices=("none", "external", "all"), required=True)
    parser.add_argument("--smtp-host", required=True)
    parser.add_argument("--smtp-port", type=int, required=True)
    parser.add_argument("--smtp-from", required=True)
    parser.add_argument("--smtp-from-display-name", required=True)
    parser.add_argument("--smtp-ssl", choices=("true", "false"), default="false")
    parser.add_argument("--smtp-starttls", choices=("true", "false"), default="false")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.client_id or len(args.client_id) > 200 or any(char in args.client_id for char in "\r\n"):
        raise SystemExit("OIDC client ID must be a non-empty single-line value of at most 200 characters.")

    redirect = urlsplit(args.redirect_uri)
    if (
        redirect.scheme not in {"http", "https"}
        or not redirect.netloc
        or not redirect.hostname
        or redirect.username
        or redirect.password
        or redirect.query
        or redirect.fragment
    ):
        raise SystemExit("OIDC redirect URI must be an HTTP(S) URL without credentials, query, or fragment.")
    try:
        redirect.port
    except ValueError:
        raise SystemExit("OIDC redirect URI contains an invalid port.") from None

    if not 1 <= args.smtp_port <= 65535:
        raise SystemExit("SMTP port must be between 1 and 65535.")
    smtp_values = (args.smtp_host, args.smtp_from, args.smtp_from_display_name)
    if any(not value.strip() or any(char in value for char in "\r\n") for value in smtp_values):
        raise SystemExit("SMTP host, sender address, and sender display name are required.")

    values = {
        "REALM_SSL_REQUIRED": args.ssl_required,
        "SMTP_HOST": args.smtp_host,
        "SMTP_PORT": str(args.smtp_port),
        "SMTP_FROM": args.smtp_from,
        "SMTP_FROM_DISPLAY_NAME": args.smtp_from_display_name,
        "SMTP_SSL": args.smtp_ssl,
        "SMTP_STARTTLS": args.smtp_starttls,
        "OIDC_CLIENT_ID": args.client_id,
        "OIDC_REDIRECT_URI": args.redirect_uri,
        "OIDC_WEB_ORIGIN": f"{redirect.scheme}://{redirect.netloc}",
    }

    try:
        escaped_values = {
            name: json.dumps(value, ensure_ascii=False)[1:-1]
            for name, value in values.items()
        }
        rendered = Template(TEMPLATE_PATH.read_text(encoding="utf-8")).substitute(escaped_values)
        realm = json.loads(rendered)
    except (OSError, KeyError, json.JSONDecodeError) as error:
        raise SystemExit(f"Could not render ABIA Keycloak realm: {error}") from None

    args.output.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(args.output.parent, 0o755)
    temporary = args.output.with_name(args.output.name + ".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        json.dump(realm, output, separators=(",", ":"))
        output.write("\n")
    os.chmod(temporary, 0o644)
    os.replace(temporary, args.output)
    os.chmod(args.output, 0o644)


if __name__ == "__main__":
    main()
