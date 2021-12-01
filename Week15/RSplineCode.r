## R. Paul Wiegand
## Simple example of cubic b-splines in R

# Compute the basis functions for Cubic BSplines
GetSplineBases <- function(u) {
  b0 <- (1-u)^3
  b1 <- 4-6*u^2 + 3*u^3
  b2 <- 1+3*u + 3*u^2 - 3*u^3
  b3 <- u^3
  return ((1/6)*c(b0,b1,b2,b3))
}

# Combine the basis with the control points to get 
# x or y positions (depending on what was sent)
ImputePosition <- function(u, controlPoints) {
  return(sum(GetSplineBases(u) * controlPoints))
}


# Given a set of 4 control points, draw spline segment over those points
# n is the number of times we sample the parameter u.
DrawSplineSegment <- function(xControlPoints, yControlPoints, n=100) {
  xPoints <- NULL
  yPoints <- NULL
  
  # Build the X and Y point vectors by imputing the points given
  # the parametric value u
  for (u in (0:n)/n) {
      xPoints <- c(xPoints, ImputePosition(u,xControlPoints) )
      yPoints <- c(yPoints, ImputePosition(u,yControlPoints) )
  }
  
  lines(xPoints, yPoints, lwd=1.25)
}


# Give as many control points as you like (x and y must have same length)
# and sketch the spline and the control points
SketchSpline <- function(xAllControlPoints, yAllControlPoints, n=100) {
  # Plot the control points as big red dots
  plot(xAllControlPoints, yAllControlPoints, 
       cex=1.5, col="firebrick", pch=19,
       xlab="x", ylab="y")
  
  # For each set of four points, draw the spline segment,
  # then slide 1 point the right and repeat until we cannot
  # form four control points.
  m <- length(xAllControlPoints)
  for (idx in 1:(m-4+1)) {
    xcp <- xAllControlPoints[idx:(idx+3)]
    ycp <- yAllControlPoints[idx:(idx+3)]
    DrawSplineSegment(xcp, ycp, n)
  }
  
  title("Cubic B-Spline Example")
}

