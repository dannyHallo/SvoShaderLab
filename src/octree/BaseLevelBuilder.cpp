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
      _buildVoxel(imageData, {x, y, z});
    }
  }
}
} // namespace

const std::vector<Coor3D> kBuildVoxelCoors{
    {0, 0, 0},
    {0, 0, 7},
    {0, 7, 0},
    {0, 7, 7},
    {7, 0, 0},
    {7, 0, 7},
    {7, 7, 0},
    {7, 7, 7},

    // {3, 3, 3},
    // {3, 4, 3},
    // {3, 3, 4},
    // {3, 4, 4},
    // {4, 3, 3},
    // {4, 4, 3},
    // {4, 3, 4},
    // {4, 4, 4},

};

void build(ImageData *imageData, Coor3D const &imageSize) {
  _buildPlane(imageData, imageSize, 1);               // bottom plane
  // _buildPlane(imageData, imageSize, imageSize.y - 1); // top plane

  // for (auto const &coor : kBuildVoxelCoors) {
  //   _buildVoxel(imageData, coor);
  // }
}

} // namespace BaseLevelBuilder
