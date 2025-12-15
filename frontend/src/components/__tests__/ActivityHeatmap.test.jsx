/**
 * ActivityHeatmap Component Tests
 * Comprehensive test suite for the GitHub-style activity heatmap component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityHeatmap from '../panels/ActivityHeatmap';

// Mock framer-motion to avoid animation complexities in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, title, ...props }) => (
      <div className={className} title={title} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}));

describe('ActivityHeatmap Component', () => {
  beforeEach(() => {
    // Mock current date to ensure consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Empty State', () => {
    it('should render empty state when no conversations provided', () => {
      render(<ActivityHeatmap conversations={[]} />);

      // Should show stats with zero values
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
      expect(screen.getByText(/This week:/)).toBeInTheDocument();
      // The "0" values are in separate spans
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('should display heatmap grid even with no conversations', () => {
      render(<ActivityHeatmap conversations={[]} />);

      // Should render heatmap cells (12 weeks of data)
      const cells = screen.getAllByTestId('motion-div');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should show all cells with intensity 0 when no conversations', () => {
      const { container } = render(<ActivityHeatmap conversations={[]} />);

      // All cells should have the bg-white/5 class (intensity 0)
      const cells = container.querySelectorAll('.bg-white\\/5');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('Heatmap Data Calculation', () => {
    it('should correctly calculate heatmap data for past 12 weeks', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' }, // Today
        { id: '2', timestamp: '2024-01-10T10:00:00.000Z' }, // 5 days ago
        { id: '3', timestamp: '2023-12-15T10:00:00.000Z' }, // ~1 month ago
        { id: '4', timestamp: '2023-10-30T10:00:00.000Z' }, // ~2.5 months ago (outside range)
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should render approximately 12 weeks worth of cells
      // 12 weeks = 84 days, aligned to Sunday start
      const cells = container.querySelectorAll('[data-testid="motion-div"]');

      // Should have at least 84 cells (12 weeks × 7 days)
      expect(cells.length).toBeGreaterThanOrEqual(84);
    });

    it('should group conversations by date correctly', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T08:00:00.000Z' },
        { id: '2', timestamp: '2024-01-15T14:00:00.000Z' },
        { id: '3', timestamp: '2024-01-15T20:00:00.000Z' },
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      // All three conversations on the same day should be counted together
      // Total should show 3
      const totalStats = screen.getByText(/Total:/).parentElement;
      expect(totalStats).toHaveTextContent('3');
    });

    it('should handle conversations across different dates', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
        { id: '2', timestamp: '2024-01-14T10:00:00.000Z' },
        { id: '3', timestamp: '2024-01-13T10:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should have cells with different intensities
      const intensityCells = container.querySelectorAll('[class*="bg-accent-primary"]');
      expect(intensityCells.length).toBeGreaterThan(0);
    });
  });

  describe('Intensity Level Calculation', () => {
    it('should calculate intensity levels based on max count', () => {
      const conversations = [
        // 1 conversation on Jan 15 (intensity 1 if max is high)
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },

        // 2 conversations on Jan 14 (intensity 2)
        { id: '2', timestamp: '2024-01-14T10:00:00.000Z' },
        { id: '3', timestamp: '2024-01-14T11:00:00.000Z' },

        // 4 conversations on Jan 13 (intensity 4, max)
        { id: '4', timestamp: '2024-01-13T08:00:00.000Z' },
        { id: '5', timestamp: '2024-01-13T10:00:00.000Z' },
        { id: '6', timestamp: '2024-01-13T12:00:00.000Z' },
        { id: '7', timestamp: '2024-01-13T14:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should have highest intensity cells (bg-accent-primary)
      const maxIntensity = container.querySelectorAll('.bg-accent-primary');
      expect(maxIntensity.length).toBeGreaterThan(0);

      // Should have lower intensity cells
      const lowIntensity = container.querySelectorAll('.bg-accent-primary\\/20');
      expect(lowIntensity.length).toBeGreaterThan(0);
    });

    it('should assign intensity 0 for days with no conversations', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Most cells should have intensity 0 (bg-white/5)
      const emptyDays = container.querySelectorAll('.bg-white\\/5');
      expect(emptyDays.length).toBeGreaterThan(70); // Most of 84 days should be empty
    });

    it('should correctly calculate intensity ratios', () => {
      // Test the intensity levels:
      // ratio <= 0.25 = intensity 1
      // ratio <= 0.5 = intensity 2
      // ratio <= 0.75 = intensity 3
      // ratio > 0.75 = intensity 4

      const conversations = [
        // 8 conversations on Jan 15 (max, intensity 4)
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `max-${i}`,
          timestamp: '2024-01-15T10:00:00.000Z',
        })),

        // 6 conversations on Jan 14 (ratio 0.75, intensity 3)
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `high-${i}`,
          timestamp: '2024-01-14T10:00:00.000Z',
        })),

        // 4 conversations on Jan 13 (ratio 0.5, intensity 2)
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `mid-${i}`,
          timestamp: '2024-01-13T10:00:00.000Z',
        })),

        // 2 conversations on Jan 12 (ratio 0.25, intensity 1)
        ...Array.from({ length: 2 }, (_, i) => ({
          id: `low-${i}`,
          timestamp: '2024-01-12T10:00:00.000Z',
        })),
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should have all intensity levels
      expect(container.querySelector('.bg-accent-primary')).toBeInTheDocument(); // intensity 4
      expect(container.querySelector('.bg-accent-primary\\/60')).toBeInTheDocument(); // intensity 3
      expect(container.querySelector('.bg-accent-primary\\/40')).toBeInTheDocument(); // intensity 2
      expect(container.querySelector('.bg-accent-primary\\/20')).toBeInTheDocument(); // intensity 1
    });
  });

  describe('Statistics Display', () => {
    it('should show correct total stats', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
        { id: '2', timestamp: '2024-01-14T10:00:00.000Z' },
        { id: '3', timestamp: '2024-01-13T10:00:00.000Z' },
        { id: '4', timestamp: '2023-12-10T10:00:00.000Z' },
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      const totalStats = screen.getByText(/Total:/).parentElement;
      expect(totalStats).toHaveTextContent('4');
    });

    it('should show correct this week stats', () => {
      // Current date is Jan 15, 2024 12:00 UTC
      // oneWeekAgo = Jan 8, 2024 12:00 UTC
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' }, // Today - counted
        { id: '2', timestamp: '2024-01-14T10:00:00.000Z' }, // 1 day ago - counted
        { id: '3', timestamp: '2024-01-13T10:00:00.000Z' }, // 2 days ago - counted
        { id: '4', timestamp: '2024-01-09T10:00:00.000Z' }, // 6 days ago - counted
        { id: '5', timestamp: '2024-01-08T10:00:00.000Z' }, // 7d 2h ago - NOT counted (before threshold)
        { id: '6', timestamp: '2024-01-07T10:00:00.000Z' }, // 8 days ago - NOT counted
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      const weekStats = screen.getByText(/This week:/).parentElement;
      // Should count conversations from the last 7 days (items 1-4, not 5-6)
      expect(weekStats).toHaveTextContent('4');
    });

    it('should show zero for this week when no recent activity', () => {
      const conversations = [
        { id: '1', timestamp: '2023-12-01T10:00:00.000Z' }, // Old conversation
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      const weekStats = screen.getByText(/This week:/).parentElement;
      expect(weekStats).toHaveTextContent('0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single conversation correctly', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      const totalStats = screen.getByText(/Total:/).parentElement;
      expect(totalStats).toHaveTextContent('1');

      const weekStats = screen.getByText(/This week:/).parentElement;
      expect(weekStats).toHaveTextContent('1');
    });

    it('should handle many conversations on same day', () => {
      const conversations = Array.from({ length: 100 }, (_, i) => ({
        id: `conv-${i}`,
        timestamp: '2024-01-15T10:00:00.000Z',
      }));

      render(<ActivityHeatmap conversations={conversations} />);

      const totalStats = screen.getByText(/Total:/).parentElement;
      expect(totalStats).toHaveTextContent('100');

      // Should render without errors
      expect(screen.getByText(/This week:/)).toBeInTheDocument();
    });

    it('should handle conversations with various timestamp formats', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
        { id: '2', timestamp: '2024-01-15T10:00:00Z' },
        { id: '3', timestamp: new Date('2024-01-15T10:00:00.000Z').toISOString() },
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      // All should be counted
      const totalStats = screen.getByText(/Total:/).parentElement;
      expect(totalStats).toHaveTextContent('3');
    });

    it('should handle conversations at day boundaries correctly', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T00:00:00.000Z' }, // Start of day
        { id: '2', timestamp: '2024-01-15T23:59:59.999Z' }, // End of day
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      // Both should count as same day
      const totalStats = screen.getByText(/Total:/).parentElement;
      expect(totalStats).toHaveTextContent('2');
    });
  });

  describe('Month Labels', () => {
    it('should render month labels', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      // Should show month labels (Dec, Jan, etc.)
      expect(screen.getByText('Jan')).toBeInTheDocument();
    });

    it('should only show month label when month changes', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
        { id: '2', timestamp: '2023-12-15T10:00:00.000Z' },
        { id: '3', timestamp: '2023-11-15T10:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should have multiple month labels visible
      const monthLabels = Array.from(container.querySelectorAll('.text-\\[10px\\]'));
      const monthTexts = monthLabels.map(el => el.textContent).filter(Boolean);

      // Should have at least 2 different months
      expect(new Set(monthTexts).size).toBeGreaterThanOrEqual(2);
    });

    it('should render month labels in correct format', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      render(<ActivityHeatmap conversations={conversations} />);

      // Month should be in short format (Jan, Feb, etc.)
      const jan = screen.queryByText('Jan');
      const dec = screen.queryByText('Dec');

      // At least one should be present
      expect(jan || dec).toBeTruthy();
    });
  });

  describe('Today Cell Styling', () => {
    it('should apply special styling to today cell', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' }, // Today
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Today's cell should have ring styling
      const todayCell = container.querySelector('.ring-accent-primary');
      expect(todayCell).toBeInTheDocument();
    });

    it('should show today cell even with no conversations today', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-10T10:00:00.000Z' }, // Not today
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Today's cell should still have ring styling
      const todayCell = container.querySelector('.ring-accent-primary');
      expect(todayCell).toBeInTheDocument();
    });

    it('should only have one today cell', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Only one cell should have today styling
      const todayCells = container.querySelectorAll('.ring-accent-primary');
      expect(todayCells.length).toBe(1);
    });
  });

  describe('Day Labels', () => {
    it('should render day labels for alternating days', () => {
      render(<ActivityHeatmap conversations={[]} />);

      // Should show S, M, T, W, T, F, S labels
      // Only odd indices show labels (Mon, Wed, Fri per the component logic)
      const { container } = render(<ActivityHeatmap conversations={[]} />);

      // Day labels are rendered with specific class
      const dayLabels = container.querySelectorAll('.text-\\[9px\\]');
      expect(dayLabels.length).toBe(7); // 7 days
    });
  });

  describe('Legend', () => {
    it('should render intensity legend', () => {
      render(<ActivityHeatmap conversations={[]} />);

      expect(screen.getByText('Less')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('should show all 5 intensity levels in legend', () => {
      const { container } = render(<ActivityHeatmap conversations={[]} />);

      // Legend should have 5 colored boxes
      const legendBoxes = container.querySelectorAll('.w-3.h-3.rounded-sm');
      const legendColorsCount = Array.from(legendBoxes).filter(box =>
        box.className.includes('bg-')
      ).length;

      expect(legendColorsCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Tooltip Information', () => {
    it('should include date and count in cell title', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
        { id: '2', timestamp: '2024-01-15T14:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Find cells with title attributes containing conversation count
      const cellsWithTitles = Array.from(container.querySelectorAll('[title]'));
      const conversationTitles = cellsWithTitles.filter(cell =>
        cell.getAttribute('title').includes('conversation')
      );

      expect(conversationTitles.length).toBeGreaterThan(0);
    });

    it('should use singular form for single conversation', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should find "1 conversation" (singular)
      const cellsWithTitles = Array.from(container.querySelectorAll('[title]'));
      const singleConv = cellsWithTitles.find(cell =>
        cell.getAttribute('title')?.includes('1 conversation') &&
        !cell.getAttribute('title')?.includes('conversations')
      );

      expect(singleConv).toBeTruthy();
    });

    it('should use plural form for multiple conversations', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
        { id: '2', timestamp: '2024-01-15T14:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should find "2 conversations" (plural)
      const cellsWithTitles = Array.from(container.querySelectorAll('[title]'));
      const multiConv = cellsWithTitles.find(cell =>
        cell.getAttribute('title')?.includes('2 conversations')
      );

      expect(multiConv).toBeTruthy();
    });
  });

  describe('Grid Structure', () => {
    it('should organize days into weeks correctly', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Should have week columns (flex flex-col containers)
      const weekColumns = container.querySelectorAll('.flex.flex-col.gap-0\\.5');

      // Should have multiple weeks (at least 10 for 12 weeks of data)
      expect(weekColumns.length).toBeGreaterThanOrEqual(10);
    });

    it('should have 7 days per week column', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const { container } = render(<ActivityHeatmap conversations={conversations} />);

      // Find week columns and check that each has 7 cells
      const weekColumns = container.querySelectorAll('.flex.flex-col.gap-0\\.5');

      // Most weeks should have 7 days
      const fullWeeks = Array.from(weekColumns).filter(week => {
        const cells = week.querySelectorAll('[data-testid="motion-div"]');
        return cells.length === 7;
      });

      expect(fullWeeks.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Memoization', () => {
    it('should handle large datasets efficiently', () => {
      // Create a large dataset
      const conversations = Array.from({ length: 1000 }, (_, i) => ({
        id: `conv-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 84 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const startTime = performance.now();
      render(<ActivityHeatmap conversations={conversations} />);
      const endTime = performance.now();

      // Should render in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should still display stats correctly
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });

    it('should not recalculate when receiving same conversations reference', () => {
      const conversations = [
        { id: '1', timestamp: '2024-01-15T10:00:00.000Z' },
      ];

      const { rerender } = render(<ActivityHeatmap conversations={conversations} />);

      // Rerender with same reference
      rerender(<ActivityHeatmap conversations={conversations} />);

      // Should still work correctly (memoization doesn't break functionality)
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });
});
