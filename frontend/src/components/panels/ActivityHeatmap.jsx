import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * ActivityHeatmap - GitHub-style contribution heatmap for council activity
 * Shows conversation frequency over the past weeks
 */
export default function ActivityHeatmap({ conversations }) {
  // Generate heatmap data for the past 12 weeks (84 days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Create a map of date -> count
    const countByDate = {};
    conversations.forEach((conv) => {
      const date = new Date(conv.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
    });

    // Generate grid for past 12 weeks
    const weeks = [];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83); // 12 weeks = 84 days

    // Align to start of week (Sunday)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    let currentWeek = [];
    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const count = countByDate[dateKey] || 0;
      const isToday = dateKey === today.toISOString().split('T')[0];
      const isFuture = currentDate > today;

      currentWeek.push({
        date: new Date(currentDate),
        dateKey,
        count,
        isToday,
        isFuture,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [conversations]);

  // Find max count for intensity calculation
  const maxCount = useMemo(() => {
    let max = 0;
    heatmapData.forEach((week) => {
      week.forEach((day) => {
        if (day.count > max) max = day.count;
      });
    });
    return Math.max(max, 1);
  }, [heatmapData]);

  // Get intensity level (0-4)
  const getIntensity = (count) => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  // Intensity colors
  const intensityColors = {
    0: 'bg-white/5',
    1: 'bg-accent-primary/20',
    2: 'bg-accent-primary/40',
    3: 'bg-accent-primary/60',
    4: 'bg-accent-primary',
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;

    heatmapData.forEach((week, weekIdx) => {
      const firstDay = week[0];
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            weekIdx,
            label: firstDay.date.toLocaleDateString('en-US', { month: 'short' }),
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [heatmapData]);

  // Calculate total activity
  const totalActivity = conversations.length;
  const thisWeekActivity = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return conversations.filter((c) => new Date(c.timestamp) >= oneWeekAgo).length;
  }, [conversations]);

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="flex items-center gap-6 text-xs">
        <div>
          <span className="text-text-muted">Total: </span>
          <span className="text-text-primary font-medium">{totalActivity}</span>
        </div>
        <div>
          <span className="text-text-muted">This week: </span>
          <span className="text-accent-primary font-medium">{thisWeekActivity}</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-1">
          {/* Month labels */}
          <div className="flex ml-6">
            {monthLabels.map(({ weekIdx, label }, idx) => (
              <span
                key={idx}
                className="text-[10px] text-text-muted"
                style={{
                  marginLeft: idx === 0 ? weekIdx * 14 : (weekIdx - monthLabels[idx - 1].weekIdx) * 14 - 20,
                  width: 40,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Grid with day labels */}
          <div className="flex gap-0.5">
            {/* Day labels column */}
            <div className="flex flex-col gap-0.5 mr-1">
              {dayLabels.map((label, idx) => (
                <span
                  key={idx}
                  className="text-[9px] text-text-muted w-4 h-3 flex items-center justify-end pr-0.5"
                >
                  {idx % 2 === 1 ? label : ''}
                </span>
              ))}
            </div>

            {/* Week columns */}
            {heatmapData.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-0.5">
                {week.map((day, dayIdx) => (
                  <motion.div
                    key={day.dateKey}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: weekIdx * 0.02 + dayIdx * 0.01 }}
                    className={`w-3 h-3 rounded-sm cursor-pointer transition-all
                               ${day.isFuture ? 'bg-transparent' : intensityColors[getIntensity(day.count)]}
                               ${day.isToday ? 'ring-1 ring-accent-primary ring-offset-1 ring-offset-bg-secondary' : ''}
                               hover:ring-1 hover:ring-white/30`}
                    title={`${day.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}: ${day.count} conversation${day.count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-[10px] text-text-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${intensityColors[level]}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
