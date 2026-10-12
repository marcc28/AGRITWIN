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

CREATE TABLE anunces (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtile VARCHAR(255),
    agent VARCHAR(255),
    content TEXT,    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conte_mercat (
    id SERIAL PRIMARY KEY,
    product VARCHAR(255) NOT NULL,
    tecnical_name VARCHAR(255),
    price NUMERIC(10, 2) NOT NULL,
    price_per_kg NUMERIC(10, 2),
    left_units INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX idx_user_consents_username
    ON user_consents(username);

<<<<<<< HEAD

INSERT INTO public.anunces (id, title, subtile, agent, content, created_at) VALUES
(1, 'Oferta de tomàquets', 'Tomàquets ecològics', 'AgriTwin', 'Tomàquets ecològics disponibles a bon preu aquesta setmana, amb diferents formats per a venda directa.', '2026-10-06 08:15:32.112543'),
(2, 'Nova línia d''ajudes per a joves agricultors', 'Política agrària', 'Departament d''Agricultura', 'El Departament d''Agricultura anuncia una nova línia d''ajudes directes per a joves agricultors, amb un màxim de 15.000€ per explotació.', '2026-10-06 09:42:18.524697'),
(3, 'Preu de la patata a l''alça', 'Mercat de la patata', 'AgriTwin', 'El preu mitjà de la patata registra un increment durant aquesta setmana a causa de la menor oferta disponible al mercat.', '2026-10-06 10:27:44.221834'),
(4, 'Campanya de recol·lecció de poma', 'Fruita de tardor', 'Cooperativa del Segrià', 'Comença la campanya de recol·lecció de poma de tardor. Les primeres varietats presenten una bona qualitat i un calibre homogeni.', '2026-10-06 11:05:19.782341'),
(5, 'Augment de la demanda de productes ecològics', 'Tendències del mercat', 'AgriTwin', 'La demanda de productes agrícoles certificats com a ecològics continua creixent, especialment en fruites i hortalisses de temporada.', '2026-10-06 11:48:27.345912'),
(6, 'Previsions de pluja per al cap de setmana', 'Meteorologia agrícola', 'Servei Meteorològic', 'Les previsions indiquen precipitacions generalitzades durant el cap de setmana. Es recomana revisar les tasques de recol·lecció previstes.', '2026-10-06 12:16:53.118472'),
(7, 'Nova oferta de blat', 'Cereals', 'Cooperativa Agrària', 'Disponible una nova partida de blat amb un preu competitiu per a explotacions ramaderes i transformadors locals.', '2026-10-06 12:54:41.672315'),
(8, 'Increment del preu de l''oli d''oliva', 'Oli d''oliva', 'Observatori Agroalimentari', 'Els preus de l''oli d''oliva mantenen una tendència alcista aquesta temporada a causa de la reducció de la producció en diverses zones productores.', '2026-10-06 13:21:09.456781'),
(9, 'Disponibles caixes de pebrots', 'Hortalisses', 'AgriTwin', 'Nova partida de pebrots vermells i verds disponible per a venda. Producte fresc procedent de productors locals.', '2026-10-06 13:47:35.891234'),
(10, 'Ajuts per a la modernització de regadius', 'Ajuts agrícoles', 'Departament d''Agricultura', 'S''obre una nova convocatòria d''ajuts destinada a la modernització de sistemes de reg i a la reducció del consum d''aigua.', '2026-10-06 14:12:26.337845'),
(11, 'Mercat estable de la ceba', 'Mercat de l''hortalissa', 'AgriTwin', 'Els preus de la ceba es mantenen estables aquesta setmana després de diverses setmanes amb fluctuacions importants.', '2026-10-06 14:39:52.774321'),
(12, 'Nova collita d''ametlles', 'Fruits secs', 'Cooperativa del Segrià', 'Les primeres ametlles de la nova collita ja estan disponibles. Els productors destaquen la bona qualitat del gra i els baixos nivells d''humitat.', '2026-10-06 15:04:18.225634'),
(13, 'Cost del fertilitzant nitrogenat', 'Costos de producció', 'AgriTwin', 'El preu dels fertilitzants nitrogenats registra una lleugera baixada respecte al mes anterior, fet que pot reduir els costos de producció.', '2026-10-06 15:28:47.663219'),
(14, 'Recomanacions per a la sembra de tardor', 'Consells agrícoles', 'Servei d''Assessorament Agrari', 'Els tècnics recomanen preparar els terrenys amb antelació i revisar la humitat del sòl abans d''iniciar les sembres de tardor.', '2026-10-06 15:52:31.448762'),
(15, 'Nova oferta de carbassa', 'Productes de temporada', 'AgriTwin', 'Disponible una nova partida de carbassa de temporada, ideal per a venda directa i distribució a comerços locals.', '2026-10-06 16:18:05.912347'),
(16, 'La demanda de cereals es manté estable', 'Mercat de cereals', 'Observatori Agroalimentari', 'La demanda de blat i ordi es manté estable durant les darreres setmanes, amb una activitat comercial similar a la de l''any anterior.', '2026-10-06 16:43:29.381526'),
(17, 'Programa de digitalització agrícola', 'Tecnologia agrícola', 'AgriTwin', 'Es presenta un nou programa destinat a facilitar la incorporació d''eines digitals per controlar cultius, costos i rendiment de les explotacions.', '2026-10-06 17:07:14.672893'),
(18, 'Bones perspectives per a la campanya d''olives', 'Olivicultura', 'Cooperativa Agrària', 'Les primeres estimacions apunten a una campanya d''olives amb bons rendiments en diverses zones productores.', '2026-10-06 17:31:46.225781'),
(19, 'Preu de la fruita de pinyol', 'Mercat de fruita', 'AgriTwin', 'Els preus de la fruita de pinyol es mantenen estables després del final de la temporada d''estiu i l''entrada de nous productes de tardor.', '2026-10-06 18:02:37.519624'),
(20, 'Recomanacions abans de les primeres gelades', 'Prevenció agrícola', 'Servei Meteorològic', 'Es recomana als agricultors revisar els sistemes de protecció dels cultius sensibles davant la possibilitat de temperatures baixes durant les pròximes setmanes.', '2026-10-06 18:34:21.847362');




INSERT INTO public.conte_mercat
(id, product, tecnical_name, price, price_per_kg, left_units, created_at)
VALUES
(1, 'Tomàquet', 'Solanum lycopersicum', '2.50', '2.50', 100, '2026-10-06 08:15:22.191494'),
(2, 'Patata', 'Solanum tuberosum', '1.35', '1.35', 250, '2026-10-06 08:42:17.381245'),
(3, 'Ceba', 'Allium cepa', '1.20', '1.20', 180, '2026-10-06 09:05:43.572816'),
(4, 'Poma Golden', 'Malus domestica', '2.10', '2.10', 150, '2026-10-06 09:31:28.814532'),
(5, 'Pera Conference', 'Pyrus communis', '2.35', '2.35', 120, '2026-10-06 09:57:41.263719'),
(6, 'Pebrot vermell', 'Capsicum annuum', '3.20', '3.20', 85, '2026-10-06 10:24:16.492831'),
(7, 'Pebrot verd', 'Capsicum annuum', '2.80', '2.80', 95, '2026-10-06 10:48:53.721654'),
(8, 'Carbassa', 'Cucurbita maxima', '1.75', '1.75', 140, '2026-10-06 11:16:34.158927'),
(9, 'Carbassó', 'Cucurbita pepo', '2.15', '2.15', 75, '2026-10-06 11:43:27.641385'),
(10, 'Enciam', 'Lactuca sativa', '1.10', '4.40', 200, '2026-10-06 12:08:19.375421'),
(11, 'Pastanaga', 'Daucus carota', '1.45', '1.45', 175, '2026-10-06 12:34:52.817263'),
(12, 'All', 'Allium sativum', '5.90', '5.90', 60, '2026-10-06 13:02:41.529814'),
(13, 'Mongeta verda', 'Phaseolus vulgaris', '4.25', '4.25', 70, '2026-10-06 13:27:18.462935'),
(14, 'Blat', 'Triticum aestivum', '0.32', '0.32', 1200, '2026-10-06 13:51:36.781245'),
(15, 'Ordi', 'Hordeum vulgare', '0.29', '0.29', 950, '2026-10-06 14:18:24.351762'),
(16, 'Ametlla', 'Prunus dulcis', '7.80', '7.80', 45, '2026-10-06 14:46:17.628391'),
(17, 'Oliva', 'Olea europaea', '1.85', '1.85', 320, '2026-10-06 15:13:49.472816'),
(18, 'Albergínia', 'Solanum melongena', '2.65', '2.65', 65, '2026-10-06 15:42:31.815294'),
(19, 'Coliflor', 'Brassica oleracea var. botrytis', '2.40', '2.40', 90, '2026-10-06 16:11:26.394728'),
(20, 'Bròquil', 'Brassica oleracea var. italica', '2.75', '2.75', 80, '2026-10-06 16:38:54.721635');
=======
>>>>>>> d0c4216 (33 feat(iot/backend): ESP32 MQTT simulator, subscriber service and unit tests)
-- ============================================================
-- TELEMETRIA (IoT Sensors Data)
-- ============================================================

CREATE TABLE telemetria (
    id SERIAL PRIMARY KEY,
    
    device_id VARCHAR(255) NOT NULL,
    
    timestamp TIMESTAMP NOT NULL,
    
    temperatura NUMERIC,
    
    umidita_aria NUMERIC,
    
    umidita_terreno NUMERIC,
    
    luce NUMERIC
);

-- ============================================================
-- INDEX FOR TELEMETRIA
-- ============================================================

CREATE INDEX idx_telemetria_device_timestamp
<<<<<<< HEAD
    ON telemetria(device_id, timestamp);
=======
    ON telemetria(device_id, timestamp);
>>>>>>> d0c4216 (33 feat(iot/backend): ESP32 MQTT simulator, subscriber service and unit tests)
