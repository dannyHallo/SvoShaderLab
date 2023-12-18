// uint voxels[6] = uint[6](129526u,197373u,312318u,1791u,329726u,1023u);
uint voxels[] = uint[](131070u, 65278u);

const vec3 PPP = vec3(1, 1, 1);
const vec3 PNP = vec3(1, -1, 1);
const vec3 PNN = vec3(1, -1, -1);
const vec3 NPN = vec3(-1, 1, -1);
const vec3 NNN = vec3(-1, -1, -1);
const vec3 NNP = vec3(-1, -1, 1);
const vec3 NPP = vec3(-1, 1, 1);
const vec3 PPN = vec3(1, 1, -1);

const vec3 POS[8] = vec3[8](PNN, PNP, PPN, PPP, NNN, NNP, NPN, NPP);

struct Ray {
  vec3 o, d, invDir;
};

struct Hit {
  vec3 p;
  float t;    // solution to p=o+t*d
  float tmax; // distance to exit point?
  float tmin; // distance to enter point?
  vec3 n;     // normal
};

bool BBoxIntersect(const vec3 boxMin, const vec3 boxMax, const Ray r,
                   out Hit hit) {
  vec3 tbot = r.invDir * (boxMin - r.o);
  vec3 ttop = r.invDir * (boxMax - r.o);
  vec3 tmin = min(ttop, tbot);
  vec3 tmax = max(ttop, tbot);
  vec2 t = max(tmin.xx, tmin.yz);
  float t0 = max(t.x, t.y);
  t = min(tmax.xx, tmax.yz);
  float t1 = min(t.x, t.y);
  hit.tmin = t0;
  hit.tmax = t1;
  return t1 > max(t0, 0.0);
}

vec4 trace(out Hit hit, Ray ray) {
  vec3 center = vec3(0.0f);
  float scale = 1.0f;
  vec3 minBox = center - scale;
  vec3 maxBox = center + scale;

  struct Stack {
    uint index;
    vec3 center;
    float scale;
  };

  Stack stack[10];
  int stackPos = 1;

  if (!BBoxIntersect(minBox, maxBox, ray, hit)) {
    return vec4(0.0);
  }

  uint index = 0u;
  scale *= 0.5f;
  stack[0] = Stack(0u, center, scale);

  while (stackPos-- > 0) {
    center = stack[stackPos].center;
    index = stack[stackPos].index;
    scale = stack[stackPos].scale;
    uint voxel_node = voxels[index];

    // the first 16 bits are group offset (offset in the array)
    uint voxel_group_offset = voxel_node >> 16;

    // the next 8 bits are child mask (valid mask in the paper)
    // the bit is set if the corresponding child slot contains a voxel
    // - whether it is a leaf or not
    uint voxel_child_mask = (voxel_node & 0x0000FF00u) >> 8u;

    // the last 8 bits are leaf mask
    // the bit is set if the corresponding child is a leaf
    uint voxel_leaf_mask = voxel_node & 0x000000FFu;

    uint accumulated_offset = 0u;

    for (uint i = 0u; i < 8u; ++i) {
      bool empty = (voxel_child_mask & (1u << i)) == 0u;
      bool is_leaf = (voxel_leaf_mask & (1u << i)) != 0u;

      if (empty) {
        continue;
      }

      vec3 new_center = center + scale * POS[i];
      vec3 minBox = new_center - scale;
      vec3 maxBox = new_center + scale;

      if (!BBoxIntersect(minBox, maxBox, ray, hit)) {
        if (!is_leaf) {
          // the accu is only increased when the current one is non-leaf,
          // non-empty because this is the only reason to store other data
          accumulated_offset += 1u;
        }
        continue;
      }

      // not empty, but a leaf, return red
      if (is_leaf) {
        return vec4(1.0f, 0.0f, 0.0f, 1.0f);
      }

      // not empty and not a leaf, reach further
      else {
        stack[stackPos++] = Stack(voxel_group_offset + accumulated_offset,
                                  new_center, scale * 0.5f);
        accumulated_offset += 1u;
      }
    }
  }
  return vec4(0.0);
}

vec2 rotate2d(vec2 v, float a) {
  float sinA = sin(a);
  float cosA = cos(a);
  return vec2(v.x * cosA - v.y * sinA, v.y * cosA + v.x * sinA);
}

void getCamRay(out vec3 rayPos, out vec3 rayDir, vec2 uv) {
  // [-1, 1] in both axis
  vec2 screenPos = uv * 2.0 - 1.0;

  vec3 cameraDir = vec3(0.0, 0.0, 1.0);
  vec3 cameraPlaneU = vec3(1.0, 0.0, 0.0);
  vec3 cameraPlaneV = vec3(0.0, 1.0, 0.0) * iResolution.y / iResolution.x;

  rayDir = cameraDir + screenPos.x * cameraPlaneU + screenPos.y * cameraPlaneV;
  rayPos = vec3(0.0, 0.25 * sin(iTime * 2.7), -4.0);

  // rotate camera to orbit the object with time
  rayPos.xz = rotate2d(rayPos.xz, iTime);
  rayDir.xz = rotate2d(rayDir.xz, iTime);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec3 rayPos, rayDir;
  getCamRay(rayPos, rayDir, uv);

  Ray ray;
  Hit hit;
  ray.o = rayPos;
  ray.d = rayDir;
  ray.invDir = 1.0f / rayDir;
  vec4 color = trace(hit, ray);
  if (length(color) > 0.5f) {
    fragColor = color;
  }
}