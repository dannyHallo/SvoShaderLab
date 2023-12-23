#include "UpperLevelBuilder.hpp"

#include <cassert>

namespace UpperLevelBuilder {
namespace {

uint32_t _combine8To1(ImageData const *_lowerLevelData, Coor3D const &coorCur) {
  // at this coorCur, we can obtain the 8 lower level coors
  uint32_t dataWrite = 0;

  for (int x = 0; x < 2; x++) {
    for (int y = 0; y < 2; y++) {
      for (int z = 0; z < 2; z++) {
        Coor3D coorLowerLevel = {coorCur.x * 2 + x, coorCur.y * 2 + y, coorCur.z * 2 + z};
        uint32_t dataRead     = _lowerLevelData->imageLoad(coorLowerLevel);
        if (dataRead & 0x0000FF00) {
          dataWrite |= 0x00000001 << (x * 4 + y * 2 + z + 8);
        }
      }
    }
  }
  return dataWrite;
}

} // namespace

void build(ImageData const *lowerLevelData, ImageData *thisLevelData) {
  Coor3D coorCur{0, 0, 0};

  Coor3D _lowerLevelImageSize = lowerLevelData->getImageSize();

  for (int x = 0; x < _lowerLevelImageSize.x / 2; x++) {
    coorCur.x = x;
    for (int y = 0; y < _lowerLevelImageSize.y / 2; y++) {
      coorCur.y = y;
      for (int z = 0; z < _lowerLevelImageSize.z / 2; z++) {
        coorCur.z = z;

        uint32_t dataWrite = _combine8To1(lowerLevelData, coorCur);
        // if dataWrite is 0, we don't need to store it, because it means all leaf nodes are 0
        if (dataWrite) {
          thisLevelData->imageStore(coorCur, dataWrite);
        }
      }
    }
  }
}

} // namespace UpperLevelBuilder
