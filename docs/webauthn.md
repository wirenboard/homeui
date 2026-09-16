# WebAuthn and passkeys

HomeUI can use a platform authenticator such as Touch ID, Windows Hello, Android screen lock,
or a hardware security key as a second login method. Password login remains available for
recovery.

## Requirements

- A stable DNS name for the controller, for example `wb.example.com`.
- HTTPS with a certificate trusted by the browser.
- The browser must open HomeUI through that DNS name. WebAuthn intentionally does not work on
  the controller's plain-HTTP IP address.
- `python3-fido2` must be installed. The Debian package declares this dependency.
- The authenticator must support discoverable (resident) credentials — true of platform
  authenticators (Touch ID, Windows Hello, Android screen lock) and modern FIDO2 security keys.
  Old U2F-only keys, or keys with very little resident-credential storage, may not work.

Embedded browsers may restrict WebAuthn. If an embedded browser reports `NotAllowedError`, open
the same HTTPS address in Safari, Chrome, Edge, or Firefox. This does not affect password login.

## Backend configuration

Create or edit `/etc/default/wb-homeui-backend` and append the two options to any existing value:

```sh
WB_HOMEUI_BACKEND_OPTIONS="--webauthn-rp-id wb.example.com --webauthn-origin https://wb.example.com"
```

The relying-party ID is a domain name without a scheme, path, or port. The origin is the exact
external HTTPS origin used by the browser, including a non-default port when applicable. The
origin's host must equal the relying-party ID or be its subdomain.

Apply the change:

```sh
systemctl restart wb-homeui-backend
systemctl reload nginx
```

Verify the public endpoint:

```sh
curl -fsS https://wb.example.com/auth/webauthn/config
```

The response should contain `"enabled": true` and the configured `rp_id`.

## Registering and using a passkey

1. Sign in with the existing password through the HTTPS DNS name.
2. Open **Settings → Users** (admin only) and select the key icon next to the account that needs
   a passkey — this opens a dedicated Passkeys dialog for that user, separate from editing their
   login, password, or role.
3. Enter a descriptive device label such as `MacBook Touch ID` and select **Register passkey**
   (or press Enter). This field is only a recognizable label; no key material is pasted into
   HomeUI.
4. Complete the browser, operating-system, or security-key prompt.
5. Sign out. On the login page, select the key icon next to **Sign in** — no username is needed;
   the browser or OS shows a picker for whichever passkeys it holds for this domain.

The WebAuthn ceremony always runs on whichever browser is open to that Passkeys dialog, using
whatever authenticator is available there — not the target user's own device. This means an admin
can register a passkey for another user from the admin's own browser/device; the resulting
passkey then logs in as that user. Treat this the same as setting a user's initial password: only
do it for accounts you're authorized to provision, on a device you trust.

A user may register several passkeys and remove them independently. Deleting a user also deletes
that user's passkeys.

## Recovery and operational notes

- Keep password login enabled and store the administrator password securely.
- Register at least two authenticators before relying on passkeys for routine access.
- Passkeys are bound to the relying-party ID. Changing the DNS name requires registering new
  passkeys under the new name.
- Reverse proxies must preserve the public HTTPS origin. TLS may terminate at the proxy, but the
  browser URL must still match `--webauthn-origin` exactly.
- Challenges are one-time and expire after five minutes. User verification is required.
- Credential private keys never leave the authenticator. HomeUI stores only the public key,
  credential identifier, signature counter, name, and timestamps.
