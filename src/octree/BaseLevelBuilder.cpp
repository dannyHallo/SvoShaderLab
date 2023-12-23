#include "BaseLevelBuilder.hpp"

namespace BaseLevelBuilder {

void build(ImageData *imageData, Coor3D const &imageSize) {
  int const y = imageSize.y / 2;
  // only store a single layer
  for (int x = 0; x < imageSize.x; ++x) {
    for (int z = 0; z < imageSize.z; ++z) {
      imageData->imageStore({x, y, z}, 0x0000FFFF);
    }
  }
}

} // namespace BaseLevelBuilder
