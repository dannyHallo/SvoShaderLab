// https://www.shadertoy.com/view/3d2XRd

const float root_size = 1.0;
const int levels = 5;
const int MAX_ITER = 222;

int voxel_buffer[] =
    int[](1, 1, 1, 1, 3, 1, 0, 3, 0, 2, 2, 2, 0, 2, 0, 0, 0, 0, 0, 4, 4, 0, 4,
          0, 0, 0, 4, 0, 0, 4, 0, 4, 5, 5, 5, 0, 5, 0, 0, 0, 0, 0, 0, 0, 6, 0,
          0, 0, 0, 7, 0, 0, 7, 0, 7, 0, -1, 0, -1, 0, 0, -1, 0, 0);

// int voxel_buffer[] = int[](1, 0, 0, 1, 0, -1, -1, -1, 2, 0, 0, 0, 0, 0, 0, 0,
// -1, 0,
//                      0, 0, 0, 0, 0, -1);

const float[6] scale_lookup = float[6](1., .5, .25, .125, .0625, .03125);

// returns t0 and t1, also fills tmid and tmax
bool isect(out float tcmin, out float tcmax, out vec3 tmid, out vec3 tmax,
           vec3 pos, float size, vec3 rayPos, vec3 rayDir) {
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

  return tcmin <= tcmax;
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

  int stack_ptr = 0;

  // STEP 1: initialize

  size = root_size;
  vec3 root_pos = vec3(0);
  pos = root_pos;
  vec3 tmid, tmax;
  bool can_push = true;
  bool is_intersect_with_root =
      isect(tcmin, tcmax, tmid, tmax, pos, size, rayPos, rayDir);
  if (!is_intersect_with_root) {
    return false;
  }
  float h = tcmax;

  // initial [PUSH], determine the first hited child (direct child of root node)
  // for x component, if tcmin < tmid.x, idx.x reverts the ray dir in x axis,
  // same for y and z
  vec3 idx = mix(-sign(rayDir), sign(rayDir), step(tmid, vec3(tcmin)));
  int stackIdx = 0;
  int scale = 1;
  size *= 0.5;
  // move to first hitted sub-cell center
  pos += 0.5 * size * idx;

  iter = MAX_ITER;
  while (iter-- > 0) {
    // transform idx from [-1, 1] to [0, 1]
    vec3 idx01 = idx * .5 + .5;
    float subIdx = dot(idx01, vec3(1., 2., 4.));
    int curIdx = stackIdx * 8 + int(subIdx);

    isect(tcmin, tcmax, tmid, tmax, pos, size, rayPos, rayDir);

    // [PUSH] repeatedly, until empty voxel is found
    // when pushed layer reached the same level as the smallest voxel, stop and
    // return (this is temporary solution for finding the leaf)
    if (can_push && voxel_buffer[curIdx] != 0) {
      // hits the smallest voxel
      if (scale >= levels) {
        return true;
      }

      // tcmax is current voxel's exist time, h is parent voxel exist time
      if (tcmax < h) {
        stack[stack_ptr++] = ST(pos, scale, idx, stackIdx, h);
      }

      h = tcmax;
      scale++;
      size *= 0.5;

      // step: for element i of the return value, 0.0 is returned if x[i] <
      // edge[i], and 1.0 is returned otherwise.
      idx = mix(-sign(rayDir), sign(rayDir), step(tmid, vec3(tcmin)));

      stackIdx = voxel_buffer[curIdx];

      pos += 0.5 * size * idx;
      continue;
    }

    // save the previous idx
    vec3 old = idx;

    // this is genius, for the hitted direction, if hit point is in the
    // middle, we advance to the other side, because this uses the direction
    // directly (not increment / bit flipping), if the next bit is outside of
    // the parent voxel, old will be equal to idx
    idx = mix(idx, sign(rayDir), equal(tmax, vec3(tcmax)));

    // idx has not changed -> [POP]
    if (idx == old) {
      // if poped all the way to the root
      // if (stack_ptr == 0 || scale == 0)
      if (stack_ptr == 0)
        return false;

      ST s = stack[--stack_ptr]; // restore to parent Stack
      pos = s.pos;
      scale = s.scale;
      size = root_size * scale_lookup[scale];
      idx = s.idx;
      stackIdx = s.ptr;
      h = s.h;

      // once stack pop out,get rid out pushing in again
      can_push = false;
    }
    // idx has changed -> [ADVANCE]
    else {
      // if old = idx → stay,else → move forward in this stack
      pos += mix(vec3(0.), sign(rayDir), notEqual(old, idx)) * size;
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

  const float kFloatingFreq = 2.0;
  const float kFloatingAmp = 0.15;
  const float kOrbitingDist = 1.2;
  rayPos = vec3(0.0, kFloatingAmp * sin(iTime * kFloatingFreq), kOrbitingDist);

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