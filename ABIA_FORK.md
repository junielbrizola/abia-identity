# ABIA Identity

This repository is the ABIA GitHub fork of [keycloak/keycloak](https://github.com/keycloak/keycloak).

## Current baseline

- Latest stable Keycloak release checked on 2026-11-24: `26.8.2`.
- Upstream tag commit: `e514445f9dcdabc5bdcf67cab56c1e49655de067`.
- `main` follows Keycloak's upstream development branch.
- `abia-stable` is the ABIA branch used for the latest stable release and carries ABIA customizations.
- `.abia-upstream-version` records the stable release at the base of the ABIA branch.

## ABIA customizations

- `themes/abia/login/` contains the ABIA Portuguese login theme, moved from the product's local Keycloak integration.
- `realm/abia-realm.json` is the canonical ABIA realm and OIDC client definition. `scripts/render_realm.py` fills environment-specific callback, SMTP, and TLS settings at deployment time.
- `Dockerfile.local` compiles the Keycloak server distribution from this fork branch, adds the ABIA theme, and packages it on the corresponding Keycloak runtime base for local development. Keep the runtime image version aligned with the compiled source; the compiled server files replace the base image's Keycloak files.
- The ABIA product project calls the realm renderer with environment-specific callback and mail transport settings. Tenant/organization provisioning remains a separate ABIA backend operation.
- Environment-specific renderer inputs can be passed as CLI arguments or `ABIA_IDENTITY_*` environment variables. Explicit CLI arguments take precedence over environment variables.
- `ABIA_IDENTITY_LOGIN_HELP_MAILBOX_URL`, `ABIA_IDENTITY_LOGIN_HELP_MAILBOX_LABEL`, and `ABIA_IDENTITY_LOGIN_HELP_MAILBOX_MESSAGE` control the optional link in the login footer; leaving the URL empty hides it.
- SMTP authentication can be enabled with `ABIA_IDENTITY_SMTP_AUTH=true`, `ABIA_IDENTITY_SMTP_USERNAME`, and `ABIA_IDENTITY_SMTP_PASSWORD`. The password is read only from the environment, TLS is required when authentication is enabled, and the rendered realm file is created with mode `0600` when it contains SMTP credentials.
- HTTP redirect and help-mailbox URLs are limited to loopback hosts. `ssl-required=none` is also limited to loopback, and `ssl-required=all` requires an HTTPS redirect. The realm renderer does not change permissions on an existing output directory.
- `Dockerfile.local` accepts `KEYCLOAK_VERSION`, `KEYCLOAK_BUILDER_IMAGE`, `KEYCLOAK_RUNTIME_IMAGE`, and `KEYCLOAK_JAVA_OPTS_APPEND` build arguments. Pin the builder and runtime image arguments by digest for reproducible builds. The local runtime defaults to disabling the affected Base64 JVM intrinsic until the actual runtime image is verified as patched.

### Realm renderer settings

| CLI argument | Environment variable |
| --- | --- |
| `--output` | `ABIA_IDENTITY_REALM_OUTPUT` |
| `--client-id` | `ABIA_IDENTITY_OIDC_CLIENT_ID` |
| `--redirect-uri` | `ABIA_IDENTITY_OIDC_REDIRECT_URI` |
| `--ssl-required` | `ABIA_IDENTITY_REALM_SSL_REQUIRED` |
| `--smtp-host` | `ABIA_IDENTITY_SMTP_HOST` |
| `--smtp-port` | `ABIA_IDENTITY_SMTP_PORT` |
| `--smtp-from` | `ABIA_IDENTITY_SMTP_FROM` |
| `--smtp-from-display-name` | `ABIA_IDENTITY_SMTP_FROM_DISPLAY_NAME` |
| `--smtp-auth` | `ABIA_IDENTITY_SMTP_AUTH` |
| `--smtp-username` | `ABIA_IDENTITY_SMTP_USERNAME` |
| environment only | `ABIA_IDENTITY_SMTP_PASSWORD` |
| `--smtp-ssl` | `ABIA_IDENTITY_SMTP_SSL` |
| `--smtp-starttls` | `ABIA_IDENTITY_SMTP_STARTTLS` |
| `--login-help-mailbox-url` | `ABIA_IDENTITY_LOGIN_HELP_MAILBOX_URL` |
| `--login-help-mailbox-label` | `ABIA_IDENTITY_LOGIN_HELP_MAILBOX_LABEL` |
| `--login-help-mailbox-message` | `ABIA_IDENTITY_LOGIN_HELP_MAILBOX_MESSAGE` |

There are no Keycloak core code patches in `abia-stable` yet. The local image already builds the server from this fork branch, so future Java core changes in the branch are included in that image. Keycloak documents this source build command:

    ./mvnw -pl quarkus/deployment,quarkus/dist -am -DskipTests clean install

The resulting distribution is in `quarkus/dist/target`. The first local image build compiles Keycloak and can take several minutes.

## Git remotes

- `origin`: `git@github.com:junielbrizola/abia-identity.git`
- `upstream`: `git@github.com:keycloak/keycloak.git` (push disabled)

## Updating from Keycloak

Review the release notes and upgrade guide before adopting a new stable release. Then:

1. Fetch the upstream release tags and branches.
2. Fast-forward `main` from `upstream/main` and push it to `origin`.
3. Merge the new stable release tag into `abia-stable`, resolve any conflicts with ABIA changes, and update `.abia-upstream-version`.
4. Update the default version in `Dockerfile.local`, rebuild the local image, and verify login and realm import.
5. Push `abia-stable` to `origin`.

The dependency scan workflow is configured to scan the default branch, ABIA branches, release branches, and the newest semantic-version tag. GitHub runs scheduled workflows from the repository's default branch; the workflow must be present on that branch for the daily schedule to run. `workflow_dispatch` remains available from `abia-stable`.

Keep the upstream push URL disabled. Do not force-push a branch with an active review.
