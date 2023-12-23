#pragma once

#include "utils/Coor.hpp"

#include <cstdint>
#include <map>

class ImageData {
public:
  ImageData(const Coor3D &imageSize) : _imageSize(imageSize){};
  ~ImageData() = default;

  Coor3D getImageSize() const { return _imageSize; }
  std::map<Coor3D, uint32_t> const &getImageData() const { return _imageData; }

  void imageStore(const Coor3D &coor, uint32_t val);
  uint32_t imageLoad(const Coor3D &coor) const;

private:
  Coor3D _imageSize;
  std::map<Coor3D, uint32_t> _imageData;

  bool _isInBound(const Coor3D &coor) const;
};
