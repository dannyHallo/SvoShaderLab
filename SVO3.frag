// https://www.shadertoy.com/view/3d2XRd

const float root_size = 1.0;
const int MAX_ITER    = 100;
const uint kMaxLevels = 6u;

uint voxel_buffer[] =
    uint[](0x00010300u, 0x00032000u, 0x00040200u, 0x00052000u, 0x00060200u, 0x0007FFFFu, 0x000FFFFFu);

const float[6] scale_lookup = float[6](1., .5, .25, .125, .0625, .03125);

// returns t0 and t1, also fills tmid and tmax
bool isect(out float tcmin,
           out float tcmax,
           out vec3 tmid,
           out vec3 tmax,
           vec3 pos,
           float size,
           vec3 rayPos,
           vec3 rayDir) {
  vec3 minCorner = pos - 0.5 * size;
  vec3 maxCorner = pos + 0.5 * size;
  // xyz components of t for the ray to get to the 3 planes of minCorner
  vec3 t1 = (minCorner - rayPos) / rayDir;
  // xyz ...
  vec3 t2   = (maxCorner - rayPos) / rayDir;
  vec3 tmin = min(t1, t2);
  tmax      = max(t1, t2);
  tmid      = (tmin + tmax) * 0.5;

  tcmin = max(tmin.x, max(tmin.y, tmin.z));
  tcmax = min(tmax.x, min(tmax.y, tmax.z));

  return tcmin <= tcmax && tcmax > 0.0;
}

// the best method for counting digit 1s in a 32 bit uint in parallel
// https://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
uint bitCount(uint v) {
  const uint S[] = uint[](1u, 2u, 4u, 8u, 16u); // Magic Binary Numbers
  const uint B[] = uint[](0x55555555u, 0x33333333u, 0x0F0F0F0Fu, 0x00FF00FFu, 0x0000FFFFu);

  uint c = v - ((v >> 1) & B[0]);
  c      = ((c >> S[1]) & B[1]) + (c & B[1]);
  c      = ((c >> S[2]) + c) & B[2];
  c      = ((c >> S[3]) + c) & B[3];
  c      = ((c >> S[4]) + c) & B[4];
  return c;
}

uint countOnesInLastN(uint value, uint n) {
  uint mask         = 0xFFu >> (8u - n);
  uint relevantBits = value & mask;
  return bitCount(relevantBits);
}

void fetch_voxel_buffer(out uint next_byte_offset,
                        out bool has_voxel,
                        out bool is_leaf,
                        uint byte_offset,
                        uint bit_offset) {
  uint voxel_node = voxel_buffer[byte_offset];
  // 16: group offset
  next_byte_offset = voxel_node >> 16;
  // 8: child mask
  uint voxel_child_mask = (voxel_node & 0x0000FF00u) >> 8;
  // 8: leaf mask
  uint voxel_leaf_mask = voxel_node & 0x000000FFu;

  has_voxel = (voxel_child_mask & (1u << bit_offset)) != 0u;
  is_leaf   = (voxel_leaf_mask & (1u << bit_offset)) != 0u;

  if (has_voxel) {
    // bit_offset range: 0-7, so the last n range is 1-8, so we need to +1
    // the first bit '1' indicates a delta of 0, so we need to -1
    next_byte_offset += countOnesInLastN(voxel_child_mask, bit_offset + 1u) - 1u;
  }
}

// returns true if hit, false if miss
vec4 trace(out bool hit,
           out float tcmin,
           out float tcmax,
           out vec3 pos,
           out int iter_used,
           out float size,
           in vec3 rayPos,
           in vec3 rayDir) {
  const vec4 kBlack = vec4(0.0, 0.0, 0.0, 1.0);
  const vec4 kRed   = vec4(1.0, 0.0, 0.0, 1.0);
  const vec4 kGreen = vec4(0.0, 1.0, 0.0, 1.0);
  const vec4 kBlue  = vec4(0.0, 0.0, 1.0, 1.0);
  const vec4 kGray  = vec4(0.5, 0.5, 0.5, 1.0);

  struct ST
  {
    vec3 pos;
    int scale; // size = root_size * exp2(float(-scale)), we used a loopup table
               // to get the size
    vec3 idx;
    uint ptr;
    float h;
  } stack[kMaxLevels];

  int stack_ptr = 0;
  hit           = false;

  // STEP 1: initialize

  size          = root_size;
  vec3 root_pos = vec3(0);
  pos           = root_pos;
  vec3 tmid, tmax;
  bool can_push               = true;
  bool is_intersect_with_root = isect(tcmin, tcmax, tmid, tmax, pos, size, rayPos, rayDir);
  if (!is_intersect_with_root) {
    return kBlack;
  }

  float h = tcmax;

  // initial [PUSH], determine the first hited child (direct child of root node)
  // for x component, if tcmin < tmid.x, idx.x reverts the ray dir in x axis,
  // same for y and z
  vec3 idx = mix(-sign(rayDir), sign(rayDir), step(tmid, vec3(tcmin)));

  uint byte_offset = 0u;
  int scale        = 1;
  size *= 0.5;

  // move to first hitted sub-cell center
  pos += 0.5 * size * idx;

  iter_used = 0;
  while (iter_used++ < MAX_ITER) {
    // transform idx from [-1, 1] to [0, 1]
    vec3 idx01      = idx * .5 + .5;
    uint bit_offset = uint(dot(idx01, vec3(1., 2., 4.))); // 0-7

    uint next_byte_offset;
    bool has_voxel, is_leaf;
    fetch_voxel_buffer(next_byte_offset, has_voxel, is_leaf, byte_offset, bit_offset);

    isect(tcmin, tcmax, tmid, tmax, pos, size, rayPos, rayDir);

    // [PUSH] repeatedly, until empty voxel is found
    // when pushed layer reached the same level as the smallest voxel, stop
    // and return (this is temporary solution for finding the leaf)
    if (can_push && has_voxel) {
      // hits the leaf
      if (is_leaf) {
        hit = true;
        // return vec4(vec3(exp(-tcmin)), 1.0);
        return kGreen;
      }

      // tcmax is current voxel's exist time, h is parent voxel exist time
      if (tcmax < h) {
        stack[stack_ptr++] = ST(pos, scale, idx, byte_offset, h);
      }

      h = tcmax;
      scale++;
      size *= 0.5;

      // step: for element i of the return value, 0.0 is returned if x[i] <
      // edge[i], and 1.0 is returned otherwise.
      idx = mix(-sign(rayDir), sign(rayDir), step(tmid, vec3(tcmin)));

      byte_offset = next_byte_offset;

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
        return kGray;

      ST s        = stack[--stack_ptr]; // restore to parent Stack
      pos         = s.pos;
      scale       = s.scale;
      size        = root_size * scale_lookup[scale];
      idx         = s.idx;
      byte_offset = s.ptr;
      h           = s.h;

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
  return kBlack;
}

vec2 rotate2d(vec2 v, float a) {
  float sinA = sin(a);
  float cosA = cos(a);
  return vec2(v.x * cosA - v.y * sinA, v.y * cosA + v.x * sinA);
}

void rayGen(out vec3 rayPos, out vec3 rayDir, vec2 uv) {
  // [-1, 1] in both axis
  vec2 screenPos = uv * 2.0 - 1.0;

  vec3 cameraDir    = vec3(0.0, 0.0, 1.0);
  vec3 cameraPlaneU = vec3(1.0, 0.0, 0.0);
  vec3 cameraPlaneV = vec3(0.0, 1.0, 0.0) * iResolution.y / iResolution.x;

  rayDir = cameraDir + screenPos.x * cameraPlaneU + screenPos.y * cameraPlaneV;

  const float kFloatingFreq = 2.0;
  const float kFloatingAmp  = 0.15;
  const float kOrbitingDist = 2.2;
  rayPos                    = vec3(0.0, kFloatingAmp * sin(iTime * kFloatingFreq), -kOrbitingDist);

  // rotate camera to orbit the object with time
  const float kMouseSensitivity = 1e-2 * 2.0;
  float mouseVal                = -iMouse.x * kMouseSensitivity;
  rayPos.xz                     = rotate2d(rayPos.xz, mouseVal);
  rayDir.xz                     = rotate2d(rayDir.xz, mouseVal);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // step 1: ray gen
  vec2 uv = fragCoord.xy / iResolution.xy;
  vec3 rayPos, rayDir;
  rayGen(rayPos, rayDir, uv);

  // step 2: ray march
  float tcmin, tcmax;
  bool hit;
  vec3 pos;
  float size;
  int iter_used;
  fragColor = trace(hit, tcmin, tcmax, pos, iter_used, size, rayPos, rayDir);

  // customized shading
  if (hit) {
    // fragColor = vec4(vec3(float(iter_used) / 10.0), 1.0);
    fragColor = vec4(vec3(exp(-tcmin)), 1.0);
  }
}