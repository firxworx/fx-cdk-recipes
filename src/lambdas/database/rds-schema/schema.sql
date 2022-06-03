CREATE extension IF NOT EXISTS "uuid-ossp";

-- CREATE TABLE "public"."User" ()

CREATE TABLE users (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY NOT NULL,
  bio TEXT,
  "userId" INTEGER UNIQUE NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "public"."users"(id)
);

CREATE TABLE accounts (
  user_id SERIAL PRIMARY KEY NOT NULL,
  email VARCHAR (255) UNIQUE NOT NULL,
  username VARCHAR (60) UNIQUE NOT NULL,
  password VARCHAR (60) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  last_login_at TIMESTAMPTZ
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY NOT NULL,
  title VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "publishedAt" TIMESTAMPTZ NOT NULL,
  content TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  "authorId" INTEGER NOT NULL,
  FOREIGN KEY ("authorId") REFERENCES "public"."User"(id)
);
