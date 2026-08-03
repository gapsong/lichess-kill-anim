# cburnett piece set (vendored for the bake harness)

The 12 SVGs are the lichess default piece set ("cburnett") by Colin M.L. Burnett,
copied verbatim from the lichess source tree
(https://github.com/lichess-org/lila/tree/master/public/piece/cburnett),
license: GPLv2+ (see lila's COPYING.md piece-set license table).

They are used ONLY by `scripts/debug/bake-gallery-webp/` so the baked gallery
tiles show the exact same piece art as lichess without depending on a CDN or a
live lichess page. They are not part of any production build output.
