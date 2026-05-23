-- Required extensions for MESH.
-- postgis: geography(point, 4326) on suburbs.location + GIST indexes for
--   <-> nearest-neighbour queries used by the Resource Matchmaker agent.
-- pgcrypto: gen_random_uuid() for default primary keys.

create extension if not exists postgis;
create extension if not exists pgcrypto;
