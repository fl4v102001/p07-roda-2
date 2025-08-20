import { state } from "./state";
import type { RouletteItem } from "./types";

function updateResultDuringSpin() {
  if (!state.isSpinning) return;

  const wheelSVG = document.getElementById('wheelSVG') as SVGSVGElement | null;
  const result = document.getElementById('result');
  if (!wheelSVG || !result) return;

  const transformMatrix = window.getComputedStyle(wheelSVG).transform;
  let currentAngle = 0;
  if (transformMatrix !== 'none') {
    const values = transformMatrix.split('(')[1].split(')')[0].split(',');
    const a = parseFloat(values[0]);
    const b = parseFloat(values[1]);
    currentAngle = Math.atan2(b, a) * (180 / Math.PI);
  }

  const normalizedAngle = (270 - (currentAngle % 360) + 360) % 360;
  const totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
  let currentItem: RouletteItem | null = null;
  let cumulativeAngle = 0;

  if (totalQuantity > 0) {
    for (const item of state.items) {
      const sliceSizeInDegrees = (item.quantity / totalQuantity) * 360;
      cumulativeAngle += sliceSizeInDegrees;
      if (normalizedAngle < cumulativeAngle) {
        currentItem = item;
        break;
      }
    }
  }
  result.innerHTML = `Girando... <strong>${currentItem ? currentItem.name : ''}</strong>`;
  requestAnimationFrame(updateResultDuringSpin);
}

export function createWheel() {
  const svg = document.getElementById('wheelSVG') as SVGSVGElement | null;
  if (!svg) return;

  svg.innerHTML = '';

  const borderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  borderCircle.setAttribute('cx', '275');
  borderCircle.setAttribute('cy', '275');
  borderCircle.setAttribute('r', '271');
  borderCircle.setAttribute('fill', 'none');
  borderCircle.setAttribute('stroke', '#2f3542');
  borderCircle.setAttribute('stroke-width', '8');
  svg.appendChild(borderCircle);

  const totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const spinButton = document.querySelector('.spin-button') as HTMLButtonElement | null;

  if (totalQuantity === 0) {
    if (spinButton) {
      spinButton.disabled = true;
    }
    return;
  }
  if (spinButton) {
    spinButton.disabled = false;
  }

  const cx = 275, cy = 275, r = 267;
  let currentAngle = 0;
  state.items.forEach((item) => {
    const sliceSizeInDegrees = (item.quantity / totalQuantity) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceSizeInDegrees;
    const startRad = (Math.PI / 180) * startAngle;
    const endRad = (Math.PI / 180) * endAngle;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArcFlag = sliceSizeInDegrees > 180 ? 1 : 0;
    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', item.color);
    svg.appendChild(path);

    if (state.showTextOnWheel) {
      const textAngle = startAngle + (sliceSizeInDegrees / 2);
      const textRadius = r * 0.6;
      const textRad = (Math.PI / 180) * textAngle;
      const textX = cx + textRadius * Math.cos(textRad);
      const textY = cy + textRadius * Math.sin(textRad);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(textX));
      text.setAttribute('y', String(textY));
      text.textContent = item.name;
      text.setAttribute('fill', '#FFFFFF');
      text.setAttribute('font-size', '16');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('alignment-baseline', 'middle');
      text.style.textShadow = '1px 1px 2px rgba(0,0,0,0.7)';
      text.setAttribute('transform', `rotate(${textAngle + 0}, ${textX}, ${textY})`);
      svg.appendChild(text);
    }

    currentAngle += sliceSizeInDegrees;
  });

  if (state.showSubdivisionLines) {
    const anglePerUnit = 360 / totalQuantity;
    for (let i = 1; i <= totalQuantity; i++) {
      const lineAngle = i * anglePerUnit;
      const lineRad = (Math.PI / 180) * lineAngle;
      const x2 = cx + r * Math.cos(lineRad);
      const y2 = cy + r * Math.sin(lineRad);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(cx));
      line.setAttribute('y1', String(cy));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      line.setAttribute('stroke', 'rgba(0,0,0,0.10)');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
  }

  // Add central circle
  const centralCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  centralCircle.setAttribute('cx', String(cx));
  centralCircle.setAttribute('cy', String(cy));
  centralCircle.setAttribute('r', String(r * 0.1)); // 10% of main wheel radius
  centralCircle.setAttribute('fill', '#667eea'); // Solid color from gradient start
  centralCircle.setAttribute('stroke', '#2f3542'); // Same as main border
  centralCircle.setAttribute('stroke-width', '8'); // Same as main border
  svg.appendChild(centralCircle);
}

export function spinWheel(getParamsOnly = false, params: any = null) {
  if (state.isSpinning || state.items.length === 0) return;

  const spinButton = document.getElementById('spinButton') as HTMLButtonElement | null;
  const result = document.getElementById('result');
  const wheelSVG = document.getElementById('wheelSVG') as SVGSVGElement | null;
  const animationStyle = document.getElementById('animation-style');

  if (!result || !wheelSVG || !animationStyle) return;

  let initialRotation = 0;
  let finalRotation = 0;

  if (params) {
    // Spectator: use params from server
    initialRotation = params.initialRotation;
    finalRotation = params.finalRotation;
  } else {
    // Configurator: calculate new spin params
    const minSpins = Math.round((3 / 11) * state.spinDuration + (40 / 11));
    const maxSpins = minSpins + 2;
    const spins = Math.random() * (maxSpins - minSpins) + minSpins;
    const finalAngle = Math.random() * 360;

    initialRotation = state.currentRotation;
    const additionalRotation = (spins * 360) + finalAngle;
    finalRotation = initialRotation + additionalRotation;
  }

  if (getParamsOnly) {
    return { initialRotation, finalRotation, duration: state.spinDuration };
  }

  state.isSpinning = true;
  state.currentRotation = finalRotation;

  if (spinButton) {
      spinButton.disabled = true;
      spinButton.textContent = 'GIRANDO...';
  }
  result.textContent = 'Girando...';

  const keyframes = `
    @keyframes spinAnimation {
      from {
        transform: rotate(${initialRotation}deg);
      }
      to {
        transform: rotate(${finalRotation}deg);
      }
    }
  `;
  animationStyle.innerHTML = keyframes;
  wheelSVG.style.animation = `spinAnimation ${state.spinDuration}s cubic-bezier(0,-0.01,.41,1) forwards`;

  requestAnimationFrame(updateResultDuringSpin);

  wheelSVG.addEventListener('animationend', () => {
    const totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity === 0) {
      result.textContent = 'Roda vazia!';
    } else {
      const finalPosition = finalRotation % 360;
      const normalizedAngle = (270 - (finalPosition % 360) + 360) % 360;
      let winner: RouletteItem | null = null;
      let cumulativeAngle = 0;
      for (const item of state.items) {
        const sliceSizeInDegrees = (item.quantity / totalQuantity) * 360;
        cumulativeAngle += sliceSizeInDegrees;
        if (normalizedAngle < cumulativeAngle) {
          winner = item;
          break;
        }
      }
      result.innerHTML = `🎉 Resultado: <strong>${winner ? winner.name : 'Nenhum'}</strong>`;
    }

    if (spinButton) {
        spinButton.disabled = false;
        spinButton.textContent = 'GIRAR NOVAMENTE';
    }
    state.isSpinning = false;

    wheelSVG.style.transform = `rotate(${finalRotation}deg)`;
    wheelSVG.style.animation = '';
    animationStyle.innerHTML = '';
  }, { once: true });

  return; // Explicitly return nothing if not getParamsOnly
}
