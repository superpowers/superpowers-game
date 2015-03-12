SupEngine.ArcadePhysics2D =
  allBodies: []
  gravity: new SupEngine.THREE.Vector3( 0, -0.1, 0 );

  intersects: ( body1, body2 ) ->
    return false if body1.right() < body2.left()
    return false if body1.bottom() > body2.top()
    return false if body1.left() > body2.right()
    return false if body1.top() < body2.bottom()

    return true

  collides: ( body1, bodies ) ->
    body1.touches.top = false
    body1.touches.bottom = false
    body1.touches.right = false
    body1.touches.left = false

    gotCollision = false
    for otherBody in bodies
      continue if otherBody == body1
      if SupEngine.ArcadePhysics2D.intersects( body1, otherBody )
        gotCollision = true

        insideX = body1.position.x - otherBody.position.x
        if insideX >= 0 then insideX -= ( body1.width + otherBody.width ) / 2
        else insideX += ( body1.width + otherBody.width ) / 2

        insideY = body1.position.y - otherBody.position.y
        if insideY >= 0 then insideY -= ( body1.height + otherBody.height ) / 2
        else insideY += ( body1.height + otherBody.height ) / 2

        if Math.abs( insideY ) <= Math.abs( insideX )
          if body1.deltaY() / insideY > 0
            body1.velocity.y = -body1.velocity.y * body1.bounceY
            body1.position.y -= insideY

            if body1.position.y > otherBody.position.y then body1.touches.bottom = true
            else body1.touches.top = true

        else
          if body1.deltaX() / insideX > 0
            body1.velocity.x = -body1.velocity.x * body1.bounceX
            body1.position.x -= insideX

            if body1.position.x > otherBody.position.x then body1.touches.right = true
            else body1.touches.left = true

        body1.actor.setLocalPosition( body1.position )
    return gotCollision

SupEngine.addEarlyUpdatePlugin "ArcadePhysics2D", (player) =>
  body.__inner.earlyUpdate() for body in SupEngine.ArcadePhysics2D.allBodies
  return

SupEngine.addComponentPlugin 'ArcadeBody2D', require './ArcadeBody2D'
