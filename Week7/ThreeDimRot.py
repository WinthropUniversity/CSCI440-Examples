import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

def reset_matrix():
    return np.identity(4)


def get_axes():
    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')   
    ax.set_xlim(-6,6) 
    ax.set_ylim(-6,6) 
    ax.set_zlim(-6,6) 
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.set_zlabel("Z")
    return ax


def rotate_around_x(angle_degrees, M):
    cs = np.cos(angle_degrees*np.pi/180.0)
    sn = np.sin(angle_degrees*np.pi/180.0)

    Rx = np.matrix([[1.0, 0.0,  0.0,  0.0],
                    [0.0,  cs,  -sn,  0.0],
                    [0.0,  sn,   cs,  0.0],
                    [0.0,  0.0,  0.0,  1.0]] )
    return Rx*M


def rotate_around_y(angle_degrees, M):
    cs = np.cos(angle_degrees*np.pi/180.0)
    sn = np.sin(angle_degrees*np.pi/180.0)

    Ry = np.matrix([[cs,  0.0,  sn,  0.0],
                    [0.0, 1.0,  0.0,  0.0],
                    [-sn, 0.0,  cn,  0.0],
                    [0.0, 0.0,  0.0,  1.0]] )
    return Ry*M


def rotate_around_z(angle_degrees, M):
    cs = np.cos(angle_degrees*np.pi/180.0)
    sn = np.sin(angle_degrees*np.pi/180.0)

    Rz = np.matrix([[cs,  -sn,   0.0,  0.0],
                    [sn,   cs,   0.0,  0.0],
                    [0.0,  0.0,  1.0,  0.0],
                    [0.0,  0.0,  0.0,  1.0]] )
    return Rz*M


def quaternion_rotation(angle_degrees, v, M):
    theta = angle_degrees*np.pi/180.0
    c = np.cos(theta/2.0)
    s = np.sin(theta/2.0)
    ssq = s*s
    
    v = v / np.linalg.norm(v)  # Make this a unit vector
    vx, vy, vz = v[0,0], v[1,0], v[2,0]
    R = np.matrix([[1 - 2*ssq*(vy*vy + vz*vz),   2*ssq*vx*vy-2*c*s*vz,      2*ssq*vx*vz + 2*c*s*vy,   0],
                   [2*ssq*vx*vy + 2*c*s*vz,      1 - 2*ssq*(vx*vx+vz*vz),   2*ssq*vy*vz - 2*c*s*vx,   0],
                   [2*ssq*vx*vz - 2*c*s*vy,      2*ssq*vy*vz+2*c*s*vx,      1 - 2*ssq*(vx*vx+vy*vy),  0],
                   [0, 0, 0, 1]])
    
    return R*M


def get_tetrahedron_vertices():
    pts = np.matrix([[0,0,0,1],
                     [1,0,0,1],
                     [0,1,0,1],
                     [1,1,0,1],
                     [0.5,0.5,2,1]]).T

    return pts


def draw_tetrahedron(point_list, ax, col, sty):
  n = point_list.shape[1]

  for idx in range(n):
    for jdx in range(idx+1,n):
        start = np.asarray(point_list.T[idx].ravel())[0]
        end = np.asarray(point_list.T[jdx].ravel())[0]
        ax.plot([start[0], end[0]],
                [start[1], end[1]],
                zs=[start[2], end[2]],
                color=col,
                ls=sty)


              
pts = get_tetrahedron_vertices()
ax = get_axes()

draw_tetrahedron(pts, ax, "r", "--")

# Rotate 45 degrees around vector r:
r = np.matrix([[1,1,1]]).T
M = quaternion_rotation(45, r, reset_matrix())
pts = M*pts

# Rotate 45 degrees around x-axis:
#M = rotate_around_x(45, reset_matrix())
#pts = M*pts

draw_tetrahedron(pts, ax, "b", "-")
plt.show()



