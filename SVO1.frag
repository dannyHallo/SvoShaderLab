int voxels[] = int[](1, 0, 0, 1, 0, -1, -1, -1, 2, 0, 0, 0, 0, 0, 0, 0, -1, 0,
                     0, 0, 0, 0, 0, -1);

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

vec4 trace(Ray ray, Hit hit) {
  vec3 center = vec3(0.0f);
  float scale = 1.0f;
  vec3 minBox = center - scale;
  vec3 maxBox = center + scale;
  struct Stack {
    int index;
    vec3 center;
    float scale;
  };
  Stack stack[10];
  int stackPos = 1;
  // not intersected with the root
  if (!BBoxIntersect(minBox, maxBox, ray, hit))
    return vec4(0.1f);
  int index = 0;
  scale *= 0.5f;
  stack[0] = Stack(0, center, scale);
  while (stackPos-- > 0) {
    center = stack[stackPos].center;
    index = stack[stackPos].index;
    scale = stack[stackPos].scale;
    for (int i = 0; i < 8; ++i) {
      vec3 new_center = center + scale * POS[i];
      vec3 minBox = new_center - scale;
      vec3 maxBox = new_center + scale;
      if (!BBoxIntersect(minBox, maxBox, ray, hit))
        continue;
      int v = voxels[(index * 8) + i];
      // v == 0 means this node is empty, we just skip from that
      if (v == 0) {
        continue;
      }
      // v < 0 means this node is filled, no reason to trace further
      else if (v < 0) {
        return vec4(1.0f, 0.0f, 1.0f, 1.0f);
      } else {
        stack[stackPos++] = Stack(v, new_center, scale * 0.5f);
      }
    }
  }
  // intersected with the root, but none of the filled nodes
  return vec4(0.2f);
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
  // [0, 1]  in both axis
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec3 rayPos, rayDir;
  getCamRay(rayPos, rayDir, uv);

  Ray ray;
  Hit hit;
  ray.o = rayPos;
  ray.d = rayDir;
  ray.invDir = 1.0f / rayDir;
  vec4 color = trace(ray, hit);

  fragColor = color;
}