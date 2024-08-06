export const formatDate = (timestamp: string | number | bigint): string => {
    let timestampBigInt: bigint;
    if (typeof timestamp === 'bigint') {
        timestampBigInt = timestamp;
    } else {
        timestampBigInt = BigInt(timestamp);
    }

    const milliseconds = Number(timestampBigInt / 1000000n);

    const date = new Date(milliseconds);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString("en-US", options);
};

export const formatCountdown = (endTime: string | number | bigint): string => {
    let endTimeBigInt: bigint;
    if (typeof endTime === 'bigint') {
        endTimeBigInt = endTime;
    } else {
        endTimeBigInt = BigInt(endTime);
    }
    const endTimeMilliseconds = Number(endTimeBigInt / 1000000n);

    // Get the current time in milliseconds
    const now = new Date().getTime();


    let diff = endTimeMilliseconds - now;

    if (diff < 0) {
        return 'Auction ended';
    }

    // Calculate hours, minutes, and seconds
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * 1000 * 60 * 60;
    const minutes = Math.floor(diff / (1000 * 60));
    diff -= minutes * 1000 * 60;
    const seconds = Math.floor(diff / 1000);

    // Format the countdown string
    return `${hours}h${minutes}m${seconds}s`;
};