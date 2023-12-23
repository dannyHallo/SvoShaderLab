#pragma once

#include "octree/BaseLevelBuilder.hpp"
#include "octree/UpperLevelBuilder.hpp"

#include "utils/ImageData.hpp"

#include <memory>
#include <vector>

class Application {
public:
  Application();
  ~Application();
  void run();

private:
  std::vector<std::unique_ptr<ImageData>> _imageDatas;

  void _buildImageDatas();
  void _debug();
};