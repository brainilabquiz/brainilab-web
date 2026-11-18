-- Extend the cosmetic allowlist used to render public avatars.
-- Compare the exact installed definition and change only the four palette arrays.
do $avatar_palettes$
declare
  before_digest constant text := '0be61b8bd741ebc03b2b799e129ed61a';
  after_digest constant text := 'b1d5f139d9397e322e7ca0c3be5a800b';
  definition text := pg_catalog.pg_get_functiondef('brainilab_private.player_avatar(uuid)'::regprocedure);
  updated text := definition;
begin
  if pg_catalog.md5(definition) = after_digest then return; end if;
  if pg_catalog.md5(definition) <> before_digest then
    raise exception 'Avatar rendering function changed during palette review';
  end if;
  updated := pg_catalog.replace(updated, '"skin":[["sand",0],["peach",0],["honey",0],["cocoa",0],["umber",0],["ebony",0],["porcelain",0],["rose-beige",0],["almond",0],["olive",0],["toffee",0],["walnut",0],["espresso",0]]', '"skin":[["sand",0],["peach",0],["honey",0],["cocoa",0],["umber",0],["ebony",0],["porcelain",0],["rose-beige",0],["almond",0],["olive",0],["toffee",0],["walnut",0],["espresso",0],["ivory-peach",0],["golden-beige",0],["neutral-tan",0],["copper-brown",0],["deep-mocha",0],["cool-mahogany",0]]');
  updated := pg_catalog.replace(updated, '"hair":[["sweep",0],["curls",0],["bob",0],["crop",0],["bald",0],["ponytail",0],["waves",0],["braids",0],["pixie",0],["locs",0],["buns",0],["undercut",0],["fro",0],["quiff",0],["pigtails",0],["mohawk",0],["antenna",0]]', '"hair":[["sweep",0],["curls",0],["bob",0],["crop",0],["bald",0],["ponytail",0],["waves",0],["braids",0],["pixie",0],["locs",0],["buns",0],["undercut",0],["fro",0],["quiff",0],["pigtails",0],["mohawk",0],["antenna",0],["buzz",0],["curtain",0],["side-braid",0],["twists",0],["stacked-bob",0],["topknot",0],["spiral",0]]');
  updated := pg_catalog.replace(updated, '"hairColor":[["brown",0],["black",0],["blond",0],["auburn",0],["silver",0],["chestnut",0],["ginger",0],["platinum",0],["plum",0],["lagoon",0],["lavender",0],["rose",0],["copper-sun",0],["ink-tide",0],["berry-frost",0],["comet-white",0],["afterglow",0]]', '"hairColor":[["brown",0],["black",0],["blond",0],["auburn",0],["silver",0],["chestnut",0],["ginger",0],["platinum",0],["plum",0],["lagoon",0],["lavender",0],["rose",0],["copper-sun",0],["ink-tide",0],["berry-frost",0],["comet-white",0],["afterglow",0],["dark-ash",0],["moss-brown",0],["strawberry-blond",0],["warm-grey",0],["molten-copper",0],["midnight-violet",0],["marine-ink",0],["rosewood-gold",0]]');
  updated := pg_catalog.replace(updated, '"shirt":[["navy",0],["green",0],["orange",0],["blue",0],["berry",0],["cream",0],["burgundy",0],["charcoal",0],["mint",0],["yellow",0],["lavender",0],["varsity",0],["reef",0],["orchid",0],["eclipse",0],["sherbet",0]]', '"shirt":[["navy",0],["green",0],["orange",0],["blue",0],["berry",0],["cream",0],["burgundy",0],["charcoal",0],["mint",0],["yellow",0],["lavender",0],["varsity",0],["reef",0],["orchid",0],["eclipse",0],["sherbet",0],["forest",0],["lilac-mist",0],["peacock",0],["brick",0],["forest-sand",0],["indigo-ice",0],["wine-rose",0],["graphite-citrus",0]]');
  if pg_catalog.md5(updated) <> after_digest then
    raise exception 'Palette changes differ from the reviewed definition';
  end if;
  execute updated;
end;
$avatar_palettes$;
