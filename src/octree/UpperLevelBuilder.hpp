#pragma once

#include "utils/Coor.hpp"
#include "utils/ImageData.hpp"

#include <memory>

namespace UpperLevelBuilder {
void build(ImageData const *lowerLevelData, ImageData *thisLevelData);
};