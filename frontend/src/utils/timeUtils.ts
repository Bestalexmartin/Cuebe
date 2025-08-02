// frontend/src/utils/timeUtils.ts
export const msToDurationString = (ms: number): string => {
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    const totalSeconds = Math.floor(absMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return isNegative ? `-${timeString}` : timeString;
};

export const durationStringToMs = (durationString: string): number => {
    if (!durationString || durationString === '') return 0;
    const isNegative = durationString.trim().startsWith('-');
    const cleanInput = durationString.replace(/[^\d:]/g, '');
    if (cleanInput === '') return 0;
    const parts = cleanInput.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    const ms = (minutes * 60 + seconds) * 1000;
    return isNegative ? -ms : ms;
};

export const msToMMSS = (ms: number): string => {
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    const totalSeconds = Math.round(absMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return isNegative ? `-${timeString}` : timeString;
};

export const mmssToMs = (mmss: string): number => {
    if (!mmss || mmss === '') return 0;
    const isNegative = mmss.trim().startsWith('-');
    const cleanInput = mmss.replace(/[^\d:]/g, '');
    const [minutes, seconds] = cleanInput.split(':').map(Number);
    const ms = (minutes * 60 + seconds) * 1000;
    return isNegative ? -ms : ms;
};
