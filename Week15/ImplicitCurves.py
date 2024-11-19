import numpy as np
import matplotlib.pyplot as plt

## --- Blending Cubic Polynomials for Different Implicit Curve Techniques ---
def GetInterpolationBases(u):
  b0 = -(9/2)  * (u- (1/3)) * (u - (2/3)) * (u-1)
  b1 =  (27/2) * u * (u - (2/3)) * (u-1)
  b2 = -(27/2) * u * (u - (1/3)) * (u-1)
  b3 =  (9/2)  * u * (u - (1/3)) * (u - (2/3))
  return np.matrix([[b0,b1,b2,b3]])

def GetHermiteBases(u):
  b0 =  2*u**3 - 3*u**2 + 1
  b1 = -2*u**3 + 3*u**2
  b2 =  u**3 - 2*u**2 + u
  b3 =  u**3 - u**2
  return np.matrix([[b0,b1,b2,b3]])

def GetBezierBases(u):
  b0 = (1-u)**3
  b1 = 2*u * (1-u)**3
  b2 = 3*u**2 * (1-u)
  b3 = u**3
  return np.matrix([[b0,b1,b2,b3]])

def GetSplineBases(u):
  b0 = (1-u)**3
  b1 = 4-6*u**2 + 3*u**3
  b2 = 1+3*u + 3*u**2 - 3*u**3
  b3 = u**3
  return (1/6) * np.matrix([[b0,b1,b2,b3]])



# Combine the basis with the control points to get 
# x or y positions (depending on what was sent).  The
# blender parameter is the function to provide the 
# blending cubic polynomial function values for a given
# parameter u value.  
def ImputePosition(blender, controlPoints, resolution=100):
  step=1.0/resolution
  Pu = blender(0) * controlPoints
  for u in np.arange(step, 1.0+step, step):
    Pu = np.vstack([Pu, blender(u) * controlPoints])
  return Pu


def DrawCurve(Pu, controlPoints):
  x = Pu[:,0].reshape(-1).tolist()[0]
  y = Pu[:,1].reshape(-1).tolist()[0]  

  px = controlPoints[:,0].reshape(-1).tolist()[0]
  py = controlPoints[:,1].reshape(-1).tolist()[0]  

  plt.plot(x, y, 'b', linestyle='-')
  plt.scatter(px, py, s=30, marker='o')
  plt.show()


def Example(blender=GetInterpolationBases):
  controlPoints = np.matrix([[1. , 1. ],
                             [2. , 2. ],
                             [3. , 1.5],
                             [4. , 2. ]])
  Pu = ImputePosition(blender, controlPoints)
  DrawCurve(Pu, controlPoints)