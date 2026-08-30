// Picsum Photos (https://picsum.photos) is a free placeholder-image service
// designed specifically for hotlinking demo/dev images — no attribution
// required for this kind of use. We seed the "random" image deterministically
// from the property's own id/slug so the same property always shows the same
// picture instead of a different random one on every reload.

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) + 1; // picsum seed range
}

export function stockPhotoUrl(seedKey, width = 640, height = 420) {
  const seed = seedFromString(String(seedKey || "rentcheck"));
  return `https://picsum.photos/seed/rentcheckbd-${seed}/${width}/${height}`;
}

export function stockAreaPhotoUrl(areaName, width = 480, height = 220) {
  return stockPhotoUrl(`area-${areaName}`, width, height);
}
