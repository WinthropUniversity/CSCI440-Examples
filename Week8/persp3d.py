from numpy import *
import matplotlib.pyplot as plt

def get_tetrahedron_vertices():
    pts = matrix([[0,0,0,1],
                  [1,0,0,1],
                  [0,1,0,1],
                  [1,1,0,1],
                  [0.5,0.5,2,1]]).T

    return pts



def reset_matrix():
    return identity(4)


def translate(tx, ty, tz, M):
    T = matrix([[1, 0, 0, tx],
                [0, 1, 0, ty],
                [0, 0, 1, tz],
                [0, 0, 0, 1]])
    return T*M


def scale(sx, sy, sz, M):
    S = matrix([[sx, 0,  0,  0],
                [0,  sy, 0,  0],
                [0,  0,  sz, 0],
                [0,  0,  0,  1]])
    return S*M


def rotate(angle_degrees, v, M):
    theta = angle_degrees*pi/180.0
    c = cos(theta/2.0)
    s = sin(theta/2.0)
    ssq = s*s
    
    v = v / linalg.norm(v)  # Make this a unit vector
    vx, vy, vz = v[0,0], v[1,0], v[2,0]
    R = matrix([[1 - 2*ssq*(vy*vy + vz*vz),   2*ssq*vx*vy-2*c*s*vz,      2*ssq*vx*vz + 2*c*s*vy,   0],
                [2*ssq*vx*vy + 2*c*s*vz,      1 - 2*ssq*(vx*vx+vz*vz),   2*ssq*vy*vz - 2*c*s*vx,   0],
                [2*ssq*vx*vz - 2*c*s*vy,      2*ssq*vy*vz+2*c*s*vx,      1 - 2*ssq*(vx*vx+vy*vy),  0],
                [0, 0, 0, 1]])
    
    return R*M


def get_camera_framechange_matrix(eye, at, up):
  # Basis of unit vector normal to the viewplane
  n = eye - at
  n = n / linalg.norm(n)

  # One basis unit vector on the viewplane
  up = up / linalg.norm(up)
  u = cross(up, n)
  u = u /linalg.norm(u)

  # The other orthogonal vector on the viewplane
  v = cross(n, u)
  v = v / linalg.norm(v)

  # The new origin point involves shifting the eye 
  p = eye

  # Translate camera to origin
  T = matrix([ [1, 0, 0, -p[0]],
               [0, 1, 0, -p[1]],
               [0, 0, 1, -p[2]],
               [0, 0, 0, 1   ] ])
  
  # Get the frame transform of camera to world
  A = matrix([ [u[0], v[0], n[0], 0],
               [u[1], v[1], n[1], 0],
               [u[2], v[2], n[2], 0],
               [0,    0,    0,    1 ] ]) * T

  # Return the inverse, that is:  the frame tranform of world to camera
  return A.I




def get_persectivematrix(fovy, near, far, width, height):
  aspectRatio = width / height
  fovyRadian = fovy * pi / 180.0
  nr = near
  fr = far
  tp = nr * tan(fovyRadian)
  rgt = tp * aspectRatio

  P = matrix([ [nr/rgt,  0,             0,                     0],
               [0,      nr/tp,          0,                     0],
               [0,      0,              -(fr+nr)/(fr-nr),      (-2*fr*nr)/(fr-nr)],
               [0,      0,              -1,                    0] ] ) 
 
  return P


# Build the tetrahedron in model frame
tetrahedron = get_tetrahedron_vertices()
print("Model space:")
print(tetrahedron)
print()

# Put it into world frame by moving it and rotating it
tetrahedron = rotate(30, matrix([[1,1,1]]).T,  translate(-0.5, -0.2, -5, reset_matrix())) * tetrahedron
print("World space:")
print(tetrahedron)
print()

# Put it into camera frame
eye = array([0.5, 0.5, 0.5])
at =  array([-0.5, -0.2, -0.2])
up =  array([0, 1, 0])
tetrahedron =  get_camera_framechange_matrix(eye, at, up) * tetrahedron
print("Camera space:")
print(tetrahedron)
print()

tetrahedron_na = get_persectivematrix(45, -2, 3, 10, 10) * tetrahedron
print("Uncorrected perspectve:")
print(tetrahedron_na)
print()
