#include "Noise.hpp"

namespace Noise {

float perlin3D(Coor3D pos) {
  // fake perlin noise presented here
  return pos.y;
}

bool isSolid(Coor3D pos) {
  float rand = perlin3D(pos);

  // if using single threhold
  return rand < 0;

  // if using duel threhold
  //   return rand > -1 && rand < 1;
}

} // namespace Noise
