#include "Application.hpp"

#include "utils/Coor.hpp"

#include <cassert>
#include <iostream>

Application::Application() {
  std::cout << "Application constructor" << std::endl;
  run();
}

Application::~Application() { std::cout << "Application destructor" << std::endl; }

void Application::run() {
  std::cout << "Application::run()" << std::endl;

  _buildImageDatas();

  _debug();
}

void Application::_buildImageDatas() {
  Coor3D const baseImageSize   = {4, 4, 4};
  Coor3D const targetImageSize = {1, 1, 1};

  // assert all components in the size should be a power of 2
  // https://stackoverflow.com/questions/1053582/how-does-this-bitwise-operation-check-for-a-power-of-2
  assert((baseImageSize.x & (baseImageSize.x - 1)) == 0);
  assert((baseImageSize.y & (baseImageSize.y - 1)) == 0);
  assert((baseImageSize.z & (baseImageSize.z - 1)) == 0);

  // create the base iamge data
  auto imageData = std::make_unique<ImageData>(baseImageSize);
  _imageDatas.push_back(std::move(imageData));

  int imIdx = 0;
  BaseLevelBuilder::build(_imageDatas[imIdx].get(), baseImageSize);

  while (_imageDatas[imIdx]->getImageSize() != targetImageSize) {
    std::cout << "imIdx: " << imIdx << std::endl;
    auto newImageData = std::make_unique<ImageData>(_imageDatas[imIdx]->getImageSize() / 2);
    _imageDatas.push_back(std::move(newImageData));
    UpperLevelBuilder::build(_imageDatas[imIdx].get(), _imageDatas[imIdx + 1].get());
    imIdx++;
  }
}

void Application::_debug() {
  std::cout << "Application::_debug()" << std::endl;
  for (auto const &imageData : _imageDatas) {
    std::cout << "imageData->getImageSize(): " << imageData->getImageSize().x << " "
              << imageData->getImageSize().y << " " << imageData->getImageSize().z << std::endl;
    for (auto const &pair : imageData->getImageData()) {
      std::cout << "pair.first: " << pair.first.x << " " << pair.first.y << " " << pair.first.z
                << std::endl;
      std::cout << "pair.second: " << std::hex << pair.second << std::endl;
    }
  }
}