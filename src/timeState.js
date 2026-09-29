import * as THREE from 'three';

export const TICKS_PER_DAY = 24000;
export const TICKS_PER_HOUR = 1000;

export class TimeState {
  constructor() {
    this.daysPassed = 0;      
    this.timeOfDay = 0.25;    
    this.isPlaying = false;
    this.speedMultiplier = 1.0; 

    // Observer State
    this.latitude = 32.77; 
    this.bodyYaw = 0;
    this.holdingSpyglass = false;

    this.noonColor = new THREE.Color(0x5c7ea8); 
    this.nightColor = new THREE.Color(0x0a0c10); 
    this.currentColor = new THREE.Color();
  }

  getTicks() {
    const timeOffsetFromSunrise = (this.timeOfDay - 0.25 + 1.0) % 1.0;
    const dayTicks = Math.floor(timeOffsetFromSunrise * TICKS_PER_DAY);
    return Math.floor(this.daysPassed * TICKS_PER_DAY) + dayTicks;
  }

  setFromTicks(totalTicks) {
    this.daysPassed = Math.floor(totalTicks / TICKS_PER_DAY);
    let dayTick = totalTicks % TICKS_PER_DAY;
    if (dayTick < 0) dayTick += TICKS_PER_DAY; 
    
    this.timeOfDay = ((dayTick / TICKS_PER_DAY) + 0.25) % 1.0;
  }

  getMinecraftCommand() {
    return `/time set ${this.getTicks()}`;
  }

  getSkyColor() {
    const t = this.timeOfDay;
    const oneHour = 1 / 24;

    const sunriseStart = 0.25 - oneHour; 
    const sunriseEnd = 0.25;             
    const sunsetStart = 0.75 - oneHour;  
    const sunsetEnd = 0.75;              

    let factor = 0; 
    if (t >= sunriseEnd && t <= sunsetStart) factor = 1.0;
    else if (t >= sunriseStart && t < sunriseEnd) factor = (t - sunriseStart) / oneHour;
    else if (t > sunsetStart && t <= sunsetEnd) factor = 1.0 - (t - sunsetStart) / oneHour;
    else factor = 0.0;

    return this.currentColor.copy(this.nightColor).lerp(this.noonColor, factor);
  }

  getFormattedTime() {
    const totalHours = this.timeOfDay * 24;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);
    const seconds = Math.floor(((totalHours - hours) * 60 - minutes) * 60);

    const pad = (n) => String(n).padStart(2, '0');
    let phase = 'DIURNAL';
    if (this.timeOfDay >= 0.23 && this.timeOfDay <= 0.27) phase = 'DAWN';
    else if (this.timeOfDay >= 0.48 && this.timeOfDay <= 0.52) phase = 'ZENITH';
    else if (this.timeOfDay >= 0.73 && this.timeOfDay <= 0.77) phase = 'DUSK';
    else if (this.timeOfDay > 0.77 || this.timeOfDay < 0.23) phase = 'NOCTURNAL';

    return `DAY ${this.daysPassed} · ${pad(hours)}:${pad(minutes)}:${pad(seconds)} [${phase}]`;
  }
}