create table "auth"."user" (
    "id" text not null primary key,
    "name" text not null,
    "email" text not null unique,
    "emailVerified" boolean not null,
    "image" text,
    "createdAt" timestamp default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamp default CURRENT_TIMESTAMP not null
);

create table "auth"."session" (
    "id" text not null primary key,
    "expiresAt" timestamp not null,
    "token" text not null unique,
    "createdAt" timestamp default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamp default CURRENT_TIMESTAMP not null,
    "ipAddress" text,
    "userAgent" text,
    "userId" text not null references "auth"."user" ("id") on delete cascade
);

create table "auth"."account" (
    "id" text not null primary key,
    "accountId" text not null,
    "providerId" text not null,
    "userId" text not null references "auth"."user" ("id") on delete cascade,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp,
    "refreshTokenExpiresAt" timestamp,
    "scope" text,
    "password" text,
    "createdAt" timestamp default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamp default CURRENT_TIMESTAMP not null
);

create table "auth"."verification" (
    "id" text not null primary key,
    "identifier" text not null,
    "value" text not null,
    "expiresAt" timestamp not null,
    "createdAt" timestamp default CURRENT_TIMESTAMP not null,
    "updatedAt" timestamp default CURRENT_TIMESTAMP not null
);
