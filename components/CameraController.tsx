
import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export const CameraController: React.FC = () => {
  const { camera, controls } = useThree();
  const moveSpeed = 1.0; // Increased speed
  
  // Track keys
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
          e.preventDefault();
      }
      
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
        case 'z': 
          keys.current.forward = true;
          break;
        case 'arrowdown':
        case 's':
          keys.current.backward = true;
          break;
        case 'arrowleft':
        case 'a':
        case 'q': 
          keys.current.left = true;
          break;
        case 'arrowright':
        case 'd':
          keys.current.right = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
        case 'z':
          keys.current.forward = false;
          break;
        case 'arrowdown':
        case 's':
          keys.current.backward = false;
          break;
        case 'arrowleft':
        case 'a':
        case 'q':
          keys.current.left = false;
          break;
        case 'arrowright':
        case 'd':
          keys.current.right = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    if (!controls) return;
    const orbitControls = controls as unknown as OrbitControlsImpl;
    
    // Get camera direction ignoring Y
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keys.current.forward) moveVector.add(forward);
    if (keys.current.backward) moveVector.sub(forward);
    if (keys.current.left) moveVector.sub(right);
    if (keys.current.right) moveVector.add(right);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed);
      
      camera.position.add(moveVector);
      orbitControls.target.add(moveVector);
      orbitControls.update();
    }
  });

  return null;
};
