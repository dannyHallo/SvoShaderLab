#include "BaseLevelBuilder.hpp"

#include <vector>

namespace BaseLevelBuilder {

namespace {
void _buildVoxel(ImageData *imageData, Coor3D const &coor) {
  imageData->imageStore(coor, 0x0000FFFF);
}

void _buildPlane(ImageData *imageData, Coor3D const &imageSize, int const y) {
  for (int x = 0; x < imageSize.x; ++x) {
    for (int z = 0; z < imageSize.z; ++z) {
      if (x == 0 && z == 0) {
        continue;
      }
      _buildVoxel(imageData, {x, y, z});
    }
  }
}
} // namespace

const std::vector<Coor3D> kBuildVoxelCoors{
    {0, 0, 0},
    {0, 0, 1},
    {1, 0, 0},
    {0, 1, 0},

    {3, 3, 3},
};

void build(ImageData *imageData, Coor3D const &imageSize) {
  // _buildPlane(imageData, imageSize, 0);               // bottom plane
  // _buildPlane(imageData, imageSize, imageSize.y - 1); // top plane

  for (auto const &coor : kBuildVoxelCoors) {
    _buildVoxel(imageData, coor);
  }
}

} // namespace BaseLevelBuilder
