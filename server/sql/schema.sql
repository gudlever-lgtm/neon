-- Neon / MariaDB 10.6+ / utf8mb4. Database identifier retained for compatibility.
CREATE DATABASE IF NOT EXISTS neon_rally CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE neon_rally;

CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(24) NOT NULL,
 username_key VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 last_seen_at DATETIME(3) NULL,
 is_disabled TINYINT(1) NOT NULL DEFAULT 0,
 UNIQUE KEY uq_username_key (username_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_session_token (token_hash),
 KEY ix_sessions_user (user_id),
 KEY ix_sessions_expiry (expires_at),
 CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitations (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 sender_id BIGINT UNSIGNED NOT NULL,
 recipient_id BIGINT UNSIGNED NOT NULL,
 status ENUM('pending','accepted','declined','cancelled','expired') NOT NULL DEFAULT 'pending',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 expires_at DATETIME(3) NOT NULL,
 responded_at DATETIME(3) NULL,
 KEY ix_recipient_status (recipient_id,status,created_at),
 KEY ix_sender_status (sender_id,status,created_at),
 CONSTRAINT fk_inv_sender FOREIGN KEY (sender_id) REFERENCES users(id),
 CONSTRAINT fk_inv_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
 CONSTRAINT ck_not_self CHECK (sender_id <> recipient_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS matches (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 invitation_id BIGINT UNSIGNED NOT NULL,
 player_top_id BIGINT UNSIGNED NOT NULL,
 player_bottom_id BIGINT UNSIGNED NOT NULL,
 status ENUM('active','finished','cancelled') NOT NULL DEFAULT 'active',
 top_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
 bottom_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
 winner_id BIGINT UNSIGNED NULL,
 finish_reason ENUM('score','forfeit','disconnect','server_restart') NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 finished_at DATETIME(3) NULL,
 UNIQUE KEY uq_match_invitation (invitation_id),
 KEY ix_match_top (player_top_id,status),
 KEY ix_match_bottom (player_bottom_id,status),
 KEY ix_match_winner (winner_id),
 CONSTRAINT fk_match_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id),
 CONSTRAINT fk_match_top FOREIGN KEY (player_top_id) REFERENCES users(id),
 CONSTRAINT fk_match_bottom FOREIGN KEY (player_bottom_id) REFERENCES users(id),
 CONSTRAINT fk_match_winner FOREIGN KEY (winner_id) REFERENCES users(id),
 CONSTRAINT ck_match_distinct CHECK (player_top_id <> player_bottom_id)
) ENGINE=InnoDB;

-- Wins and ranking derived from finished server-authoritative matches, never client supplied.
CREATE OR REPLACE VIEW leaderboard AS
 SELECT u.id AS user_id, u.username,
 COALESCE(SUM(CASE WHEN m.status='finished' AND m.winner_id=u.id THEN 1 ELSE 0 END),0) AS wins,
 COALESCE(SUM(CASE WHEN m.status='finished' AND m.winner_id<>u.id THEN 1 ELSE 0 END),0) AS losses,
 COALESCE(SUM(CASE WHEN m.status='finished' AND m.winner_id=u.id THEN 30 WHEN m.status='finished' AND m.winner_id<>u.id THEN -10 ELSE 0 END),0)+1000 AS points
 FROM users u
 LEFT JOIN matches m ON (m.player_top_id=u.id OR m.player_bottom_id=u.id)
 WHERE u.is_disabled=0 GROUP BY u.id,u.username;
