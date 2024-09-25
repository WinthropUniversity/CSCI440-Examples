import matplotlib.pyplot as plt
from numpy import *

# The parameter equation for finding points in a triangle
def T(a, B, p1, p2, p3):
   return a*B*p1 + B*(1-a)*(p2-p1) + (1-B)*(p3-p1)

# Three corners of the triangle
p1 = matrix([0,1,1]).T
p2 = matrix([1,2,0]).T
p3 = matrix([1,1,1]).T

# Some random parameters
n=1000
a = random.uniform(size=n)
B = random.uniform(size=n)

# Calculate the points inside the triangle from
# those parameters
x = []
y = []
z = []
for idx in range(n):
   p = T(a[idx], B[idx], p1, p2, p3)
   x.append(p[0,0])
   y.append(p[1,0])
   z.append(p[2,0])

# Plot this:
fig = plt.figure()
ax = fig.add_subplot(projection='3d')
ax.scatter(x,y,z, marker='o', s=3)
ax.set_xlabel('X')
ax.set_ylabel('Y')
ax.set_zlabel('Z')

plt.show()

