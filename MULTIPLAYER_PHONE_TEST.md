# Neon v0.11 – accepttest på to Android-telefoner

Status: **Afventer manuel afprøvning på to fysiske enheder.** Den automatiske E2E-test har bestået mod `https://dulmens.dk/neon`, men erstatter ikke mobiltest.

## Forudsætninger

- To Android-telefoner med den **samme aktuelle Neon-version**. En gammel APK kan ikke bruges til at bekræfte de seneste rettelser.
- Internetforbindelse på begge enheder (helst også en prøve med mobilnet på den ene).
- To separate Neon-konti, som må bruges til test. Brug ikke den tidligere slettede/afsluttede automatiske testkonto.
- Backendens `https://dulmens.dk/neon/api/health` svarer med `ok: true`.

## Kontrolpunkter

| Nr. | Test | Forventet resultat |
| --- | --- | --- |
| 1 | Start appen på begge telefoner | Neon-navn og Neon-ikon vises; ingen Android-standardfigur |
| 2 | Log ind med hver sin konto | Begge lander i online-lobbyen uden fejl |
| 3 | A sender invitation til B | B ser invitationen; den kan accepteres |
| 4 | B accepterer | Begge ser samme kamp og samme score |
| 5 | Spil mindst 10 boldudvekslinger | Begge bat reagerer korrekt; ingen mærkbar låsning |
| 6 | Spil til 7 point | Samme vinder og slutscore vises på begge skærme |
| 7 | Åbn profil og kamphistorik | Kampen findes én gang pr. spiller, med korrekt resultat |
| 8 | Start ny kamp, afbryd B's net kortvarigt (<20 sek.) og genopret | B genindtræder i den eksisterende kamp |
| 9 | Start ny kamp, afbryd B's net i over 20 sek. | A vinder ved disconnect; kampen afsluttes for begge |
| 10 | Log ud, luk appen, åbn igen | Session og navigation håndteres konsistent |

## Registrering

Notér for hver test: telefonmodel, Android-version, tidspunkt, Wi-Fi/mobilnet, resultat (PASS/FAIL), faktisk adfærd og evt. skærmbillede.

Stop og rapportér ved: forskellig slutscore, forkert vinder, dobbelt kampregistrering, fastlåst kamp efter genopkobling eller Android-standardikon.

**Ingen APK fremstilles af denne testplan.** Når build bliver bestilt særskilt, køres først `generate-android-icons.ps1`, dernæst `verify-android-icons.ps1` og til sidst en manuel kontrol på telefonen.
