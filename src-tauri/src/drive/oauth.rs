//! Google sign-in for a desktop app: the system browser shows Google's consent page and
//! sends the result back to a one-time local address (loopback redirect with PKCE).

use std::time::Duration;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use dashboard_core::AppError;
use reqwest::Url;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use crate::error::CommandResult;

const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
/// Only files this app creates; the rest of the user's Drive stays out of reach.
const SCOPE: &str = "https://www.googleapis.com/auth/drive.file";
const SIGN_IN_TIMEOUT: Duration = Duration::from_secs(300);

const DONE_PAGE: &str = "<!doctype html><meta charset=utf-8><title>DataBoard</title>\
    <body style=\"font-family:system-ui;text-align:center;padding-top:20vh\">\
    <h2>Google Drive tersambung</h2><p>Kamu bisa menutup tab ini dan kembali ke DataBoard.</p>";

/// The Google OAuth client ("Desktop app" type) this build of the app signs in with.
pub struct Client {
    pub id: String,
    pub secret: String,
}

/// Credentials from the environment at run time (handy in development), else the ones
/// compiled in at build time. `None` means Drive upload is not set up in this build.
pub fn client() -> Option<Client> {
    let read = |name: &str, built_in: Option<&'static str>| {
        std::env::var(name)
            .ok()
            .or_else(|| built_in.map(str::to_owned))
            .filter(|value| !value.trim().is_empty())
    };
    Some(Client {
        id: read(
            "DATABOARD_GOOGLE_CLIENT_ID",
            option_env!("DATABOARD_GOOGLE_CLIENT_ID"),
        )?,
        secret: read(
            "DATABOARD_GOOGLE_CLIENT_SECRET",
            option_env!("DATABOARD_GOOGLE_CLIENT_SECRET"),
        )?,
    })
}

/// A random URL-safe string (two v4 UUIDs: 244 random bits).
fn random_token() -> String {
    format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    )
}

/// PKCE pair: the secret verifier and its SHA-256 challenge.
pub struct Pkce {
    pub verifier: String,
    pub challenge: String,
}

pub fn pkce() -> Pkce {
    let verifier = random_token();
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    Pkce {
        verifier,
        challenge,
    }
}

pub fn new_state() -> String {
    random_token()
}

/// The Google page to open in the browser.
pub fn auth_url(client_id: &str, redirect_uri: &str, challenge: &str, state: &str) -> String {
    let mut url = Url::parse(AUTH_URL).expect("constant URL is valid");
    url.query_pairs_mut()
        .append_pair("client_id", client_id)
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", SCOPE)
        .append_pair("code_challenge", challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", state)
        // Ask for a refresh token so the user signs in only once.
        .append_pair("access_type", "offline")
        .append_pair("prompt", "consent");
    url.into()
}

/// What one request to the local address means.
#[derive(Debug, PartialEq, Eq)]
enum Redirect {
    /// The sign-in result carrying the authorization code.
    Code(String),
    /// Google reported a refusal, or the state did not match.
    Refused(String),
    /// Something else, like the browser asking for a favicon.
    Unrelated,
}

/// Reads the first line of an HTTP request (`GET /?code=…&state=… HTTP/1.1`).
fn parse_redirect(request_line: &str, expected_state: &str) -> Redirect {
    let Some(target) = request_line.split_whitespace().nth(1) else {
        return Redirect::Unrelated;
    };
    let Ok(url) = Url::parse(&format!("http://127.0.0.1{target}")) else {
        return Redirect::Unrelated;
    };
    let param = |name: &str| {
        url.query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    };
    if let Some(error) = param("error") {
        return Redirect::Refused(error);
    }
    match (param("code"), param("state")) {
        (Some(code), Some(state)) if state == expected_state => Redirect::Code(code),
        (Some(_), _) => Redirect::Refused("state mismatch".into()),
        _ => Redirect::Unrelated,
    }
}

/// Waits until the browser comes back with the sign-in result, or gives up after a while.
pub async fn wait_for_code(listener: TcpListener, state: &str) -> CommandResult<String> {
    let wait = async {
        loop {
            let (mut stream, _) = listener.accept().await?;
            let mut buffer = [0_u8; 4096];
            let read = stream.read(&mut buffer).await?;
            let request = String::from_utf8_lossy(&buffer[..read]);
            let outcome = parse_redirect(request.lines().next().unwrap_or_default(), state);

            let body = if matches!(outcome, Redirect::Code(_)) {
                DONE_PAGE
            } else {
                ""
            };
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\
                 Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            stream.write_all(response.as_bytes()).await?;

            match outcome {
                Redirect::Code(code) => return Ok(code),
                Redirect::Refused(reason) => {
                    return Err(AppError::external(format!(
                        "Google sign-in was refused: {reason}"
                    )))
                }
                Redirect::Unrelated => {}
            }
        }
    };
    tokio::time::timeout(SIGN_IN_TIMEOUT, wait)
        .await
        .map_err(|_| AppError::external("Google sign-in timed out"))?
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
}

async fn token_request(
    http: &reqwest::Client,
    form: &[(&str, &str)],
) -> CommandResult<TokenResponse> {
    let response = http
        .post(TOKEN_URL)
        .form(form)
        .send()
        .await
        .map_err(AppError::external)?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().await.unwrap_or_default();
        return Err(AppError::external(format!(
            "Google token request failed ({status}): {detail}"
        )));
    }
    response.json().await.map_err(AppError::external)
}

/// Trades the authorization code for tokens. Returns `(access_token, refresh_token)`.
pub async fn exchange_code(
    http: &reqwest::Client,
    client: &Client,
    code: &str,
    verifier: &str,
    redirect_uri: &str,
) -> CommandResult<(String, String)> {
    let tokens = token_request(
        http,
        &[
            ("client_id", &client.id),
            ("client_secret", &client.secret),
            ("code", code),
            ("code_verifier", verifier),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
        ],
    )
    .await?;
    let refresh = tokens
        .refresh_token
        .ok_or_else(|| AppError::external("Google did not return a refresh token"))?;
    Ok((tokens.access_token, refresh))
}

/// Gets a fresh access token from the stored refresh token.
pub async fn refresh(
    http: &reqwest::Client,
    client: &Client,
    refresh_token: &str,
) -> CommandResult<String> {
    let tokens = token_request(
        http,
        &[
            ("client_id", &client.id),
            ("client_secret", &client.secret),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ],
    )
    .await?;
    Ok(tokens.access_token)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_challenge_is_the_hash_of_the_verifier() {
        let pair = pkce();
        assert_eq!(pair.verifier.len(), 64);
        assert_eq!(
            pair.challenge,
            URL_SAFE_NO_PAD.encode(Sha256::digest(pair.verifier.as_bytes()))
        );
        assert_ne!(pkce().verifier, pair.verifier);
    }

    #[test]
    fn auth_url_carries_the_request() {
        let url = auth_url("id-1", "http://127.0.0.1:5000", "chal", "st");
        assert!(url.starts_with(AUTH_URL));
        assert!(url.contains("client_id=id-1"));
        assert!(url.contains("redirect_uri=http%3A%2F%2F127.0.0.1%3A5000"));
        assert!(url.contains("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file"));
        assert!(url.contains("code_challenge_method=S256"));
    }

    #[test]
    fn reads_the_redirect() {
        let ok = "GET /?state=abc&code=4%2Fxyz&scope=x HTTP/1.1";
        assert_eq!(parse_redirect(ok, "abc"), Redirect::Code("4/xyz".into()));
        assert_eq!(
            parse_redirect(ok, "other"),
            Redirect::Refused("state mismatch".into())
        );
        assert_eq!(
            parse_redirect("GET /?error=access_denied&state=abc HTTP/1.1", "abc"),
            Redirect::Refused("access_denied".into())
        );
        assert_eq!(
            parse_redirect("GET /favicon.ico HTTP/1.1", "abc"),
            Redirect::Unrelated
        );
        assert_eq!(parse_redirect("", "abc"), Redirect::Unrelated);
    }

    #[tokio::test]
    async fn local_listener_returns_the_code() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let browser = tokio::spawn(async move {
            // First an unrelated request, then the real redirect.
            for path in ["/favicon.ico", "/?code=the-code&state=s1"] {
                let mut stream = tokio::net::TcpStream::connect(address).await.unwrap();
                stream
                    .write_all(format!("GET {path} HTTP/1.1\r\n\r\n").as_bytes())
                    .await
                    .unwrap();
                let mut reply = String::new();
                stream.read_to_string(&mut reply).await.unwrap();
                assert!(reply.starts_with("HTTP/1.1 200 OK"));
            }
        });
        assert_eq!(wait_for_code(listener, "s1").await.unwrap(), "the-code");
        browser.await.unwrap();
    }
}
