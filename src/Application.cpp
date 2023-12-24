#include "Application.hpp"

#include "utils/Coor.hpp"

#include <cassert>
#include <iomanip>
#include <iostream>

namespace {

// the best method for counting digit 1s in a 32 bit uint32_t in parallel
// https://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
uint32_t bitCount(uint32_t v) {
  const std::vector<uint32_t> S{1u, 2u, 4u, 8u, 16u}; // Magic Binary Numbers
  const std::vector<uint32_t> B{0x55555555u, 0x33333333u, 0x0F0F0F0Fu, 0x00FF00FFu, 0x0000FFFFu};

  uint32_t c = v - ((v >> 1) & B[0]);
  c          = ((c >> S[1]) & B[1]) + (c & B[1]);
  c          = ((c >> S[2]) + c) & B[2];
  c          = ((c >> S[3]) + c) & B[3];
  c          = ((c >> S[4]) + c) & B[4];
  return c;
}

void _printHexFormat(const std::vector<uint32_t> &vec) {
  for (size_t i = 0; i < vec.size(); ++i) {
    std::cout << "0x" << std::uppercase << std::setfill('0') << std::setw(8) << std::hex << vec[i]
              << "u";

    if (i != vec.size() - 1) {
      std::cout << ", ";
    }

    if ((i + 1) % 8 == 0) {
      std::cout << std::endl;
    }
  }
  std::cout << std::endl;
}

} // namespace

Application::Application() { run(); }

void Application::run() {
  _buildImageDatas();

  std::cout << "\n-------------------\n" << std::endl;

  _printImageDatas();

  std::cout << "\n-------------------\n" << std::endl;

  _createBuffer();

  std::cout << "\n-------------------\n" << std::endl;

  _printBuffer();
}

void Application::_buildImageDatas() {
  Coor3D const kBaseImageSize = {8, 8, 8};
  Coor3D const kRootImageSize = {1, 1, 1};

  // assert all components in the size should be a power of 2
  // https://stackoverflow.com/questions/1053582/how-does-this-bitwise-operation-check-for-a-power-of-2
  assert((kBaseImageSize.x & (kBaseImageSize.x - 1)) == 0);
  assert((kBaseImageSize.y & (kBaseImageSize.y - 1)) == 0);
  assert((kBaseImageSize.z & (kBaseImageSize.z - 1)) == 0);

  // create the base iamge data
  auto imageData = std::make_unique<ImageData>(kBaseImageSize);
  _imageDatas.push_back(std::move(imageData));

  int imIdx = 0;
  BaseLevelBuilder::build(_imageDatas[imIdx].get(), kBaseImageSize);

  while (_imageDatas[imIdx]->getImageSize() != kRootImageSize) {
    std::cout << "imIdx: " << imIdx << std::endl;
    auto newImageData = std::make_unique<ImageData>(_imageDatas[imIdx]->getImageSize() / 2);
    _imageDatas.push_back(std::move(newImageData));
    UpperLevelBuilder::build(_imageDatas[imIdx].get(), _imageDatas[imIdx + 1].get());
    imIdx++;
  }
}

void Application::_printImageDatas() {
  for (auto const &imageData : _imageDatas) {
    std::cout << "imageData->getImageSize(): " << imageData->getImageSize().x << " "
              << imageData->getImageSize().y << " " << imageData->getImageSize().z << std::endl;

    std::cout << "notice that the order is irrelevant" << std::endl;
    for (auto const &[coor, data] : imageData->getImageData()) {
      std::cout << "coor: " << coor.x << " " << coor.y << " " << coor.z << std::endl;
      std::cout << "data: " << std::hex << data << std::endl;
    }
  }
}

void Application::_createBuffer() {
  int imIdx = static_cast<int>(_imageDatas.size()); // start with the root image

  int accum = 1;

  while (--imIdx >= 0) {
    for (auto const &[coor, data] : _imageDatas[imIdx]->getImageData()) {
      std::cout << std::dec << "processing coor: " << coor.x << " " << coor.y << " " << coor.z
                << std::endl;

      // change the data by filling the first 16 bits with the next bit offset
      uint32_t dataToUse = data | (accum << 16);
      std::cout << std::dec << "accum: " << accum << std::endl;

      _buffer.push_back(dataToUse);
      accum += bitCount(data & 0x0000FF00); // accum the bit offset

      std::cout << "dataToUse: " << std::hex << dataToUse << "\n" << std::endl;
    }
  }
}

void Application::_printBuffer() {
  std::cout << "the buffer is: \n" << std::endl;
  _printHexFormat(_buffer);
}
