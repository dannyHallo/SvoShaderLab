#pragma once

#include "utils/Coor.hpp"
#include "utils/ImageData.hpp"

#include <memory>

namespace BaseLevelBuilder {
  void build(ImageData *imageData, Coor3D const &imageSize);
};