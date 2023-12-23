#pragma once

struct Coor2D {
  int x;
  int y;
};

struct Coor3D {
  int x;
  int y;
  int z;

  bool operator==(const Coor3D &rhs) const { return (x == rhs.x) && (y == rhs.y) && (z == rhs.z); }
  bool operator<(const Coor3D &rhs) const { return (x < rhs.x) || (y < rhs.y) || (z < rhs.z); }

  Coor3D operator/(int s) const { return {x / s, y / s, z / s}; }
  Coor3D operator*(int s) const { return {x * s, y * s, z * s}; }
  Coor3D operator+(const Coor3D &rhs) const { return {x + rhs.x, y + rhs.y, z + rhs.z}; }
  Coor3D operator-(const Coor3D &rhs) const { return {x - rhs.x, y - rhs.y, z - rhs.z}; }
  Coor3D operator%(const Coor3D &rhs) const { return {x % rhs.x, y % rhs.y, z % rhs.z}; }
};