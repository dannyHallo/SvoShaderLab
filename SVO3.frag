// https://www.shadertoy.com/view/3d2XRd

const float root_size = 3.;
const int levels = 5;
const int MAX_ITER = 222;

/*
int voxels[] = int[](1,1,1,1,3,1,0,3,
                        0,2,2,2,0,2,0,0,
                        0,0,0,4,4,0,4,0,
                                                0,0,4,0,0,4,0,4,
                         5,5,5,0,5,0,0,0,
                         0,0,0,0,6,0,0,0,
                         0,7,0,0,7,0,7,0,
                        -1,0,-1,0,0,-1,0,0);
*/

int voxels[] = int[](1, 0, 0, 1, 0, -1, -1, -1, 2, 0, 0, 0, 0, 0, 0, 0, -1, 0,
                     0, 0, 0, 0, 0, -1);

const float[6] scale_lookup = float[6](1., .5, .25, .125, .0625, .03125);

vec2 isect(in vec3 pos, in float size, in vec3 ro, in vec3 rd, out vec3 tmid,
           out vec3 tmax) {
  vec3 mn = pos - 0.5 * size;
  vec3 mx = mn + size;
  vec3 t1 = (mn - ro) / rd;
  vec3 t2 = (mx - ro) / rd;
  vec3 tmin = min(t1, t2);
  tmax = max(t1, t2);
  tmid = (pos - ro) / rd; // tmax;
  return vec2(max(tmin.x, max(tmin.y, tmin.z)),
              min(tmax.x, min(tmax.y, tmax.z)));
}

bool trace(out vec2 t, out vec3 pos, out int iter, out float size, in vec3 ro,
           in vec3 rd) {

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
  vec3 tmid;
  vec3 tmax;
  bool can_push = true;
  float d;
  t = isect(pos, size, ro, rd, tmid, tmax);
  float h = t.y;

  // Initial push, sort of
  // If the minimum is before the middle in this axis, we need to go to the
  // first one (-rd)
  vec3 idx = mix(-sign(rd), sign(rd), lessThanEqual(tmid, vec3(t.x)));
  int stackIdx = 0;
  int scale = 1;
  // level 1 size
  size *= 0.5;
  // move to first hitted sub-cell center
  pos += 0.5 * size * idx;

  iter = MAX_ITER;
  while (iter-- > 0) {
    t = isect(pos, size, ro, rd, tmid, tmax);

    float subIdx = dot(idx * .5 + .5, vec3(1., 2., 4.));
    int curIdx = stackIdx * 8 + int(subIdx);

    if (voxels[curIdx] != 0) { // Voxel exists
      if (scale >= levels)     // //hit the smallest voxel;
        return true;

      if (can_push) {
        //-- PUSH --//

        // t.y is this voxel exist dist,h is parent voxel exist dist
        if (t.y < h) {
          stack[stack_ptr++] = ST(pos, scale, idx, stackIdx, h);
        }

        h = t.y;
        scale++;
        size *= 0.5;
        idx = mix(-sign(rd), sign(rd), step(tmid, vec3(t.x)));

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
    idx = mix(idx, sign(rd), equal(tmax, vec3(t.y)));

    // if old = idx → stay,else → move forward in this stack
    pos += mix(vec3(0.), sign(rd), notEqual(old, idx)) * size;

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

  vec2 uv = fragCoord / iResolution.xy;
  uv *= 2.0;
  uv -= 1.0;
  uv.x *= iResolution.x / iResolution.y;

  float r = 12.0 * iMouse.x / iResolution.x;

  vec3 ro = vec3(8.0 * sin(0.5 * r), 1.5 - iMouse.y / iResolution.y,
                 8. * cos(0.5 * r));
  vec3 lookAt = vec3(0.0);
  vec3 cameraDir = normalize(lookAt - ro);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 left = normalize(cross(cameraDir, up)); // Might be right
  vec3 rd = cameraDir;
  float FOV = 0.4; // Not actual FOV, just a multiplier
  rd += FOV * up * uv.y;
  rd += FOV * left * uv.x;
  // `rd` is now a point on the film plane, so turn it back to a direction
  rd = normalize(rd);

  vec2 t;
  vec3 pos;
  float size;
  int iter;
  bool hit = trace( t, pos, iter, size, ro, rd);
  vec3 col = hit ? vec3((t.x - 6.) * .5, 0., 0.) : vec3(.0, 0., 0.);

  // fragColor = vec4(vec3(float(iter)/float(MAX_ITER)),1.);
  fragColor = vec4(col, 1.0);
}