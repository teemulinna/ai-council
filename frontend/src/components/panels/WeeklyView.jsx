import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCost, formatTokens } from '../../utils/helpers';

/**
 * WeeklyView - Groups conversations by week with expandable sections
 */
export default function WeeklyView({ conversations, onReplay, onViewLogs }) {
  const [expandedWeek, setExpandedWeek] = useState(null);

  // Group conversations by week
  const weeklyData = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];

    // Helper to get week start (Sunday)
    const getWeekStart = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Helper to format week range
    const formatWeekRange = (weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();

      if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
      }
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    };

    // Check if week is current week
    const isCurrentWeek = (weekStart) => {
      const now = new Date();
      const currentWeekStart = getWeekStart(now);
      return weekStart.getTime() === currentWeekStart.getTime();
    };

    // Check if week is last week
    const isLastWeek = (weekStart) => {
      const now = new Date();
      const currentWeekStart = getWeekStart(now);
      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return weekStart.getTime() === lastWeekStart.getTime();
    };

    // Group by week
    const weekMap = new Map();
    conversations.forEach((conv) => {
      const weekStart = getWeekStart(new Date(conv.timestamp));
      const weekKey = weekStart.toISOString();

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart,
          weekKey,
          label: formatWeekRange(weekStart),
          isCurrentWeek: isCurrentWeek(weekStart),
          isLastWeek: isLastWeek(weekStart),
          conversations: [],
          totalTokens: 0,
          totalCost: 0,
        });
      }

      const week = weekMap.get(weekKey);
      week.conversations.push(conv);
      week.totalTokens += conv.tokens || 0;
      week.totalCost += conv.cost || 0;
    });

    // Sort by week (newest first) and sort conversations within each week
    return Array.from(weekMap.values())
      .sort((a, b) => b.weekStart - a.weekStart)
      .map((week) => ({
        ...week,
        conversations: week.conversations.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        ),
      }));
  }, [conversations]);

  // Auto-expand current week on first render
  useMemo(() => {
    if (expandedWeek === null && weeklyData.length > 0) {
      const currentWeek = weeklyData.find((w) => w.isCurrentWeek);
      if (currentWeek) {
        setExpandedWeek(currentWeek.weekKey);
      }
    }
  }, [weeklyData, expandedWeek]);

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <span className="text-4xl mb-4 opacity-50">📅</span>
        <h3 className="text-sm font-medium text-text-secondary mb-2">
          No activity yet
        </h3>
        <p className="text-xs text-text-muted">
          Run your council to start building history
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {weeklyData.map((week) => (
        <div
          key={week.weekKey}
          className="bg-bg-tertiary/30 rounded-xl border border-white/5 overflow-hidden"
        >
          {/* Week header - clickable */}
          <button
            onClick={() =>
              setExpandedWeek(expandedWeek === week.weekKey ? null : week.weekKey)
            }
            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {week.isCurrentWeek ? '📍' : week.isLastWeek ? '📆' : '📅'}
              </span>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {week.label}
                  </span>
                  {week.isCurrentWeek && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent-primary/20 text-accent-primary rounded-full">
                      This week
                    </span>
                  )}
                  {week.isLastWeek && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-text-secondary rounded-full">
                      Last week
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                  <span>{week.conversations.length} conversation{week.conversations.length !== 1 ? 's' : ''}</span>
                  <span>{formatTokens(week.totalTokens)}</span>
                  <span>{formatCost(week.totalCost)}</span>
                </div>
              </div>
            </div>

            {/* Expand/collapse indicator */}
            <motion.span
              animate={{ rotate: expandedWeek === week.weekKey ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-text-muted"
            >
              ▼
            </motion.span>
          </button>

          {/* Expanded conversations list */}
          <AnimatePresence>
            {expandedWeek === week.weekKey && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-white/5"
              >
                <div className="divide-y divide-white/5">
                  {week.conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate mb-1">
                            {conv.query}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>
                              {new Date(conv.timestamp).toLocaleDateString('en-US', {
                                weekday: 'short',
                              })}
                            </span>
                            <span>
                              {new Date(conv.timestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                            {conv.tokens && (
                              <>
                                <span className="opacity-50">•</span>
                                <span>{formatTokens(conv.tokens)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {onViewLogs && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewLogs(conv.id);
                              }}
                              className="p-1.5 text-xs text-text-muted hover:text-text-primary
                                         hover:bg-white/10 rounded-lg transition-colors"
                              title="View logs"
                            >
                              📋
                            </button>
                          )}
                          {onReplay && conv.finalAnswer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReplay(conv);
                              }}
                              className="p-1.5 text-xs text-accent-primary hover:text-accent-primary/80
                                         hover:bg-accent-primary/10 rounded-lg transition-colors"
                              title="Replay"
                            >
                              🔄
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Preview of answer */}
                      {conv.finalAnswer?.content && (
                        <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                          {conv.finalAnswer.content.slice(0, 120)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
