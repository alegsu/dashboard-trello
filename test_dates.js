function test(daysArray, startFirstDay) {
    let monthOffset = startFirstDay > 20 ? -1 : 0;
    let targetMonth = 6; // July (0-indexed)
    let targetYear = 2026;
    let lastDaySeen = 0;

    for (const dayNum of daysArray) {
        if (lastDaySeen >= 28 && dayNum === 1) {
             monthOffset++;
        }
        lastDaySeen = dayNum;

        let m = targetMonth + monthOffset;
        let y = targetYear;
        while (m < 0) { m += 12; y--; }
        while (m > 11) { m -= 12; y++; }

        console.log(`Day: ${dayNum}, Month: ${m}, Year: ${y}`);
    }
}

test([29, 30, 31, 1, 2, 3, 27, 28, 29, 30, 31, 1, 2, 3, 30, 31, 1, 2, 3], 29);
