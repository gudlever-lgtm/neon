# Neon Rally v0.5 REST + WebSocket API

Base URL: `/api`; JSON over HTTPS. Beskyttede kald skal have `Authorization: Bearer <session token>`.

## REST

| Metode | Endpoint | Payload / funktion | Auth |
|---|---|---|---|
| GET | `/api/health` | Status, DB ping | Nej |
| POST | `/api/auth/register` | `{ "username":"NeonFox", "password":"my-long-password" }` → `201 {token,user}` | Nej |
| POST | `/api/auth/login` | Samme → `{token,user}` | Nej |
| POST | `/api/auth/logout` | Sletter aktiv token | Ja |
| GET | `/api/me` | Profil, wins/losses/points | Ja |
| GET | `/api/players?q=Neo&limit=25&offset=0` | Søg **begyndelsen af** brugernavn, pagineret liste, onlineflag | Ja |
| GET | `/api/leaderboard` | Global Top 10 samt pointsystem | Nej |
| GET | `/api/invitations` | Indgående og udgående invitationer | Ja |
| POST | `/api/invitations` | `{ "recipientId": 42 }` | Ja |
| POST | `/api/invitations/:id/accept` | Acceptér, opret kamp i transaktion | Ja, modtager |
| POST | `/api/invitations/:id/decline` | Afvis | Ja, modtager |
| POST | `/api/invitations/:id/cancel` | Annuller | Ja, afsender |
| GET | `/api/matches/current` | Aktiv kamp eller null | Ja |
| GET | `/api/matches/:id` | Kampresultat (kun deltagere) | Ja |
| POST | `/api/matches/:id/forfeit` | Opgiv kamp (tab) | Ja, deltager |

REST-fejl: passende HTTP-status og `{ "error": "Dansk fejltekst" }`. Typiske status: `400`, `401`, `403`, `404`, `409`, `429`, `500`.

## WebSocket `/ws` (WSS i produktion)

Efter forbindelsen åbner, skal klienten inden for 5 sekunder sende:

```json
{"type":"auth","token":"<token from login>"}
```

Serveren svarer med `authenticated`. Derefter må en deltager sende batposition, højst ca. 40 gange/sekund (serveren begrænser input). Koordinater er inden for spillebanens bredde 390:

```json
{"type":"paddle","matchId":12,"x":225}
```

Server-events: `authenticated`, `invitation_received`, `match_started`, `game_state`, `point`, `match_finished`, `server_error`.

Eksempel på autoritativt `game_state`:

```json
{
  "type":"game_state","matchId":12,"topId":3,"bottomId":4,
  "topX":200,"bottomX":225,"topScore":4,"bottomScore":2,
  "ball":{"x":145,"y":310},"status":"active","readyMs":0
}
```

Kampresultatet kan **ikke** indrapporteres af klienten. Serveren spiller til 7 point og opdaterer `matches`. `leaderboard` er en VIEW beregnet over afsluttede kampe: 1.000 startpoint, +30 for sejr og −10 for nederlag. Ingen point ved annullerede kampe. Resultater ved opgivelse/netværkstab tæller, når serveren har afgjort dem.

## Eksempel med curl

```sh
curl -s -X POST https://play.example.dk/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"NeonFox","password":"a-long-password-123"}'

curl -s -H "Authorization: Bearer $TOKEN" \
  'https://play.example.dk/api/players?q=Neo'

curl -s -H "Authorization: Bearer $TOKEN" \
  https://play.example.dk/api/leaderboard
```

`$TOKEN` skal erstattes med `token` fra login/respons. Invitationer kan også sendes til offlinebrugere; de bliver synlige næste gang brugeren logger ind, hvis de ikke er udløbet (10 minutters udløb i denne MVP).
