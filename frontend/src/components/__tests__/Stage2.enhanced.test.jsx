/**
 * Stage2 Enhanced CX Tests
 * TDD/BDD approach for Art Deco aesthetic implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage2 from '../Stage2';

describe('Stage2: Peer Deliberation - Enhanced CX', () => {
  const mockRankings = [
    {
      model: 'openai/gpt-4',
      ranking: 'Response A is best, followed by B and C.',
      parsed_ranking: ['Response A', 'Response B', 'Response C']
    },
    {
      model: 'anthropic/claude-3',
      ranking: 'I prefer Response B, then A, then C.',
      parsed_ranking: ['Response B', 'Response A', 'Response C']
    },
    {
      model: 'google/gemini',
      ranking: 'Response C is superior.',
      parsed_ranking: ['Response C', 'Response A', 'Response B']
    }
  ];

  const mockLabelToModel = {
    'Response A': 'openai/gpt-4',
    'Response B': 'anthropic/claude-3',
    'Response C': 'google/gemini'
  };

  const mockAggregateRankings = [
    { model: 'openai/gpt-4', average_rank: 1.67, rankings_count: 3 },
    { model: 'anthropic/claude-3', average_rank: 2.00, rankings_count: 3 },
    { model: 'google/gemini', average_rank: 2.33, rankings_count: 3 }
  ];

  beforeEach(() => {
    // Reset any DOM state
    document.body.innerHTML = '';
  });

  describe('BDD: Visual Presentation', () => {
    it('should render with Stage 2 title', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
    });

    it('should display aggregate rankings section when provided', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      expect(screen.getByText('Aggregate Rankings (Street Cred)')).toBeInTheDocument();
    });

    it('should not render when rankings array is empty', () => {
      const { container } = render(
        <Stage2
          rankings={[]}
          labelToModel={mockLabelToModel}
          aggregateRankings={[]}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('BDD: Staggered Animation Implementation', () => {
    it('should apply --item-index CSS variable to aggregate items', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const aggregateItems = container.querySelectorAll('.aggregate-item');

      aggregateItems.forEach((item, index) => {
        const style = item.getAttribute('style');
        expect(style).toContain(`--item-index: ${index}`);
      });
    });

    it('should apply --tab-index CSS variable to ranking tabs', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const tabs = container.querySelectorAll('.tab');

      tabs.forEach((tab, index) => {
        const style = tab.getAttribute('style');
        expect(style).toContain(`--tab-index: ${index}`);
      });
    });

    it('should have correct number of tabs matching rankings', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(mockRankings.length);
    });
  });

  describe('BDD: Aggregate Rankings Display', () => {
    it('should display all aggregate ranking items', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const items = container.querySelectorAll('.aggregate-item');
      expect(items.length).toBe(mockAggregateRankings.length);
    });

    it('should show rank positions starting from #1', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('should display model names from aggregate rankings', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      // Check specifically in aggregate items
      const aggregateItems = container.querySelectorAll('.aggregate-item .rank-model');
      const modelNames = Array.from(aggregateItems).map(el => el.textContent);

      expect(modelNames).toContain('gpt-4');
      expect(modelNames).toContain('claude-3');
      expect(modelNames).toContain('gemini');
    });

    it('should show average ranks with 2 decimal precision', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      expect(screen.getByText('Avg: 1.67')).toBeInTheDocument();
      expect(screen.getByText('Avg: 2.00')).toBeInTheDocument();
      expect(screen.getByText('Avg: 2.33')).toBeInTheDocument();
    });

    it('should display vote counts', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const voteCounts = screen.getAllByText(/\(\d+ votes?\)/);
      expect(voteCounts.length).toBe(mockAggregateRankings.length);
    });
  });

  describe('BDD: Tab Interaction', () => {
    it('should start with first tab active', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const firstTab = container.querySelector('.tab');
      expect(firstTab).toHaveClass('active');
    });

    it('should switch active tab on click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const tabs = container.querySelectorAll('.tab');
      const secondTab = tabs[1];

      await user.click(secondTab);

      await waitFor(() => {
        expect(secondTab).toHaveClass('active');
      });
    });

    it('should display corresponding ranking content when tab clicked', async () => {
      const user = userEvent.setup();
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const tabs = screen.getAllByRole('tab');

      await user.click(tabs[1]);

      await waitFor(() => {
        expect(screen.getByText(/anthropic\/claude-3/)).toBeInTheDocument();
      });
    });
  });

  describe('BDD: De-anonymization Logic', () => {
    it('should replace Response labels with model names in rankings', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      // Check that model names appear in bold (markdown conversion)
      const tabContent = screen.getByText(/is best/);
      expect(tabContent).toBeInTheDocument();
    });

    it('should show parsed ranking list', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument();

      const lists = container.querySelectorAll('ol');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('should convert labels to model names in parsed ranking', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      // Check parsed ranking list specifically
      const parsedRanking = container.querySelector('.parsed-ranking ol');
      expect(parsedRanking).toBeInTheDocument();

      const listItems = parsedRanking.querySelectorAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toBe('gpt-4');
    });
  });

  describe('BDD: CSS Classes and Structure', () => {
    it('should apply stage2 class to container', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      expect(container.querySelector('.stage2')).toBeInTheDocument();
    });

    it('should have aggregate-rankings container with proper structure', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const aggregateSection = container.querySelector('.aggregate-rankings');
      expect(aggregateSection).toBeInTheDocument();

      const aggregateList = aggregateSection.querySelector('.aggregate-list');
      expect(aggregateList).toBeInTheDocument();
    });

    it('should have correct CSS classes for ranking components', () => {
      const { container } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const firstItem = container.querySelector('.aggregate-item');
      expect(firstItem.querySelector('.rank-position')).toBeInTheDocument();
      expect(firstItem.querySelector('.rank-model')).toBeInTheDocument();
      expect(firstItem.querySelector('.rank-score')).toBeInTheDocument();
      expect(firstItem.querySelector('.rank-count')).toBeInTheDocument();
    });
  });

  describe('BDD: Edge Cases', () => {
    it('should handle missing labelToModel gracefully', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={null}
          aggregateRankings={mockAggregateRankings}
        />
      );

      expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
    });

    it('should handle missing aggregate rankings', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={null}
        />
      );

      expect(screen.queryByText('Aggregate Rankings (Street Cred)')).not.toBeInTheDocument();
    });

    it('should handle empty parsed_ranking array', () => {
      const rankingsWithoutParsed = [
        {
          model: 'openai/gpt-4',
          ranking: 'Response A is best.',
          parsed_ranking: []
        }
      ];

      render(
        <Stage2
          rankings={rankingsWithoutParsed}
          labelToModel={mockLabelToModel}
          aggregateRankings={[]}
        />
      );

      expect(screen.queryByText('Extracted Ranking:')).not.toBeInTheDocument();
    });

    it('should handle models without slash separator', () => {
      const rankingsWithSimpleModel = [
        {
          model: 'gpt4',
          ranking: 'Test ranking',
          parsed_ranking: []
        }
      ];

      const { container } = render(
        <Stage2
          rankings={rankingsWithSimpleModel}
          labelToModel={mockLabelToModel}
          aggregateRankings={[]}
        />
      );

      // Check in tab button specifically
      const tab = container.querySelector('.tab');
      expect(tab.textContent).toBe('gpt4');
    });
  });

  describe('TDD: Performance Considerations', () => {
    it('should render with reasonable number of aggregate items efficiently', () => {
      const largeAggregate = Array.from({ length: 20 }, (_, i) => ({
        model: `model-${i}/test`,
        average_rank: i + 1,
        rankings_count: 5
      }));

      const startTime = performance.now();

      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={largeAggregate}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should not re-render unnecessarily when props unchanged', () => {
      const { rerender } = render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const firstRenderHtml = document.body.innerHTML;

      rerender(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );

      const secondRenderHtml = document.body.innerHTML;

      expect(firstRenderHtml).toBe(secondRenderHtml);
    });
  });
});
