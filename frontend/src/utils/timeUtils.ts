// frontend/src/utils/timeUtils.ts
export const msToDurationString = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const durationStringToMs = (durationString: string): number => {
    if (!durationString || durationString === '') return 0;
    const cleanInput = durationString.replace(/[^\d:]/g, '');
    if (cleanInput === '') return 0;
    const parts = cleanInput.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return (minutes * 60 + seconds) * 1000;
};

export const msToMMSS = (ms: number): string => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const mmssToMs = (mmss: string): number => {
    const [minutes, seconds] = mmss.split(':').map(Number);
    return (minutes * 60 + seconds) * 1000;
};
