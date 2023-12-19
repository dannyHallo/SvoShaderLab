// https://www.shadertoy.com/view/3d2XRd

const float root_size = 1.0;
const int levels = 5;
const int MAX_ITER = 222;

int voxels[] =
    int[](1, 1, 1, 1, 3, 1, 0, 3, 0, 2, 2, 2, 0, 2, 0, 0, 0, 0, 0, 4, 4, 0, 4,
          0, 0, 0, 4, 0, 0, 4, 0, 4, 5, 5, 5, 0, 5, 0, 0, 0, 0, 0, 0, 0, 6, 0,
          0, 0, 0, 7, 0, 0, 7, 0, 7, 0, -1, 0, -1, 0, 0, -1, 0, 0);

// int voxels[] = int[](1, 0, 0, 1, 0, -1, -1, -1, 2, 0, 0, 0, 0, 0, 0, 0, -1,
// 0,
//                      0, 0, 0, 0, 0, -1);

const float[6] scale_lookup = float[6](1., .5, .25, .125, .0625, .03125);

// returns t0 and t1, also fills tmid and tmax
void isect(out float tcmin, out float tcmax, out vec3 tmid, out vec3 tmax,
           in vec3 pos, in float size, in vec3 rayPos, in vec3 rayDir) {
  vec3 minCorner = pos - 0.5 * size;
  vec3 maxCorner = pos + 0.5 * size;
  // xyz components of t for the ray to get to the 3 planes of minCorner
  vec3 t1 = (minCorner - rayPos) / rayDir;
  // xyz ...
  vec3 t2 = (maxCorner - rayPos) / rayDir;
  vec3 tmin = min(t1, t2);
  tmax = max(t1, t2);
  tmid = (tmin + tmax) * 0.5;

  tcmin = max(tmin.x, max(tmin.y, tmin.z));
  tcmax = min(tmax.x, min(tmax.y, tmax.z));
}

// returns true if hit, false if miss
bool trace(out float tcmin, out float tcmax, out vec3 pos, out int iter,
           out float size, in vec3 rayPos, in vec3 rayDir) {
  struct ST {
    vec3 pos;
    int scale; // size = root_size * exp2(float(-scale));
    vec3 idx;
    int ptr;
    float h;
  } stack[levels];

  int stack_ptr = 0; // Next open index

  //-- INITIALIZE --//

  size = root_size;
  vec3 root_pos = vec3(0);
  pos = root_pos;
  vec3 tmid, tmax;
  bool can_push = true;
  isect(tcmin, tcmax, tmid, tmax, pos, size, rayPos, rayDir);
  float h = tcmax;

  // Initial push, sort of
  // If the minimum is before the middle in this axis, we need to go to the
  // first one (-rayDir)
  vec3 idx = mix(-sign(rayDir), sign(rayDir), lessThanEqual(tmid, vec3(tcmin)));
  int stackIdx = 0;
  int scale = 1;
  size *= 0.5;
  // move to first hitted sub-cell center
  pos += 0.5 * size * idx;

  iter = MAX_ITER;
  while (iter-- > 0) {
    isect(tcmin, tcmax, tmid, tmax, pos, size, rayPos, rayDir);

    float subIdx = dot(idx * .5 + .5, vec3(1., 2., 4.));
    int curIdx = stackIdx * 8 + int(subIdx);

    if (voxels[curIdx] != 0) { // Voxel exists
      if (scale >= levels)     // //hit the smallest voxel;
        return true;

      if (can_push) {
        //-- PUSH --//

        // tcmax is this voxel exist dist,h is parent voxel exist dist
        if (tcmax < h) {
          stack[stack_ptr++] = ST(pos, scale, idx, stackIdx, h);
        }

        h = tcmax;
        scale++;
        size *= 0.5;
        idx = mix(-sign(rayDir), sign(rayDir), step(tmid, vec3(tcmin)));

        stackIdx = voxels[curIdx];

        pos += 0.5 * size * idx;
        continue;
      }
    }

    // when code still running,means (!voxel Exist  || can_push == false)

    //-- ADVANCE --//

    // advance for every direction where we're hitting the middle (tmax = tmid)
    vec3 old = idx;

    // this is genius,for the hitted direction,if hit point is in the middle,we
    // advance to the other side, else if hit point is in the edge,it will leave
    // the stack.and keep all unhitted direction
    idx = mix(idx, sign(rayDir), equal(tmax, vec3(tcmax)));

    // if old = idx → stay,else → move forward in this stack
    pos += mix(vec3(0.), sign(rayDir), notEqual(old, idx)) * size;

    // if idx hasn't changed, we're at the last child in this voxel
    if (idx == old) {
      //-- POP --//

      // exist Whole Octree;
      if (stack_ptr == 0 || scale == 0)
        return false;

      ST s = stack[--stack_ptr]; // Back to parent Stack
      pos = s.pos;
      scale = s.scale;

      // size = root_size * exp2(float(-scale));
      size = root_size * scale_lookup[scale];
      idx = s.idx;
      stackIdx = s.ptr;
      h = s.h;

      // once stack pop out,get rid out pushing in again
      can_push = false;
    }
    // idx != old  move forward in this stack
    else {
      can_push = true;
    }
  }
  return false;
}

vec2 rotate2d(vec2 v, float a) {
  float sinA = sin(a);
  float cosA = cos(a);
  return vec2(v.x * cosA - v.y * sinA, v.y * cosA + v.x * sinA);
}

void rayGen(out vec3 rayPos, out vec3 rayDir, vec2 uv) {
  // [-1, 1] in both axis
  vec2 screenPos = uv * 2.0 - 1.0;

  vec3 cameraDir = vec3(0.0, 0.0, 1.0);
  vec3 cameraPlaneU = vec3(1.0, 0.0, 0.0);
  vec3 cameraPlaneV = vec3(0.0, 1.0, 0.0) * iResolution.y / iResolution.x;

  rayDir = cameraDir + screenPos.x * cameraPlaneU + screenPos.y * cameraPlaneV;
  rayPos = vec3(0.0, 0.25 * sin(iTime * 2.7), -1.2);

  // rotate camera to orbit the object with time
  rayPos.xz = rotate2d(rayPos.xz, iTime);
  rayDir.xz = rotate2d(rayDir.xz, iTime);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // step 1: ray gen
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec3 rayPos, rayDir;
  rayGen(rayPos, rayDir, uv);

  // step 2: ray march
  float tcmin, tcmax;
  vec3 pos;
  float size;
  int iter;
  bool hit = trace(tcmin, tcmax, pos, iter, size, rayPos, rayDir);
  vec3 col = hit ? vec3(1) : vec3(0);
  // vec3 col = hit ? vec3((tcmin - 6.) * .5, 0., 0.) : vec3(.0, 0., 0.);

  // fragColor = vec4(vec3(float(iter)/float(MAX_ITER)),1.);
  fragColor = vec4(col, 1.0);
}