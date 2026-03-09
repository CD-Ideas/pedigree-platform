-- ============================================================
-- Migration 0001 — Dog Pedigree Platform Initial Schema
-- PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE "UserRole"           AS ENUM ('ADMIN','BREEDER','PUBLIC');
CREATE TYPE "Sex"                AS ENUM ('MALE','FEMALE');
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING','APPROVED','REJECTED','REVOKED');
CREATE TYPE "LitterStatus"       AS ENUM ('PLANNED','WHELPED','REGISTERED');
CREATE TYPE "HealthTestResult"   AS ENUM ('PASS','FAIL','CARRIER','CLEAR','AFFECTED','INCONCLUSIVE');

-- Users
CREATE TABLE users (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  role              "UserRole"   NOT NULL DEFAULT 'PUBLIC',
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  phone             VARCHAR(30),
  is_email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users (email);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  token      VARCHAR(512) NOT NULL UNIQUE,
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_rt_user ON refresh_tokens (user_id);
CREATE INDEX idx_rt_token ON refresh_tokens (token);

-- Kennels
CREATE TABLE kennels (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(150) NOT NULL UNIQUE,
  slug        VARCHAR(160) NOT NULL UNIQUE,
  prefix      VARCHAR(50),
  description TEXT,
  established INT,
  country     CHAR(2),
  region      VARCHAR(100),
  city        VARCHAR(100),
  website     VARCHAR(255),
  email       VARCHAR(255),
  phone       VARCHAR(30),
  logo_url    VARCHAR(512),
  banner_url  VARCHAR(512),
  is_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kennels_slug ON kennels (slug);

-- Breeders
CREATE TABLE breeders (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(150) NOT NULL,
  slug         VARCHAR(160) NOT NULL UNIQUE,
  bio          TEXT,
  country      CHAR(2),
  region       VARCHAR(100),
  city         VARCHAR(100),
  website      VARCHAR(255),
  avatar_url   VARCHAR(512),
  is_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_public    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_breeders_slug ON breeders (slug);
CREATE INDEX idx_breeders_user ON breeders (user_id);

-- Kennel members
CREATE TABLE kennel_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  kennel_id  UUID        NOT NULL REFERENCES kennels(id)  ON DELETE CASCADE,
  breeder_id UUID        NOT NULL REFERENCES breeders(id) ON DELETE CASCADE,
  role       VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kennel_id, breeder_id)
);

-- Dogs (self-referential for pedigree)
CREATE TABLE dogs (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  reg_number          VARCHAR(100) UNIQUE,
  name                VARCHAR(200) NOT NULL,
  slug                VARCHAR(220) NOT NULL UNIQUE,
  call_name           VARCHAR(100),
  breed               VARCHAR(100) NOT NULL,
  sex                 "Sex"        NOT NULL,
  dob                 DATE,
  dod                 DATE,
  color               VARCHAR(100),
  weight_lbs          DECIMAL(5,2),
  weight_kg           DECIMAL(5,2),
  titles              TEXT[]       NOT NULL DEFAULT '{}',
  country             CHAR(2),
  about               TEXT,
  profile_image_url   VARCHAR(512),
  is_public           BOOLEAN      NOT NULL DEFAULT TRUE,
  is_approved         BOOLEAN      NOT NULL DEFAULT FALSE,
  -- pedigree
  sire_id             UUID         REFERENCES dogs(id) ON DELETE SET NULL,
  dam_id              UUID         REFERENCES dogs(id) ON DELETE SET NULL,
  -- ownership
  owner_breeder_id    UUID         REFERENCES breeders(id) ON DELETE SET NULL,
  owner_kennel_id     UUID         REFERENCES kennels(id)  ON DELETE SET NULL,
  breeder_breeder_id  UUID         REFERENCES breeders(id) ON DELETE SET NULL,
  breeder_kennel_id   UUID         REFERENCES kennels(id)  ON DELETE SET NULL,
  litter_id           UUID,        -- FK added below after litters table
  -- COI cache
  coi_4gen            DECIMAL(8,6),
  coi_6gen            DECIMAL(8,6),
  coi_8gen            DECIMAL(8,6),
  coi_10gen           DECIMAL(8,6),
  coi_updated_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dogs_sire      ON dogs (sire_id);
CREATE INDEX idx_dogs_dam       ON dogs (dam_id);
CREATE INDEX idx_dogs_slug      ON dogs (slug);
CREATE INDEX idx_dogs_reg       ON dogs (reg_number);
CREATE INDEX idx_dogs_owner_b   ON dogs (owner_breeder_id);
CREATE INDEX idx_dogs_owner_k   ON dogs (owner_kennel_id);
CREATE INDEX idx_dogs_breed     ON dogs (breed);
CREATE INDEX idx_dogs_litter    ON dogs (litter_id);
CREATE INDEX idx_dogs_pub       ON dogs (is_public, is_approved);
CREATE INDEX idx_dogs_name_trgm ON dogs USING GIN (name gin_trgm_ops);
CREATE INDEX idx_dogs_titles    ON dogs USING GIN (titles);

-- Dog images
CREATE TABLE dog_images (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_id        UUID        NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  url           VARCHAR(512) NOT NULL,
  s3_key        VARCHAR(512) NOT NULL,
  thumbnail_url VARCHAR(512),
  medium_url    VARCHAR(512),
  caption       VARCHAR(255),
  is_primary    BOOLEAN      NOT NULL DEFAULT FALSE,
  mime_type     VARCHAR(50),
  size_bytes    INT,
  width         INT,
  height        INT,
  uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dog_images_dog ON dog_images (dog_id);
-- Only one primary image per dog
CREATE UNIQUE INDEX idx_dog_images_one_primary ON dog_images (dog_id) WHERE is_primary = TRUE;

-- Pedigree cache
CREATE TABLE pedigrees (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_id           UUID        NOT NULL UNIQUE REFERENCES dogs(id) ON DELETE CASCADE,
  generations      INT         NOT NULL DEFAULT 4,
  tree_json        JSONB       NOT NULL DEFAULT '{}',
  ancestor_count   INT         NOT NULL DEFAULT 0,
  unique_ancestors INT         NOT NULL DEFAULT 0,
  coi_4gen         DECIMAL(8,6),
  coi_6gen         DECIMAL(8,6),
  coi_8gen         DECIMAL(8,6),
  coi_10gen        DECIMAL(8,6),
  built_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pedigrees_dog ON pedigrees (dog_id);
CREATE INDEX idx_pedigrees_tree ON pedigrees USING GIN (tree_json);

-- Litters
CREATE TABLE litters (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  sire_id    UUID           NOT NULL REFERENCES dogs(id),
  dam_id     UUID           NOT NULL REFERENCES dogs(id),
  kennel_id  UUID           REFERENCES kennels(id) ON DELETE SET NULL,
  whelp_date DATE,
  num_males  INT            NOT NULL DEFAULT 0,
  num_females INT           NOT NULL DEFAULT 0,
  num_total  INT            NOT NULL DEFAULT 0,
  status     "LitterStatus" NOT NULL DEFAULT 'WHELPED',
  notes      TEXT,
  is_public  BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_litters_sire   ON litters (sire_id);
CREATE INDEX idx_litters_dam    ON litters (dam_id);
CREATE INDEX idx_litters_kennel ON litters (kennel_id);

-- Back-fill litter FK on dogs now that litters table exists
ALTER TABLE dogs
  ADD CONSTRAINT fk_dogs_litter FOREIGN KEY (litter_id) REFERENCES litters(id) ON DELETE SET NULL;

-- Registrations
CREATE TABLE registrations (
  id             UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_id         UUID                 NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  breeder_id     UUID                 REFERENCES breeders(id) ON DELETE SET NULL,
  registry_name  VARCHAR(100)         NOT NULL,
  reg_number     VARCHAR(100)         NOT NULL,
  reg_date       DATE,
  expires_date   DATE,
  document_url   VARCHAR(512),
  s3_key         VARCHAR(512),
  status         "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
  reviewed_by_id UUID                 REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  rejection_note TEXT,
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  UNIQUE (dog_id, registry_name, reg_number)
);
CREATE INDEX idx_reg_dog    ON registrations (dog_id);
CREATE INDEX idx_reg_status ON registrations (status);

-- Health records
CREATE TABLE health_records (
  id              UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_id          UUID               NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  test_type       VARCHAR(100)       NOT NULL,
  result          "HealthTestResult" NOT NULL,
  result_detail   VARCHAR(255),
  tested_date     DATE,
  lab_name        VARCHAR(150),
  cert_number     VARCHAR(100),
  certificate_url VARCHAR(512),
  s3_key          VARCHAR(512),
  is_public       BOOLEAN            NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_health_dog  ON health_records (dog_id);
CREATE INDEX idx_health_type ON health_records (test_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','kennels','breeders','dogs','pedigrees','litters','registrations']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()', t);
  END LOOP;
END; $$;

-- Recursive CTE helper function for pedigree traversal
CREATE OR REPLACE FUNCTION get_pedigree_tree(p_dog_id UUID, p_gen INT DEFAULT 4)
RETURNS TABLE (
  ancestor_id UUID, name VARCHAR, sex "Sex",
  sire_id UUID, dam_id UUID, dob DATE, color VARCHAR,
  titles TEXT[], generation INT, path UUID[]
) LANGUAGE SQL STABLE AS $$
  WITH RECURSIVE anc AS (
    SELECT id, name, sex, sire_id, dam_id, dob, color, titles, 0 AS generation, ARRAY[id] AS path
    FROM dogs WHERE id = p_dog_id
    UNION ALL
    SELECT p.id, p.name, p.sex, p.sire_id, p.dam_id, p.dob, p.color, p.titles,
           a.generation + 1, a.path || p.id
    FROM anc a JOIN dogs p ON p.id = a.sire_id OR p.id = a.dam_id
    WHERE a.generation < p_gen AND p.id <> ALL(a.path)
  )
  SELECT id, name, sex, sire_id, dam_id, dob, color, titles, generation, path
  FROM anc WHERE generation > 0 ORDER BY generation;
$$;
