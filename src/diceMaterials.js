import * as THREE from 'three';

export function getMaterialForDie(config) {
  const materials = [];
  const type = config.type || 'normal';
  
  let bgColor = '#ffffff';
  let dotColor = '#1a1a1a';
  
  if (type === 'golden') { bgColor = '#D4AF37'; }
  else if (type === 'sevens') { bgColor = '#40E0D0'; }
  else if (type === 'couple') { bgColor = '#ff2c97'; }
  else if (type === 'promotion') { bgColor = '#666A73'; dotColor = '#ffffff'; }
  else if (type === 'weird') { bgColor = '#754581'; dotColor = '#ffffff'; }
  else if (type === 'octahedron') { bgColor = '#002F5E'; dotColor = '#ffffff'; }
  else if (type === 'heavy') { bgColor = '#C42A12'; dotColor = '#ffffff'; }
  
  if (config.color) bgColor = config.color;

  const numFaces = type === 'octahedron' ? 8 : 6;
  
  for (let i = 1; i <= numFaces; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);
    
    if (type !== 'octahedron') {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 10;
      ctx.strokeRect(0,0,256,256);
    }
    
    const drawText = (text) => {
       ctx.fillStyle = dotColor;
       ctx.font = 'bold 120px sans-serif';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText(text, 128, 128);
    };

    const drawDot = (x, y) => {
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
    };
    
    const cx = 128, cy = 128, offset = 60;
    
    let drawValue = i;
    if (type === 'heavy') {
      const mapping = {1: 4, 2: 4, 3: 5, 4: 5, 5: 6, 6: 6};
      drawValue = mapping[i];
    } else if (type === 'sevens') {
      drawValue = i + 1;
    } else if (type === 'octahedron') {
      const mapping = {1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 5, 8: 6};
      drawValue = mapping[i];
    }

    if (type === 'octahedron') {
      drawText(drawValue.toString());
    } else if (type === 'weird') {
      if (i === 1) drawText('+2');
      else if (i === 2 || i === 3) drawText('+1');
      else if (i === 4) drawText('0');
      else if (i === 5) drawText('-1');
      else if (i === 6) drawText('💀');
    } else if (type === 'promotion') {
      const pLevel = config.promotionLevel || 0;
      let actualValue = 1 + pLevel;
      if (actualValue > 6) actualValue = 6;
      
      if ([1,3,5].includes(actualValue)) drawDot(cx, cy);
      if ([2,3,4,5,6].includes(actualValue)) { drawDot(cx - offset, cy - offset); drawDot(cx + offset, cy + offset); }
      if ([4,5,6].includes(actualValue)) { drawDot(cx + offset, cy - offset); drawDot(cx - offset, cy + offset); }
      if (actualValue === 6) { drawDot(cx - offset, cy); drawDot(cx + offset, cy); }
    } else {
      if ([1,3,5,7].includes(drawValue)) drawDot(cx, cy);
      if ([2,3,4,5,6,7].includes(drawValue)) { drawDot(cx - offset, cy - offset); drawDot(cx + offset, cy + offset); }
      if ([4,5,6,7].includes(drawValue)) { drawDot(cx + offset, cy - offset); drawDot(cx - offset, cy + offset); }
      if ([6,7].includes(drawValue)) { drawDot(cx - offset, cy); drawDot(cx + offset, cy); }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    materials.push(new THREE.MeshStandardMaterial({ 
      map: tex, 
      roughness: type === 'golden' ? 0.05 : 0.15, 
      metalness: type === 'golden' ? 0.8 : 0.1 
    }));
  }
  
  if (type !== 'octahedron') {
    return [
      materials[2], // 3
      materials[3], // 4
      materials[0], // 1
      materials[5], // 6
      materials[1], // 2
      materials[4], // 5
    ];
  } else {
    return materials;
  }
}
