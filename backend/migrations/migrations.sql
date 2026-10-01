-- ============================================================
-- AgriTwin
-- Initial migration
-- PostgreSQL
-- ============================================================


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- USER_PROFILE
-- ============================================================

CREATE TABLE user_profile (
    username VARCHAR(255) PRIMARY KEY,

    language VARCHAR(50) NOT NULL DEFAULT 'ca',

    units VARCHAR(50) NOT NULL DEFAULT 'metric',

    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    weather_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    irrigation_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    theme VARCHAR(50) NOT NULL DEFAULT 'system',

    CONSTRAINT fk_user_profile_user
        FOREIGN KEY (username)
        REFERENCES users(username)
        ON DELETE CASCADE
);


-- ============================================================
-- USER_CONSENTS
-- ============================================================

CREATE TABLE user_consents (
    id SERIAL PRIMARY KEY,

    username VARCHAR(255) NOT NULL,

    document_type VARCHAR(100) NOT NULL,

    document_version VARCHAR(50) NOT NULL,

    accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_consents_user
        FOREIGN KEY (username)
        REFERENCES users(username)
        ON DELETE CASCADE
);


-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX idx_user_consents_username
    ON user_consents(username);