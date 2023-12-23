#pragma once

#include "octree/BaseLevelBuilder.hpp"
#include "octree/UpperLevelBuilder.hpp"

#include "utils/ImageData.hpp"

#include <memory>
#include <vector>

class Application
{
public:
  Application();
  ~Application();
  void run();

private:
  std::vector<uint32_t> _buffer;
  std::vector<std::unique_ptr<ImageData>> _imageDatas;

  void _buildImageDatas();
  void _printImageDatas();
  void _createBuffer();
  void _printBuffer();
};